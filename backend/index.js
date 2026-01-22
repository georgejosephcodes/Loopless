const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { exec } = require('child_process');
const path = require('path');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://loopless.netlify.app',
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('CORS not allowed'));
    },
  })
);

app.use(express.json());

async function getRealDistanceMatrix(locations) {
  const coords = locations.map(l => `${l.lng},${l.lat}`).join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance`;

  try {
    const res = await axios.get(url, { timeout: 8000 });
    return res.data.distances;
  } catch (e) {
    console.error('OSRM error', e.message);
    return null;
  }
}

app.post('/api/optimize', async (req, res) => {
  const { locations } = req.body;

  if (!Array.isArray(locations) || locations.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 locations' });
  }

  for (const l of locations) {
    if (
      typeof l.lat !== 'number' ||
      typeof l.lng !== 'number' ||
      Number.isNaN(l.lat) ||
      Number.isNaN(l.lng)
    ) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }
  }

  const matrix = await getRealDistanceMatrix(locations);
  if (!matrix) return res.status(500).json({ error: 'OSRM Failed' });

  const n = locations.length;
  let inputData = `${n}\n`;

  const MAX_DIST = 1_000_000;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      inputData += Math.min(Math.round(matrix[i][j]), MAX_DIST) + ' ';
    }
    inputData += '\n';
  }

  const SOLVER_PATH = path.join(__dirname, 'solver', 'tsp_solver');

  const child = exec(SOLVER_PATH, (error, stdout, stderr) => {
    if (error) {
      console.error('Solver stderr:', stderr);
      console.error('Solver error:', error);
      return res.status(500).json({ error: 'Solver failed' });
    }

    const lines = stdout.trim().split('\n');
    if (lines.length < 2) {
      return res.status(500).json({ error: 'Invalid solver output' });
    }

    const totalMeters = Number(lines[0]);
    const indices = lines[1].trim().split(' ').map(Number);

    res.json({
      path: indices.map(i => ({ ...locations[i], originalIdx: i })),
      distance: (totalMeters / 1000).toFixed(2),
      matrix,
    });
  });

  child.stdin.write(inputData);
  child.stdin.end();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);
