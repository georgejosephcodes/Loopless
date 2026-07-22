const geminiModel = require('../config/gemini');
const CATEGORY_MAP = require('../constants/categories');
const { norm, haversineDistance } = require('../utils/geo');
const { sha1Hex } = require('../utils/hashing');
const { geocodePlace } = require('./geocode.service');
const { getCache, setCache } = require('./cache.service');

/**
 * 6. AI AUTOFILL LOGIC
 */
async function getAIAutofillPlaces({ startPlace, lat, lng, radiusKm, maxStops, category }) {
  try {
    // Distance checker (km)
    const cacheKey = `ai:${startPlace}:${norm(lat)},${norm(lng)}:${radiusKm}:${maxStops}:${category}`;

    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

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
    await setCache(
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
 * 7. NATURAL LANGUAGE TRIP PLANNER
 */
async function getAIPlanPlaces(userPrompt) {
  try {
    const cacheKey = `ai-plan:${sha1Hex(userPrompt.trim().toLowerCase())}`;

    const cached = await getCache(cacheKey);
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

    await setCache(cacheKey, 604800, JSON.stringify(verifiedPlaces));

    return verifiedPlaces;
  } catch (err) {
    console.error('AI Plan failed:', err.message);
    return [];
  }
}

module.exports = { getAIAutofillPlaces, getAIPlanPlaces };
