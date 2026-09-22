const { timeStringToMinutes } = require('../utils/time');
const { scheduleItineraryWithGemini, GeminiItineraryError } = require('../services/geminiItinerary.service');

/**
 * 10. SMART ITINERARY ENDPOINT
 */
async function itinerary(req, res) {
  const {
    optimizedRoute,
    durationMatrix,
    estimatedMatrix,
    startTime = '09:00',
    endTime = '18:00',
    stayMinutes = 60,
    stayMinutesByStop,
    mode,
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
  if (!Number.isFinite(stay) || stay < 5 || stay > 1440) {
    return res.status(400).json({
      error: 'Stay duration must be a positive number, up to 24 hours.',
    });
  }

  let perStopStay;
  if (stayMinutesByStop && typeof stayMinutesByStop === 'object') {
    perStopStay = {};
    for (const [idx, val] of Object.entries(stayMinutesByStop)) {
      const num = Number(val);
      if (!Number.isFinite(num) || num < 5 || num > 1440) {
        return res.status(400).json({
          error: 'Each custom stay duration must be a positive number, up to 24 hours.',
        });
      }
      perStopStay[idx] = num;
    }
  }

  try {
    const result = await scheduleItineraryWithGemini({
      optimizedRoute,
      durationMatrix,
      estimatedMatrix,
      startMinutes,
      endMinutes,
      stayMinutes: stay,
      stayMinutesByStop: perStopStay,
      mode: mode === 'oneway' ? 'oneway' : 'roundtrip',
    });

    res.json({ itinerary: result });
  } catch (err) {
    if (err instanceof GeminiItineraryError) {
      console.error('Gemini itinerary generation failed:', err.message);
      return res.status(503).json({ error: 'busy' });
    }
    console.error('Itinerary generation failed:', err.message);
    res.status(500).json({ error: 'Could not generate itinerary.' });
  }
}

module.exports = { itinerary };
