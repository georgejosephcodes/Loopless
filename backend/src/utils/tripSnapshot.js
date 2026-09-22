const MAX_LOCATIONS = 15;
const MAX_GEOMETRY_POINTS = 2000;
const MAX_ITINERARY_ROWS = 200;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const str = (v, max) => String(v ?? '').slice(0, max);

class SnapshotError extends Error {}

function cleanLocations(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_LOCATIONS + 1) {
    throw new SnapshotError(`locations must have 1-${MAX_LOCATIONS} entries.`);
  }
  return input.map((l) => {
    if (!isNum(l?.lat) || !isNum(l?.lng) || l.lat < -90 || l.lat > 90 || l.lng < -180 || l.lng > 180) {
      throw new SnapshotError('Each location needs valid lat/lng.');
    }
    const out = { name: str(l.name, 200), lat: l.lat, lng: l.lng };
    if (l.id != null) out.id = str(l.id, 64);
    if (l.reason != null) out.reason = str(l.reason, 500);
    if (isNum(l.originalIdx)) out.originalIdx = l.originalIdx;
    return out;
  });
}

function cleanMatrix(input, name) {
  if (input == null) return [];
  const ok =
    Array.isArray(input) &&
    input.length <= MAX_LOCATIONS + 1 &&
    input.every((row) => Array.isArray(row) && row.length <= MAX_LOCATIONS + 1 && row.every((v) => v === null || isNum(v)));
  if (!ok) throw new SnapshotError(`${name} is malformed.`);
  return input;
}

function cleanBoolMatrix(input, name) {
  if (input == null) return [];
  const ok =
    Array.isArray(input) &&
    input.length <= MAX_LOCATIONS + 1 &&
    input.every((row) => Array.isArray(row) && row.length <= MAX_LOCATIONS + 1 && row.every((v) => typeof v === 'boolean'));
  if (!ok) throw new SnapshotError(`${name} is malformed.`);
  return input;
}

function cleanGeometry(input) {
  if (input == null) return [];
  if (!Array.isArray(input) || !input.every((p) => isNum(p?.lat) && isNum(p?.lng))) {
    throw new SnapshotError('routeGeometry is malformed.');
  }
  const step = Math.ceil(input.length / MAX_GEOMETRY_POINTS);
  const sampled = step > 1 ? input.filter((_, i) => i % step === 0 || i === input.length - 1) : input;
  return sampled.map(({ lat, lng }) => ({ lat, lng }));
}

function cleanItinerary(input) {
  if (input == null) return undefined;
  if (!Array.isArray(input) || input.length > MAX_ITINERARY_ROWS) {
    throw new SnapshotError('itinerary is malformed.');
  }
  return input.map((r) => ({
    day: isNum(r?.day) ? r.day : 1,
    place: str(r?.place, 200),
    arrival: str(r?.arrival, 16),
    departure: str(r?.departure, 16),
    stayMinutes: isNum(r?.stayMinutes) ? r.stayMinutes : 0,
    travelMinutes: isNum(r?.travelMinutes) ? r.travelMinutes : 0,
    isTravelDay: r?.isTravelDay === true,
    isStayDay: r?.isStayDay === true,
    estimatedTravel: r?.estimatedTravel === true,
  }));
}

function cleanStayMinutesByStop(input) {
  if (input == null || typeof input !== 'object') return undefined;
  const out = {};
  for (const [key, val] of Object.entries(input)) {
    const num = Number(val);
    if (isNum(num)) out[key] = num;
  }
  return Object.keys(out).length ? out : undefined;
}

function cleanSettings(input) {
  const s = input && typeof input === 'object' ? input : {};
  return {
    startTime: str(s.startTime, 16),
    endTime: str(s.endTime, 16),
    visitStyle: str(s.visitStyle, 32),
    customMinutesByStop: cleanStayMinutesByStop(s.customMinutesByStop),
    stayMinutes: isNum(s.stayMinutes) ? s.stayMinutes : undefined,
  };
}

/** Whitelists and bounds a client-supplied trip snapshot. Throws SnapshotError. */
function sanitizeSnapshot(raw) {
  if (!raw || typeof raw !== 'object') throw new SnapshotError('snapshot is required.');
  return {
    locations: cleanLocations(raw.locations),
    totalDistanceKm: isNum(Number(raw.totalDistanceKm)) ? Number(raw.totalDistanceKm) : 0,
    mode: raw.mode === 'oneway' ? 'oneway' : 'roundtrip',
    matrix: cleanMatrix(raw.matrix, 'matrix'),
    durationMatrix: cleanMatrix(raw.durationMatrix, 'durationMatrix'),
    estimatedMatrix: cleanBoolMatrix(raw.estimatedMatrix, 'estimatedMatrix'),
    routeGeometry: cleanGeometry(raw.routeGeometry),
    itinerary: cleanItinerary(raw.itinerary),
    settings: cleanSettings(raw.settings),
  };
}

module.exports = { sanitizeSnapshot, SnapshotError };
