require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { exec } = require('child_process');
const path = require('path');
const { createClient } = require('redis');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const PORT = process.env.PORT || 5000;

/**
 * 1. CLOUD REDIS CONNECTION
 * We use the REDIS_URL from Upstash to connect to the cloud.
 */
const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.log('❌ Upstash Connection Error:', err));

redisClient.connect().then(() => {
  console.log('🌐 Connected to Upstash Cloud Redis');
}).catch((err) => {
  console.error('CRITICAL: Could not connect to Redis. Check your REDIS_URL.', err);
});

/**
 * 2. THE BOUNCER (RATE LIMITER)
 * Protects your API key from spam and protects your wallet.
 */
const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 Minute window
  max: 10, // Limit each IP to 10 requests per window
  message: { error: "Optimization limit reached. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Coordinate Normalization (4 decimal places = ~11m precision)
const norm = (val) => parseFloat(val).toFixed(4);

/**
 * 3. HYBRID DISTANCE MATRIX LOGIC
 * Checks Redis cache first; only asks Google for missing pairs.
 */
async function getGoogleDistanceMatrix(locations) {
  if (!GOOGLE_MAPS_API_KEY) return null;

  const n = locations.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(null));
  const missingPairs = [];

  // Check the Librarian's Index
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) { matrix[i][j] = 0; continue; }
      
      const key = `dist:${norm(locations[i].lat)},${norm(locations[i].lng)}:${norm(locations[j].lat)},${norm(locations[j].lng)}`;
      const cached = await redisClient.get(key);
      
      if (cached) {
        matrix[i][j] = parseInt(cached);
      } else {
        missingPairs.push({ i, j });
      }
    }
  }

  // Skip Google if we have a 100% cache hit
  if (missingPairs.length === 0) return matrix;

  const coords = locations.map(l => `${l.lat},${l.lng}`).join('|');
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${coords}&destinations=${coords}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const res = await axios.get(url);
    if (res.data.status !== 'OK') throw new Error(res.data.status);

    const rows = res.data.rows;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const val = rows[i].elements[j].status === 'OK' ? rows[i].elements[j].distance.value : 9999999;
        matrix[i][j] = val;

        // Cache the result with a 30-day TTL for compliance
        const key = `dist:${norm(locations[i].lat)},${norm(locations[i].lng)}:${norm(locations[j].lat)},${norm(locations[j].lng)}`;
        await redisClient.setEx(key, 2592000, val.toString());
      }
    }
    return matrix;
  } catch (e) {
    console.error("Google Matrix Fetch Failed:", e.message);
    return null;
  }
}

/**
 * 4. OPTIMIZE ENDPOINT
 */
app.post('/api/optimize', limiter, async (req, res) => {
  const { locations } = req.body;
  if (!locations || locations.length < 2) return res.status(400).send('Minimum 2 locations required.');

  const matrix = await getGoogleDistanceMatrix(locations);
  if (!matrix) return res.status(500).json({ error: 'Failed to retrieve distance data.' });

  const n = locations.length;
  let inputData = `${n} 0\n`;
  matrix.forEach(row => { inputData += row.join(' ') + '\n'; });

  const SOLVER_PATH = path.join(__dirname, 'solver', 'tsp');
  const child = exec(SOLVER_PATH, (error, stdout) => {
    if (error) {
      console.error("C++ Solver Error:", error);
      return res.status(500).json({ error: 'Optimization engine failed.' });
    }
    
    const lines = stdout.trim().split('\n');
    const indices = lines[1].trim().split(' ').map(Number);
    
    res.json({
      path: indices.map(i => ({ ...locations[i], originalIdx: i })),
      distance: (Number(lines[0]) / 1000).toFixed(2),
    });
  });

  child.stdin.write(inputData);
  child.stdin.end();
});

app.listen(PORT, () => console.log(`🚀 Optimizer online on port ${PORT}`));