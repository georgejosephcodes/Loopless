const axios = require('axios');
const { GEOAPIFY_API_KEY } = require('../config/env');

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

module.exports = { geocodePlace };
