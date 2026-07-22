require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { exec } = require('child_process');
const path = require('path');
const crypto = require('crypto');
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
  model: 'gemini-flash-latest',
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
 * Shared distance helper (km) between two coordinates.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Shared Geoapify geocoding helper. Returns { lat, lng, formatted } or null
 * if the place could not be resolved. Reused by AI Autofill and AI Plan.
 */
async function geocodePlace(placeName) {
  try {
    const geoRes = await axios.get(
      `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
        placeName
      )}&limit=1&apiKey=${GEOAPIFY_API_KEY}`
    );

    const feature = geoRes.data.features?.[0];
    if (!feature) return null;

    return {
      lat: feature.properties.lat,
      lng: feature.properties.lon,
      formatted: feature.properties.formatted || placeName,
    };
  } catch (geoErr) {
    console.error(`Geoapify failed for ${placeName}:`, geoErr.message);
    return null;
  }
}

/**
 * 3. HYBRID ORS MATRIX LOGIC (distance + duration)
 */
async function getORSMatrices(locations) {
  if (!ORS_API_KEY) return { distanceMatrix: null, durationMatrix: null };

  const n = locations.length;
  const distanceMatrix = Array.from({ length: n }, () => Array(n).fill(null));
  const durationMatrix = Array.from({ length: n }, () => Array(n).fill(null));
  let allCached = true;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distanceMatrix[i][j] = 0;
        durationMatrix[i][j] = 0;
        continue;
      }

      const distKey = `dist:${norm(locations[i].lat)},${norm(locations[i].lng)}:${norm(locations[j].lat)},${norm(locations[j].lng)}`;
      const durKey = `dur:${norm(locations[i].lat)},${norm(locations[i].lng)}:${norm(locations[j].lat)},${norm(locations[j].lng)}`;

      const [cachedDist, cachedDur] = await Promise.all([
        redisClient.get(distKey),
        redisClient.get(durKey),
      ]);

      if (cachedDist != null && cachedDur != null) {
        distanceMatrix[i][j] = parseInt(cachedDist);
        durationMatrix[i][j] = parseInt(cachedDur);
      } else {
        allCached = false;
      }
    }
  }

  if (allCached) return { distanceMatrix, durationMatrix };

  try {
    const orsLocations = locations.map(loc => [loc.lng, loc.lat]);

    const res = await axios.post(
      'https://api.openrouteservice.org/v2/matrix/driving-car',
      {
        locations: orsLocations,
        metrics: ['distance', 'duration'],
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
    const durations = res.data.durations;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const distVal = distances?.[i]?.[j] != null ? Math.round(distances[i][j]) : 9999999;
        const durVal = durations?.[i]?.[j] != null ? Math.round(durations[i][j]) : 9999999;

        distanceMatrix[i][j] = distVal;
        durationMatrix[i][j] = durVal;

        if (i !== j) {
          const distKey = `dist:${norm(locations[i].lat)},${norm(locations[i].lng)}:${norm(locations[j].lat)},${norm(locations[j].lng)}`;
          const durKey = `dur:${norm(locations[i].lat)},${norm(locations[i].lng)}:${norm(locations[j].lat)},${norm(locations[j].lng)}`;
          await redisClient.setEx(distKey, 2592000, distVal.toString());
          await redisClient.setEx(durKey, 2592000, durVal.toString());
        }
      }
    }

    return { distanceMatrix, durationMatrix };

  } catch (e) {
    console.error("ORS Matrix Fetch Failed:", e.response?.data || e.message);
    return { distanceMatrix: null, durationMatrix: null };
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

  const { distanceMatrix: matrix, durationMatrix } = await getORSMatrices(locations);

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
      durationMatrix,
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
      const geocoded = await geocodePlace(placeName);
      if (!geocoded) continue;

      const { lat: placeLat, lng: placeLng, formatted } = geocoded;

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
        name: formatted || placeName,
        lat: placeLat,
        lng: placeLng,
      });

      if (verifiedPlaces.length >= maxStops) break;
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
 * 6. AI AUTOFILL ENDPOINT
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
 * 7. NATURAL LANGUAGE TRIP PLANNER
 */
async function getAIPlanPlaces(userPrompt) {
  try {
    const cacheKey = `ai-plan:${crypto
      .createHash('sha1')
      .update(userPrompt.trim().toLowerCase())
      .digest('hex')}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

const prompt = `
You are an expert travel planning assistant.

The user request is:

"${userPrompt}"

Your task is to understand the user's travel request and generate a structured travel plan.

Follow these rules carefully.

--------------------------------------------------
1. Understand the user's intent
--------------------------------------------------

Extract:

- Destination city or town
- Nearby landmark or reference location (if mentioned)
- Trip duration (if mentioned)
- Radius (if mentioned)
- Interests (tourist places, cafes, shopping, nature, temples, etc.)

If the user specifies a radius (for example "within 25 km"), preserve that exact value.

If the user specifies a nearby landmark (airport, railway station, mall, fort, beach, etc.), use that as the reference location.

If the user does NOT specify a radius, choose an appropriate one between 5 and 50 km.

--------------------------------------------------
2. Suggest places
--------------------------------------------------

Suggest ONLY real places.

Every place must:

- exist in real life
- be inside the requested radius
- match the user's interests
- belong to the same destination

Do NOT suggest places from different cities.

Prefer famous places that geocode reliably.

Include city names whenever necessary.

Example:

GOOD
"Mattancherry Palace, Kochi"

BAD
"Mattancherry Palace"

--------------------------------------------------
3. Ordering
--------------------------------------------------

Return places in a logical visiting order.

Nearby places should be grouped together.

Avoid unnecessary travel.

--------------------------------------------------
4. Validation
--------------------------------------------------

If the prompt is meaningless, random text, or you cannot determine a destination, return ONLY:

{
  "error":"INVALID_PROMPT"
}

Do NOT guess.

--------------------------------------------------
5. Output
--------------------------------------------------

Return ONLY valid JSON.

{
  "city":"string",

  "referenceLocation":"string",

  "radiusKm":25,

  "places":[
    {
      "name":"string",
      "reason":"Why this matches the user's request",
      "order":1
    }
  ]
}

No markdown.

No explanation.

No additional text.
`;

    const geminiResult = await geminiModel.generateContent(prompt);
    const rawText = geminiResult.response
      .text()
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let plan;
    try {
      plan = JSON.parse(rawText);
    } catch {
      console.error('Gemini AI Plan JSON parse failed:', rawText);
      return [];
    }

    if (!plan || !Array.isArray(plan.places) || !plan.places.length) {
      return [];
    }

    const radiusKm = Number(plan.radiusKm) > 0 ? Number(plan.radiusKm) : 25;
    const orderedSuggestions = [...plan.places].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );

    // Geocode the city first so we can sanity-check each place falls within radius.
    const center = await geocodePlace(
        plan.referenceLocation || plan.city
    );

    const verifiedPlaces = [];
    const usedCoords = new Set();

    for (const suggestion of orderedSuggestions) {
      if (!suggestion?.name) continue;

      const geocoded = await geocodePlace(suggestion.name);
      if (!geocoded) continue;

      const { lat: placeLat, lng: placeLng, formatted } = geocoded;

      if (center) {
          const distance = haversineDistance(
              Number(center.lat),
              Number(center.lng),
              Number(placeLat),
              Number(placeLng)
          );

          if (distance > radiusKm) continue;
      }

      const coordKey = `${Number(placeLat).toFixed(4)},${Number(placeLng).toFixed(4)}`;
      if (usedCoords.has(coordKey)) continue;
      usedCoords.add(coordKey);

      verifiedPlaces.push({
        name: formatted || suggestion.name,
        lat: placeLat,
        lng: placeLng,
        reason: suggestion.reason || '',
      });

      if (verifiedPlaces.length >= 15) break;
    }

    await redisClient.setEx(cacheKey, 604800, JSON.stringify(verifiedPlaces));

    return verifiedPlaces;
  } catch (err) {
    console.error('AI Plan failed:', err.message);
    return [];
  }
}

/**
 * 8. AI PLAN ENDPOINT (Natural Language Trip Planning)
 */
app.post('/api/ai-plan', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({
      error: 'A trip description is required.',
    });
  }

  const places = await getAIPlanPlaces(prompt);

  if (!places.length) {
    return res.status(500).json({
      error: 'Could not generate a plan for that prompt. Try rephrasing it.',
    });
  }

  res.json({ places });
});

/**
 * 9. SMART ITINERARY ENGINE
 *
 * Kept as small, pure, side-effect-free functions so future features
 * (opening hours, meal breaks, weather-awareness, traffic-aware routing,
 * sunrise/sunset scheduling, AI time optimization, etc.) can hook into the
 * scheduling loop later without touching Express routing or the time math.
 */

// "HH:MM" -> minutes since midnight, or null if invalid
function timeStringToMinutes(str) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(str || '').trim());
  if (!match) return null;

  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;

  return h * 60 + m;
}

// minutes since midnight -> "HH:MM"
function minutesToTimeString(totalMinutes) {
  const clamped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Pure scheduling engine.
 * - Never reorders `optimizedRoute`; it is scheduled exactly as received.
 * - Never estimates travel time; it only reads `durationMatrix` (ORS seconds).
 * - Automatically rolls remaining stops onto the next day whenever a stop
 *   would arrive (or finish) after `endMinutes`.
 *
 * Extension point: additional pre/post-stop hooks (e.g. lunch break
 * insertion, opening-hours checks) can be added inside the loop below
 * without changing its signature or the day-rollover logic.
 */
function scheduleItinerary({ optimizedRoute, durationMatrix, startMinutes, endMinutes, stayMinutes }) {
  const itinerary = [];
  let day = 1;
  let currentTime = startMinutes;

  for (let i = 0; i < optimizedRoute.length; i++) {
    const stop = optimizedRoute[i];
    const prevStop = i > 0 ? optimizedRoute[i - 1] : null;

    let travelMinutes = 0;
    if (prevStop) {
      const seconds = durationMatrix?.[prevStop.originalIdx]?.[stop.originalIdx];
      travelMinutes = seconds != null ? Math.round(seconds / 60) : 0;
    }

    let arrival = currentTime + travelMinutes;

    // Day rollover: this stop can't be completed before Trip End Time.
    if (prevStop && arrival + stayMinutes > endMinutes) {
      day += 1;
      currentTime = startMinutes;
      travelMinutes = 0; // travel across an overnight gap isn't meaningful without hotel/start data
      arrival = currentTime;
    }

    const departure = arrival + stayMinutes;

    itinerary.push({
      day,
      place: stop.name,
      arrival: minutesToTimeString(arrival),
      departure: minutesToTimeString(departure),
      stayMinutes,
      travelMinutes,
    });

    currentTime = departure;
  }

  return itinerary;
}

/**
 * 10. SMART ITINERARY ENDPOINT
 */
app.post('/api/itinerary', (req, res) => {
  const {
    optimizedRoute,
    durationMatrix,
    startTime = '09:00',
    endTime = '18:00',
    stayMinutes = 60,
  } = req.body;

  if (!Array.isArray(optimizedRoute) || optimizedRoute.length === 0) {
    return res.status(400).json({
      error: 'An optimized route with at least one stop is required.',
    });
  }

  if (!Array.isArray(durationMatrix) || !durationMatrix.length) {
    return res.status(400).json({
      error: 'A duration matrix is required. Please re-run Optimize Route first.',
    });
  }

  const startMinutes = timeStringToMinutes(startTime);
  const endMinutes = timeStringToMinutes(endTime);

  if (startMinutes == null || endMinutes == null) {
    return res.status(400).json({
      error: 'Trip start and end time must be in HH:MM format.',
    });
  }

  if (endMinutes <= startMinutes) {
    return res.status(400).json({
      error: 'Trip end time must be after trip start time.',
    });
  }

  const stay = Number(stayMinutes);
  if (!Number.isFinite(stay) || stay < 5 || stay > endMinutes - startMinutes) {
    return res.status(400).json({
      error: 'Stay duration must be a positive number that fits within a single day of your trip window.',
    });
  }

  try {
    const itinerary = scheduleItinerary({
      optimizedRoute,
      durationMatrix,
      startMinutes,
      endMinutes,
      stayMinutes: stay,
    });

    res.json({ itinerary });
  } catch (err) {
    console.error('Itinerary generation failed:', err.message);
    res.status(500).json({ error: 'Could not generate itinerary.' });
  }
});

/**
 * 11. START SERVER
 */
app.listen(PORT, () => {
  console.log(`🚀 Optimizer online on port ${PORT}`);
});