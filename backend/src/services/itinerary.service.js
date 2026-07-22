const { minutesToTimeString } = require('../utils/time');

/**
 * 9. SMART ITINERARY ENGINE
 *
 * Kept as small, pure, side-effect-free functions so future features
 * (opening hours, meal breaks, weather-awareness, traffic-aware routing,
 * sunrise/sunset scheduling, AI time optimization, etc.) can hook into the
 * scheduling loop later without touching Express routing or the time math.
 */

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

module.exports = { scheduleItinerary };
