const axios = require('axios');
const { ORS_API_KEY } = require('../config/env');
const { norm } = require('../utils/geo');
const { getCache, setCache } = require('./cache.service');

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
        getCache(distKey),
        getCache(durKey),
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
          await setCache(distKey, 2592000, distVal.toString());
          await setCache(durKey, 2592000, durVal.toString());
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

module.exports = { getORSMatrices, getORSRouteGeometry };
