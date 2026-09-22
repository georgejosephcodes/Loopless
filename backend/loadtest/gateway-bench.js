// Benchmarks the nginx gateway in front of the 3 backend replicas
// (backend1/backend2/backend3) started by `docker compose up --build` from
// the repo root. Confirms round-robin distribution via the X-Served-By
// response header (set in src/app.js) rather than assuming it from config,
// then reports throughput/latency through the gateway.
//
// Usage: (from repo root) docker compose up --build
//        cd backend && npm run bench:gateway -- --url http://localhost:5000

const autocannon = require('autocannon');

const url = (() => {
  const idx = process.argv.indexOf('--url');
  return idx !== -1 ? process.argv[idx + 1] : 'http://localhost:5000';
})();

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
  console.log(`| 1xx / 2xx / 3xx / 4xx / 5xx | ${result['1xx']} / ${result['2xx']} / ${result['3xx']} / ${result['4xx']} / ${result['5xx']} |`);
  console.log(`| Errors / timeouts | ${result.errors} / ${result.timeouts} |`);
}

// One request up front, outside autocannon, so a misconfigured/down stack
// fails fast with a readable status+body instead of burning a 10s load run
// first and leaving you to guess why 2xx was 0.
async function preflight() {
  let res;
  try {
    res = await fetch(`${url}/api/health`);
  } catch (err) {
    console.error(`Preflight request to ${url}/api/health failed to connect: ${err.message}`);
    console.error('Is `docker compose up --build` running from the repo root?');
    process.exit(1);
  }
  const body = await res.text();
  if (res.status !== 200) {
    console.error(`Preflight request to ${url}/api/health returned HTTP ${res.status}, expected 200.`);
    console.error(`Body: ${body.slice(0, 300)}`);
    console.error('Check: docker compose ps (all 5 containers Up?), docker compose logs gateway, docker compose logs backend1.');
    process.exit(1);
  }
  console.log(`Preflight OK: HTTP 200, X-Served-By: ${res.headers.get('x-served-by') || '(missing)'}\n`);
}

async function checkDistribution(n) {
  const seen = new Map();
  const statuses = new Map();
  for (let i = 0; i < n; i++) {
    const res = await fetch(`${url}/api/health`);
    const servedBy = res.headers.get('x-served-by') || 'unknown';
    seen.set(servedBy, (seen.get(servedBy) || 0) + 1);
    statuses.set(res.status, (statuses.get(res.status) || 0) + 1);
  }
  return { seen, statuses };
}

async function main() {
  console.log(`# Gateway round-robin benchmark (backend/loadtest/gateway-bench.js)\n`);
  console.log(`Target: ${url}/api/health (through nginx gateway, 3 backend replicas)\n`);

  await preflight();

  for (const connections of [10, 100]) {
    const result = await runAutocannon({ url: `${url}/api/health`, connections, duration: 10 });
    printResult(`GET /api/health -- ${connections} connections, 10s`, result);
  }

  console.log('\n### Replica distribution (30 sequential requests, X-Served-By header)\n');
  const { seen, statuses } = await checkDistribution(30);
  console.log('| Replica | Requests served |');
  console.log('|---|---|');
  for (const [replica, count] of [...seen.entries()].sort()) {
    console.log(`| ${replica} | ${count} |`);
  }
  console.log(
    `\n${seen.size} distinct replica(s) served traffic${seen.size >= 3 ? ' -- round robin confirmed across all 3.' : ' -- expected 3, check docker compose ps.'}`
  );
  if (![...statuses.keys()].every((s) => s === 200)) {
    console.log(`\nStatus codes seen: ${[...statuses.entries()].map(([s, c]) => `${s}×${c}`).join(', ')}`);
  }
}

main().catch((err) => {
  console.error('Gateway benchmark failed:', err);
  console.error('Is `docker compose up --build` running? Default target is http://localhost:5000.');
  process.exit(1);
});
