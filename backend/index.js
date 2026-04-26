require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { exec } = require('child_process');
const path = require('path');
const { createClient } = require('redis');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { GoogleGenerativeAI } = require('@google/generative-ai');


const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
});

const ORS_API_KEY = process.env.ORS_API_KEY;
const PORT = process.env.PORT || 5000;

/**
 * 1. CLOUD REDIS CONNECTION
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
 * 2. RATE LIMITER
 */
const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Optimization limit reached. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Coordinate normalization
const norm = (val) => parseFloat(val).toFixed(4);

/**
 * 3. HYBRID ORS MATRIX LOGIC
 */
async function getORSMatrix(locations) {
  if (!ORS_API_KEY) return null;

  const n = locations.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(null));
  let allCached = true;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0;
        continue;
      }

      const key = `dist:${norm(locations[i].lat)},${norm(locations[i].lng)}:${norm(locations[j].lat)},${norm(locations[j].lng)}`;
      const cached = await redisClient.get(key);

      if (cached) {
        matrix[i][j] = parseInt(cached);
      } else {
        allCached = false;
      }
    }
  }

  if (allCached) return matrix;

  try {
    const orsLocations = locations.map(loc => [loc.lng, loc.lat]);

    const res = await axios.post(
      'https://api.openrouteservice.org/v2/matrix/driving-car',
      {
        locations: orsLocations,
        metrics: ['distance'],
        units: 'm'
      },
      {
        headers: {
          Authorization: ORS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const distances = res.data.distances;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const val = distances[i][j] !== null ? Math.round(distances[i][j]) : 9999999;
        matrix[i][j] = val;

        if (i !== j) {
          const key = `dist:${norm(locations[i].lat)},${norm(locations[i].lng)}:${norm(locations[j].lat)},${norm(locations[j].lng)}`;
          await redisClient.setEx(key, 2592000, val.toString());
        }
      }
    }

    return matrix;

  } catch (e) {
    console.error("ORS Matrix Fetch Failed:", e.response?.data || e.message);
    return null;
  }
}

/**
 * 4. GET FULL ROAD GEOMETRY
 */
async function getORSRouteGeometry(orderedLocations) {
  try {
    const coordinates = orderedLocations.map(loc => [loc.lng, loc.lat]);

    const res = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      {
        coordinates,
        geometry_simplify: true
      },
      {
        headers: {
          Authorization: ORS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.data.features[0].geometry.coordinates.map(([lng, lat]) => ({
      lat,
      lng
    }));

  } catch (e) {
    console.error("ORS Directions Fetch Failed:", e.response?.data || e.message);
    return [];
  }
}

/**
 * 5. OPTIMIZE ENDPOINT
 */
app.post('/api/optimize', limiter, async (req, res) => {
  const { locations } = req.body;

  if (!locations || locations.length < 2) {
    return res.status(400).send('Minimum 2 locations required.');
  }

  const matrix = await getORSMatrix(locations);

  if (!matrix) {
    return res.status(500).json({ error: 'Failed to retrieve distance data.' });
  }

  const n = locations.length;
  let inputData = `${n} 0\n`;

  matrix.forEach(row => {
    inputData += row.join(' ') + '\n';
  });

  const SOLVER_PATH = path.join(__dirname, 'solver', 'tsp');

  const child = exec(SOLVER_PATH, async (error, stdout) => {
    if (error) {
      console.error("C++ Solver Error:", error);
      return res.status(500).json({ error: 'Optimization engine failed.' });
    }

    const lines = stdout.trim().split('\n');

    if (lines.length < 2) {
      return res.status(500).json({ error: 'Invalid solver output.' });
    }

    const indices = lines[1].trim().split(' ').map(Number);

    const optimizedPath = indices.map(i => ({
      ...locations[i],
      originalIdx: i
    }));

    const orderedLocations = indices.map(i => locations[i]);

    // Return to start
    orderedLocations.push(locations[indices[0]]);

    const routeGeometry = await getORSRouteGeometry(orderedLocations);

    res.json({
      path: optimizedPath,
      distance: (Number(lines[0]) / 1000).toFixed(2),
      matrix,
      routeGeometry,
    });
  });

  child.stdin.write(inputData);
  child.stdin.end();
});
async function getAIAutofillPlaces({ startPlace, lat, lng, radiusKm, maxStops, category }) {
  try {
    // Distance checker (km)
    const cacheKey = `ai:${startPlace}:${norm(lat)},${norm(lng)}:${radiusKm}:${maxStops}:${category}`;

    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }
    const haversineDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;

      return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    const CATEGORY_MAP = {
      Mixed: 'popular places, attractions, food spots, and local highlights',
      Nature: 'parks, lakes, hills, gardens, scenic nature spots, waterfalls',
      Food: 'restaurants, cafes, street food, famous eateries, food markets',
      Tourist: 'major tourist attractions, landmarks, must-visit places',
      Shopping: 'shopping malls, local markets, shopping streets, bazaars',
      'Hidden Gems': 'underrated hidden gems, lesser-known unique local places',
      Historical: 'historical monuments, forts, museums, heritage sites',
      Religious: 'temples, churches, mosques, spiritual places, pilgrimage sites',
      Adventure: 'trekking, hiking, adventure sports, amusement parks, outdoor activities',
      Nightlife: 'bars, pubs, lounges, nightlife hotspots, clubs',
      'Family Friendly': 'family attractions, parks, kid-friendly places, safe entertainment',
      Romantic: 'romantic spots, date places, sunset points, scenic couple destinations',
      Luxury: 'luxury experiences, premium dining, upscale attractions, luxury hotels',
      Budget: 'budget-friendly attractions, affordable places, cheap eats',
      'Photography Spots': 'instagram-worthy scenic places, viewpoints, iconic photo spots',
      'Road Trip': 'best scenic drives, highway stops, nearby road trip destinations',
      'Local Favorites': 'popular local favorites, resident-loved spots',
      Cafes: 'cafes, coffee shops, aesthetic brunch spots',
      Museums: 'museums, galleries, art spaces, cultural centers',
      Beaches: 'beaches, waterfronts, coastal attractions, seaside spots',
    };

    const categoryPrompt =
      CATEGORY_MAP[category] || CATEGORY_MAP.Mixed;

    // Ask Gemini for nearby place names only
    const prompt = `
You are an expert local travel planner.

Starting from: ${startPlace}
Coordinates: ${lat}, ${lng}
Maximum radius: ${radiusKm} km
Category focus: ${categoryPrompt}
Number of places needed: ${maxStops}

Rules:
- Suggest ONLY real existing places
- All places MUST realistically be within ${radiusKm} km
- Prioritize geographic closeness
- Prioritize relevance to category
- No duplicates
- No fake places
- Prefer well-known accurate names for geocoding

Return ONLY valid JSON array:
["Place 1", "Place 2", "Place 3"]

No markdown.
No explanation.
`;
    const geminiResult = await geminiModel.generateContent(prompt);
    const rawText = geminiResult.response
      .text()
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let suggestedPlaces = [];

    try {
      suggestedPlaces = JSON.parse(rawText);
    } catch {
      console.error('Gemini JSON parse failed:', rawText);
      return [];
    }

    const verifiedPlaces = [];
    const usedCoords = new Set();

    for (const placeName of suggestedPlaces) {
      try {
        const geoRes = await axios.get(
          `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
            placeName
          )}&limit=1&apiKey=${GEOAPIFY_API_KEY}`
        );

        const feature = geoRes.data.features?.[0];

        if (!feature) continue;

        const placeLat = feature.properties.lat;
        const placeLng = feature.properties.lon;

        // Radius filter
        const distance = haversineDistance(
          Number(lat),
          Number(lng),
          Number(placeLat),
          Number(placeLng)
        );

        if (distance > radiusKm) continue;

        // Duplicate coordinate filter
        const coordKey = `${Number(placeLat).toFixed(4)},${Number(placeLng).toFixed(4)}`;

        if (usedCoords.has(coordKey)) continue;

        usedCoords.add(coordKey);

        verifiedPlaces.push({
          name: feature.properties.formatted || placeName,
          lat: placeLat,
          lng: placeLng,
        });

        if (verifiedPlaces.length >= maxStops) break;

      } catch (geoErr) {
        console.error(`Geoapify failed for ${placeName}:`, geoErr.message);
      }
    }
    await redisClient.setEx(
      cacheKey,
      604800,
      JSON.stringify(verifiedPlaces)
    );

    return verifiedPlaces;

  } catch (err) {
    console.error('AI Autofill failed:', err.message);
    return [];
  }
}

/**
 * 5. AI AUTOFILL ENDPOINT
 */
app.post('/api/ai-autofill', async (req, res) => {
  const {
    startPlace,
    lat,
    lng,
    radiusKm = 25,
    maxStops = 5,
    category = 'Mixed',
  } = req.body;

  if (!startPlace || lat == null || lng == null) {
    return res.status(400).json({
      error: 'Starting place, latitude, and longitude are required.',
    });
  }

  const places = await getAIAutofillPlaces({
    startPlace,
    lat,
    lng,
    radiusKm,
    maxStops,
    category,
  });

  if (!places.length) {
    return res.status(500).json({
      error: 'Could not generate autofill places.',
    });
  }

  res.json({ places });
});
/**
 * 6. START SERVER
 */
app.listen(PORT, () => {
  console.log(`🚀 Optimizer online on port ${PORT}`);
});