const axios = require('axios');
const { ORS_API_KEY } = require('../config/env');
const { norm, haversineDistance } = require('../utils/geo');
const { getCache, setCache } = require('./cache.service');

// ORS occasionally can't resolve a driving route between two points (no
// continuous road link, API hiccup, etc). Rather than faking a ~10,000km
// sentinel for that cell, fall back to a straight-line estimate for that
// pair only, scaled up to approximate real road distance, and flag it.
const ROAD_DISTANCE_CORRECTION_FACTOR = 1.3;
const ASSUMED_AVG_SPEED_KMH = 50;
const ESTIMATED_CACHE_TTL = 3600; // short-lived: retry real ORS data sooner than the 30-day real-result cache

function estimateDistanceAndDuration(a, b) {
  const distanceKm = haversineDistance(a.lat, a.lng, b.lat, b.lng);
  const distanceM = Math.round(distanceKm * 1000 * ROAD_DISTANCE_CORRECTION_FACTOR);
  const durationS = Math.round((distanceM / 1000) / ASSUMED_AVG_SPEED_KMH * 3600);
  return { distanceM, durationS };
}

/**
 * 3. HYBRID ORS MATRIX LOGIC (distance + duration)
 */
async function getORSMatrices(locations) {
  if (!ORS_API_KEY) return { distanceMatrix: null, durationMatrix: null, estimatedMatrix: null };

  const n = locations.length;
  const distanceMatrix = Array.from({ length: n }, () => Array(n).fill(null));
  const durationMatrix = Array.from({ length: n }, () => Array(n).fill(null));
  const estimatedMatrix = Array.from({ length: n }, () => Array(n).fill(false));
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
        getCache(distKey),
        getCache(durKey),
      ]);

      if (cachedDist != null && cachedDur != null) {
        distanceMatrix[i][j] = parseInt(cachedDist);
        durationMatrix[i][j] = parseInt(cachedDur);
        continue;
      }

      const distEstKey = `distEst:${norm(locations[i].lat)},${norm(locations[i].lng)}:${norm(locations[j].lat)},${norm(locations[j].lng)}`;
      const durEstKey = `durEst:${norm(locations[i].lat)},${norm(locations[i].lng)}:${norm(locations[j].lat)},${norm(locations[j].lng)}`;

      const [cachedDistEst, cachedDurEst] = await Promise.all([
        getCache(distEstKey),
        getCache(durEstKey),
      ]);

      if (cachedDistEst != null && cachedDurEst != null) {
        distanceMatrix[i][j] = parseInt(cachedDistEst);
        durationMatrix[i][j] = parseInt(cachedDurEst);
        estimatedMatrix[i][j] = true;
      } else {
        allCached = false;
      }
    }
  }

  if (allCached) return { distanceMatrix, durationMatrix, estimatedMatrix };

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
        if (i === j) continue;

        let distVal = distances?.[i]?.[j] != null ? Math.round(distances[i][j]) : null;
        let durVal = durations?.[i]?.[j] != null ? Math.round(durations[i][j]) : null;
        const isEstimated = distVal == null || durVal == null;

        if (isEstimated) {
          const estimate = estimateDistanceAndDuration(locations[i], locations[j]);
          distVal = estimate.distanceM;
          durVal = estimate.durationS;
        }

        distanceMatrix[i][j] = distVal;
        durationMatrix[i][j] = durVal;
        estimatedMatrix[i][j] = isEstimated;

        const prefix = isEstimated ? 'distEst' : 'dist';
        const durPrefix = isEstimated ? 'durEst' : 'dur';
        const ttl = isEstimated ? ESTIMATED_CACHE_TTL : 2592000;
        const distKey = `${prefix}:${norm(locations[i].lat)},${norm(locations[i].lng)}:${norm(locations[j].lat)},${norm(locations[j].lng)}`;
        const durKey = `${durPrefix}:${norm(locations[i].lat)},${norm(locations[i].lng)}:${norm(locations[j].lat)},${norm(locations[j].lng)}`;
        await setCache(distKey, ttl, distVal.toString());
        await setCache(durKey, ttl, durVal.toString());
      }
    }

    return { distanceMatrix, durationMatrix, estimatedMatrix };

  } catch (e) {
    console.error("ORS Matrix Fetch Failed:", e.response?.data || e.message);
    return { distanceMatrix: null, durationMatrix: null, estimatedMatrix: null };
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

module.exports = { getORSMatrices, getORSRouteGeometry };
