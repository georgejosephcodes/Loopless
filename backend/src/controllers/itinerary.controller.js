const { timeStringToMinutes } = require('../utils/time');
const { scheduleItinerary } = require('../services/itinerary.service');

/**
 * 10. SMART ITINERARY ENDPOINT
 */
function itinerary(req, res) {
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
    const result = scheduleItinerary({
      optimizedRoute,
      durationMatrix,
      startMinutes,
      endMinutes,
      stayMinutes: stay,
    });

    res.json({ itinerary: result });
  } catch (err) {
    console.error('Itinerary generation failed:', err.message);
    res.status(500).json({ error: 'Could not generate itinerary.' });
  }
}

module.exports = { itinerary };
