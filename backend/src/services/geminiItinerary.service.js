const geminiModel = require('../config/gemini');
const { sha1Hex } = require('../utils/hashing');
const { minutesToTimeString } = require('../utils/time');
const { getCache, setCache } = require('./cache.service');

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const CACHE_TTL_SECONDS = 86400;

class GeminiItineraryError extends Error {}

/**
 * 9. SMART ITINERARY ENGINE (Gemini-driven)
 *
 * The TSP solver has already fixed the visit order; this asks Gemini to lay
 * that fixed order out day-by-day within the trip's daily active window,
 * instead of computing day-splits with hand-rolled arithmetic.
 */
function buildStopPlan({ optimizedRoute, durationMatrix, estimatedMatrix, stayMinutes, stayMinutesByStop }) {
  return optimizedRoute.map((stop, i) => {
    const prevStop = i > 0 ? optimizedRoute[i - 1] : null;
    let travelMinutesFromPrev = 0;
    let estimatedTravel = false;
    if (prevStop) {
      const seconds = durationMatrix?.[prevStop.originalIdx]?.[stop.originalIdx];
      travelMinutesFromPrev = seconds != null ? Math.round(seconds / 60) : 0;
      estimatedTravel = estimatedMatrix?.[prevStop.originalIdx]?.[stop.originalIdx] === true;
    }
    return {
      index: i,
      name: stop.name,
      stayMinutes: stayMinutesByStop?.[stop.originalIdx] ?? stayMinutes,
      travelMinutesFromPrev,
      estimatedTravel,
    };
  });
}

function buildPrompt({ stopPlan, startMinutes, endMinutes, mode }) {
  const startTime = minutesToTimeString(startMinutes);
  const endTime = minutesToTimeString(endMinutes);

  return `
You are an expert road-trip scheduler.

The visiting order below is already fixed (do not reorder it). Build a
day-by-day itinerary that assigns each stop a day number, an arrival time,
and a departure time, using ONLY the daily active window ${startTime}–${endTime}
(no travel or visiting outside this window on any day).

Stops, in fixed visiting order, with the drive time from the previous stop:
${JSON.stringify(stopPlan, null, 2)}

Trip mode: ${mode === 'oneway' ? 'one-way (no forced return leg)' : 'round trip'}

Rules:
- Day 1 starts at ${startTime} at the first stop (arrival = ${startTime}).
- A stop's departure = its arrival + its stayMinutes, unless that would pass
  ${endTime}, in which case the stay spans into the next day(s): emit the
  stop's own row with departure capped at ${endTime}, then one row per extra
  full day needed with "place": "Staying at <stop name>", "isStayDay": true,
  "arrival": null, "departure": null, and finally the stop's real departure
  time on the day the stay actually ends.
- The next stop's travel departs from the previous stop's actual departure
  time (never earlier than ${startTime} on a new day).
- If travelMinutesFromPrev would make the next stop's arrival pass ${endTime},
  spend today's remaining minutes traveling, then emit one row per extra full
  travel day needed with "place": "Traveling to <stop name>", "isTravelDay":
  true, "arrival": null, "departure": null, "travelMinutes" set to that full
  day's travel minutes, then arrive on the day the travel window reopens (at
  ${startTime} plus the leftover travel minutes) and continue normally.
- Never leave a stop's arrival/departure outside ${startTime}–${endTime}.
- "estimatedTravel" on a stop's row must equal that stop's input
  "estimatedTravel" flag; travel-day spillover rows inherit it from the same
  leg.
- Day numbers increase by 1 for each day rollover, starting at 1, and never
  skip or repeat except for spillover rows on the correct day.

Return ONLY a valid JSON array (no markdown, no explanation). Every element
must have exactly these keys:
{
  "day": number,
  "place": string,
  "arrival": "HH:MM" or null,
  "departure": "HH:MM" or null,
  "stayMinutes": number,
  "travelMinutes": number,
  "isTravelDay": boolean,
  "isStayDay": boolean,
  "estimatedTravel": boolean
}
`;
}

function isValidRow(row) {
  if (!row || typeof row !== 'object') return false;
  if (!Number.isFinite(row.day) || row.day < 1) return false;
  if (typeof row.place !== 'string' || !row.place) return false;
  if (row.arrival !== null && !TIME_RE.test(row.arrival)) return false;
  if (row.departure !== null && !TIME_RE.test(row.departure)) return false;
  if (!Number.isFinite(row.stayMinutes) || row.stayMinutes < 0) return false;
  if (!Number.isFinite(row.travelMinutes) || row.travelMinutes < 0) return false;
  return true;
}

function normalizeRow(row) {
  return {
    day: row.day,
    place: row.place,
    arrival: row.arrival,
    departure: row.departure,
    stayMinutes: row.stayMinutes,
    travelMinutes: row.travelMinutes,
    isTravelDay: row.isTravelDay === true,
    isStayDay: row.isStayDay === true,
    estimatedTravel: row.estimatedTravel === true,
  };
}

async function scheduleItineraryWithGemini({
  optimizedRoute,
  durationMatrix,
  estimatedMatrix,
  startMinutes,
  endMinutes,
  stayMinutes,
  stayMinutesByStop,
  mode,
}) {
  const stopPlan = buildStopPlan({ optimizedRoute, durationMatrix, estimatedMatrix, stayMinutes, stayMinutesByStop });

  const cacheKey = `itinerary:${sha1Hex(JSON.stringify({ stopPlan, startMinutes, endMinutes, mode }))}`;

  try {
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error('Itinerary cache read failed:', err.message);
  }

  const prompt = buildPrompt({ stopPlan, startMinutes, endMinutes, mode });

  let rawText;
  try {
    const geminiResult = await geminiModel.generateContent(prompt);
    rawText = geminiResult.response
      .text()
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
  } catch (err) {
    throw new GeminiItineraryError(`Gemini request failed: ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    console.error('Gemini itinerary JSON parse failed:', rawText);
    throw new GeminiItineraryError('Gemini returned unparseable output.');
  }

  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isValidRow)) {
    console.error('Gemini itinerary shape validation failed:', rawText);
    throw new GeminiItineraryError('Gemini returned an invalid itinerary.');
  }

  const result = parsed.map(normalizeRow);

  try {
    await setCache(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
  } catch (err) {
    console.error('Itinerary cache write failed:', err.message);
  }

  return result;
}

module.exports = { scheduleItineraryWithGemini, GeminiItineraryError };
