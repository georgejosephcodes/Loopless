const { getAIAutofillPlaces, getAIPlanPlaces } = require('../services/ai.service');

/**
 * 6. AI AUTOFILL ENDPOINT
 */
async function aiAutofill(req, res) {
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
}

/**
 * 8. AI PLAN ENDPOINT (Natural Language Trip Planning)
 */
async function aiPlan(req, res) {
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
}

module.exports = { aiAutofill, aiPlan };
