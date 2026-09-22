// HTTP-level benchmark for the Express API. Boots the real app in-process
// against ephemeral mongodb-memory-server/redis-memory-server instances (the
// same harness backend/test/ uses), with the ORS service mocked so no real
// external API calls or quota are involved. Measures:
//
//   1. GET /api/health          -- baseline Express throughput, no I/O
//   2. POST + GET /api/trips    -- authenticated, MongoDB-backed CRUD
//   3. POST /api/optimize       -- latency only (real limiter, 10 req/15min)
//
// Usage: npm run bench:http

const autocannon = require('autocannon');
const testEnv = require('../test/helpers/testEnv');

const DURATION_S = 10;
const CONNECTIONS = 50;

const mockMatrices = () => ({
  distanceMatrix: [
    [0, 10000, 20000],
    [10000, 0, 15000],
    [20000, 15000, 0],
  ],
  durationMatrix: [
    [0, 600, 1200],
    [600, 0, 900],
    [1200, 900, 0],
  ],
  estimatedMatrix: [
    [false, false, false],
    [false, false, false],
    [false, false, false],
  ],
});

function runAutocannon(opts) {
  return new Promise((resolve, reject) => {
    autocannon(opts, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

function printResult(label, result) {
  console.log(`\n### ${label}\n`);
  console.log('| Metric | Value |');
  console.log('|---|---|');
  console.log(`| Requests/sec (avg) | ${result.requests.average.toFixed(1)} |`);
  console.log(`| Latency mean (ms) | ${result.latency.average.toFixed(2)} |`);
  console.log(`| Latency p50 (ms) | ${result.latency.p50.toFixed(2)} |`);
  console.log(`| Latency p95 (ms) | ${result.latency.p97_5.toFixed(2)} |`);
  console.log(`| Latency p99 (ms) | ${result.latency.p99.toFixed(2)} |`);
  console.log(`| 2xx responses | ${result['2xx']} |`);
  console.log(`| Errors / timeouts | ${result.errors} / ${result.timeouts} |`);
}

async function main() {
  console.log('# HTTP benchmark (backend/loadtest/http-bench.js)\n');
  console.log(
    `In-process app, in-memory Mongo/Redis, ORS mocked. ${CONNECTIONS} connections, ${DURATION_S}s per target.\n`
  );

  const { app, redisClient } = await testEnv.start();
  let server;
  const port = await new Promise((resolve) => {
    server = app.listen(0, () => resolve(server.address().port));
  });
  const base = `http://127.0.0.1:${port}`;

  // Required here, not at top-level: config/env.js bakes process.env into
  // exported constants at first require, so anything under src/ must be
  // required only after testEnv.start() has overridden REDIS_URL/MONGODB_URI
  // to the ephemeral instances -- requiring earlier locks in the real
  // Upstash/Atlas values from backend/.env instead (see testEnv.js's own
  // comment on this exact trap).
  const User = require('../src/models/User');
  const tokenService = require('../src/services/token.service');
  const user = await User.create({ name: 'Bench User', email: 'bench@loopless.test', passwordHash: 'x' });
  const token = tokenService.signAccessToken(user._id);
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 1. Baseline: GET /api/health
  const health = await runAutocannon({
    url: `${base}/api/health`,
    connections: CONNECTIONS,
    duration: DURATION_S,
  });
  printResult('GET /api/health (baseline, no auth, no DB)', health);

  // 2. Authenticated DB-backed CRUD: POST then GET /api/trips
  const snapshotBody = JSON.stringify({
    title: 'Bench Trip',
    snapshot: { locations: [{ name: 'A', lat: 10, lng: 76 }] },
  });
  const tripsWrite = await runAutocannon({
    url: `${base}/api/trips`,
    method: 'POST',
    connections: CONNECTIONS,
    duration: DURATION_S,
    headers: { ...authHeaders, 'content-type': 'application/json' },
    body: snapshotBody,
  });
  printResult('POST /api/trips (authenticated, MongoDB write)', tripsWrite);

  const tripsRead = await runAutocannon({
    url: `${base}/api/trips`,
    method: 'GET',
    connections: CONNECTIONS,
    duration: DURATION_S,
    headers: authHeaders,
  });
  printResult('GET /api/trips (authenticated, MongoDB read)', tripsRead);

  // 3. POST /api/optimize -- real rate limiter is active (10 req / 15 min),
  // so this is latency-only over exactly 10 sequential requests, not a
  // throughput run.
  testEnv.setOrsMock({ getORSMatrices: async () => mockMatrices() });
  const locations = [
    { name: 'A', lat: 10, lng: 76 },
    { name: 'B', lat: 10.1, lng: 76.1 },
    { name: 'C', lat: 10.2, lng: 76.2 },
  ];
  const optimizeLatencies = [];
  for (let i = 0; i < 10; i++) {
    const started = process.hrtime.bigint();
    const res = await fetch(`${base}/api/optimize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locations, mode: 'roundtrip' }),
    });
    await res.json();
    optimizeLatencies.push(Number(process.hrtime.bigint() - started) / 1e6);
  }
  console.log('\n### POST /api/optimize (rate-limited to 10 req / 15 min -- latency only)\n');
  console.log('| Request # | Latency (ms) |');
  console.log('|---|---|');
  optimizeLatencies.forEach((ms, i) => console.log(`| ${i + 1} | ${ms.toFixed(2)} |`));

  server.close();
  await testEnv.stop(redisClient);
}

main().catch((err) => {
  console.error('HTTP benchmark failed:', err);
  process.exit(1);
});
