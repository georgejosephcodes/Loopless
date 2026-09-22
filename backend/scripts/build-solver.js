/**
 * Compiles the C++ TSP solver so the backend runs without Docker.
 * No-op when the binary is already newer than the source.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'solver', 'tsp.cpp');
const out = path.join(__dirname, '..', 'src', 'solver', 'tsp');

const hasBinary = fs.existsSync(out);
if (hasBinary && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) process.exit(0);

console.log('Compiling TSP solver (g++ -O3)...');
const result = spawnSync('g++', ['-O3', '-o', out, src], { stdio: 'inherit' });

if (result.error && result.error.code === 'ENOENT') {
  const hint = 'Install a C++ compiler: `sudo dnf install gcc-c++` (Fedora) or `sudo apt install g++` (Debian/Ubuntu).';
  if (hasBinary) {
    console.warn(`g++ not found; using the existing (possibly outdated) solver binary. ${hint}`);
    process.exit(0);
  }
  console.error(`g++ not found and no compiled solver at src/solver/tsp. ${hint}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
