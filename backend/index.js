const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { exec } = require('child_process');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://loopless.netlify.app' 
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

app.options('*', cors());
app.use(express.json());

async function getRealDistanceMatrix(locations) {
  const coords = locations.map(loc => `${loc.lng},${loc.lat}`).join(';');
  const url = `http://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance`;

  try {
    const response = await axios.get(url, { timeout: 8000 });
    return response.data.distances;
  } catch {
    return null;
  }
}

app.post('/api/optimize', async (req, res) => {
  const { locations } = req.body;
  const n = locations.length;

  const matrix = await getRealDistanceMatrix(locations);
  if (!matrix) return res.status(500).json({ error: 'OSRM Failed' });

  let inputData = `${n} 0\n`;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      inputData += Math.round(matrix[i][j]) + ' ';
    }
    inputData += '\n';
  }

  const child = exec('./solver/tsp_solver', (error, stdout) => {
    if (error) return res.status(500).json({ error: 'Solver failed' });

    const lines = stdout.trim().split('\n');
    const totalMeters = Number(lines[0]);
    const indices = lines[1].trim().split(' ').map(Number);

    res.json({
      path: indices.map(idx => ({ ...locations[idx], originalIdx: idx })),
      distance: (totalMeters / 1000).toFixed(2),
      matrix,
    });
  });

  child.stdin.write(inputData);
  child.stdin.end();
});

app.listen(5000, () => console.log('Backend running on port 5000'));
