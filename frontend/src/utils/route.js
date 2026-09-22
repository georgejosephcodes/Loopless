/**
 * Adds cumulative distance to each stop and, for round-trip routes, appends
 * the return-to-start entry. `matrix` is in meters, indexed by each stop's
 * `originalIdx`. `estimatedMatrix` (optional, same shape) flags legs whose
 * distance/duration is a haversine estimate rather than a real ORS route.
 */
export function buildPathWithDistances(locations, matrix, totalDistanceKm, { mode = 'roundtrip', estimatedMatrix } = {}) {
  if (!locations.length || !matrix.length) return [];

  let running = 0;
  const list = locations.map((loc, i) => {
    let isEstimatedLeg = false;
    if (i > 0) {
      const prevIdx = locations[i - 1].originalIdx;
      running += matrix[prevIdx]?.[loc.originalIdx] ?? 0;
      isEstimatedLeg = estimatedMatrix?.[prevIdx]?.[loc.originalIdx] === true;
    }
    return {
      ...loc,
      accumulated: (running / 1000).toFixed(2),
      isStart: i === 0,
      isReturn: false,
      isEstimatedLeg,
    };
  });

  if (mode !== 'oneway') {
    const lastIdx = locations[locations.length - 1].originalIdx;
    const startIdx = locations[0].originalIdx;
    list.push({
      ...locations[0],
      id: `${locations[0].id}-return`,
      accumulated: totalDistanceKm.toFixed(2),
      isStart: false,
      isReturn: true,
      isEstimatedLeg: estimatedMatrix?.[lastIdx]?.[startIdx] === true,
    });
  }
  return list;
}
