const path = require('path');
const { exec } = require('child_process');
const { getORSMatrices, getORSRouteGeometry } = require('../services/ors.service');

/**
 * 5. OPTIMIZE ENDPOINT
 */
async function optimizeRoute(req, res) {
  const { locations, mode = 'roundtrip', startIdx, endIdx } = req.body;

  if (!locations || locations.length < 2) {
    return res.status(400).send('Minimum 2 locations required.');
  }

  const n = locations.length;
  const isOneWay = mode === 'oneway';

  if (isOneWay) {
    const validStart = Number.isInteger(startIdx) && startIdx >= 0 && startIdx < n;
    const validEnd = Number.isInteger(endIdx) && endIdx >= 0 && endIdx < n;
    if (!validStart || !validEnd || startIdx === endIdx) {
      return res.status(400).json({ error: 'One-way mode requires distinct start and end stops.' });
    }
  }

  const { distanceMatrix: matrix, durationMatrix, estimatedMatrix } = await getORSMatrices(locations);

  if (!matrix) {
    return res.status(500).json({ error: 'Failed to retrieve distance data.' });
  }

  const solverStart = isOneWay ? startIdx : 0;
  const solverModeFlag = isOneWay ? 1 : 0;
  const solverEnd = isOneWay ? endIdx : -1;
  let inputData = `${n} ${solverStart} ${solverModeFlag} ${solverEnd}\n`;

  matrix.forEach(row => {
    inputData += row.join(' ') + '\n';
  });

  const SOLVER_PATH = path.join(__dirname, '..', 'solver', 'tsp');

  const child = exec(SOLVER_PATH, async (error, stdout) => {
    if (error) {
      console.error("C++ Solver Error:", error);
      return res.status(500).json({ error: 'Optimization engine failed.' });
    }

    const lines = stdout.trim().split('\n');

    if (lines.length < 2) {
      return res.status(500).json({ error: 'Invalid solver output.' });
    }

    const indices = lines[1].trim().split(' ').map(Number);

    const optimizedPath = indices.map(i => ({
      ...locations[i],
      originalIdx: i
    }));

    const orderedLocations = indices.map(i => locations[i]);

    if (!isOneWay) {
      // Round trip: close the loop back to the start for map/geometry purposes.
      orderedLocations.push(locations[indices[0]]);
    }

    const routeGeometry = await getORSRouteGeometry(orderedLocations);

    res.json({
      path: optimizedPath,
      distance: (Number(lines[0]) / 1000).toFixed(2),
      mode: isOneWay ? 'oneway' : 'roundtrip',
      matrix,
      durationMatrix,
      estimatedMatrix,
      routeGeometry,
    });
  });

  child.stdin.write(inputData);
  child.stdin.end();
}

module.exports = { optimizeRoute };
