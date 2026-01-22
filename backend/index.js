const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { exec } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

async function getRealDistanceMatrix(locations) {
  const coords = locations.map(l => `${l.lng},${l.lat}`).join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance`;
  try {
    const res = await axios.get(url, { timeout: 8000 });
    return res.data.distances;
  } catch (e) {
    return null;
  }
}

app.post('/api/optimize', async (req, res) => {
  const { locations } = req.body;
  if (!locations || locations.length < 2) return res.status(400).send('Too few locations');

  const matrix = await getRealDistanceMatrix(locations);
  if (!matrix) return res.status(500).json({ error: 'OSRM Failed' });

  const n = locations.length;
  let inputData = `${n} 0\n`; 
  
  const MAX_DIST = 10_000_000; 

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      inputData += Math.min(Math.round(matrix[i][j]), MAX_DIST) + ' ';
    }
    inputData += '\n';
  }

  const SOLVER_PATH = path.join(__dirname, 'solver', 'tsp');
  const child = exec(SOLVER_PATH, (error, stdout) => {
    if (error) return res.status(500).json({ error: 'Solver failed' });

    const lines = stdout.trim().split('\n');
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

app.listen(5000, () => console.log('Backend on 5000'));