// Micro-benchmark for the C++ TSP solver (src/solver/tsp), spawned exactly the
// way controllers/optimize.controller.js does: one subprocess per solve, matrix
// fed over stdin, result read from stdout. Measures pure solver latency/
// throughput by city count, isolated from HTTP/DB/external-API overhead.
//
// Usage: npm run bench:solver   (requires `npm run build:solver` to have run —
// already a prestart/pretest hook, so a normal `npm start`/`npm test` covers it)

const { exec } = require('child_process');
const path = require('path');

const SOLVER_PATH = path.join(__dirname, '..', 'src', 'solver', 'tsp');

// n=16 is the solver's static array cap (dist[16][16] in tsp.cpp). Fewer
// iterations at larger n since each solve is exponentially slower.
const CASES = [
  { n: 4, iterations: 500 },
  { n: 6, iterations: 500 },
  { n: 8, iterations: 300 },
  { n: 10, iterations: 200 },
  { n: 12, iterations: 100 },
  { n: 14, iterations: 50 },
  { n: 16, iterations: 20 },
];

function randomMatrix(n) {
  const dist = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = 1000 + Math.floor(Math.random() * 99000); // 1km - 100km, in metres
      dist[i][j] = d;
      dist[j][i] = d;
    }
  }
  return dist;
}

function solveOnce(n, matrix) {
  return new Promise((resolve, reject) => {
    // mode 0 = round trip, start node 0, no fixed end -- matches the default
    // optimize.controller.js path, the most common real request shape.
    let inputData = `${n} 0 0 -1\n`;
    matrix.forEach((row) => {
      inputData += row.join(' ') + '\n';
    });

    const started = process.hrtime.bigint();
    const child = exec(SOLVER_PATH, (error, stdout) => {
      if (error) return reject(error);
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
      resolve(elapsedMs);
    });
    child.stdin.write(inputData);
    child.stdin.end();
  });
}

function percentile(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function benchCase({ n, iterations }) {
  const matrix = randomMatrix(n);
  const latencies = [];
  for (let i = 0; i < iterations; i++) {
    latencies.push(await solveOnce(n, matrix));
  }
  latencies.sort((a, b) => a - b);
  const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  return {
    n,
    iterations,
    solvesPerSec: 1000 / mean,
    meanMs: mean,
    p50Ms: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
  };
}

async function main() {
  console.log('# Solver micro-benchmark (backend/loadtest/solver-bench.js)\n');
  console.log('One subprocess spawn per solve, matching optimize.controller.js exactly.\n');
  console.log('| Cities (n) | Iterations | Solves/sec | Mean (ms) | p50 (ms) | p95 (ms) |');
  console.log('|---|---|---|---|---|---|');
  for (const c of CASES) {
    const r = await benchCase(c);
    console.log(
      `| ${r.n} | ${r.iterations} | ${r.solvesPerSec.toFixed(1)} | ${r.meanMs.toFixed(2)} | ${r.p50Ms.toFixed(2)} | ${r.p95Ms.toFixed(2)} |`
    );
  }
}

main().catch((err) => {
  console.error('Solver benchmark failed:', err);
  process.exit(1);
});
