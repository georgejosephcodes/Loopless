const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const testEnv = require('./helpers/testEnv');

let app;
let redisClient;

before(async () => {
  ({ app, redisClient } = await testEnv.start());
});

beforeEach(async () => {
  await testEnv.reset(redisClient);
});

after(async () => {
  await testEnv.stop(redisClient);
});

const locations = [
  { name: 'A', lat: 10, lng: 76 },
  { name: 'B', lat: 10.1, lng: 76.1 },
  { name: 'C', lat: 10.2, lng: 76.2 },
];

// Small deterministic matrix -- the point is proving the plumbing (mocked
// ORS lookup -> real solver binary -> response shape), not finding a
// realistic optimal tour.
const mockMatrices = () => ({
  distanceMatrix: [
    [0, 10, 20],
    [10, 0, 15],
    [20, 15, 0],
  ],
  durationMatrix: [
    [0, 600, 1200],
    [600, 0, 900],
    [1200, 900, 0],
  ],
  estimatedMatrix: [
    [false, false, false],
    [false, false, false],
    [false, false, false],
  ],
});

test('rejects fewer than 2 locations', async () => {
  const res = await request(app).post('/api/optimize').send({ locations: [locations[0]] });
  assert.equal(res.status, 400);
});

test('one-way mode requires distinct start and end stops', async () => {
  testEnv.setOrsMock({ getORSMatrices: async () => mockMatrices() });
  const res = await request(app)
    .post('/api/optimize')
    .send({ locations, mode: 'oneway', startIdx: 0, endIdx: 0 });
  assert.equal(res.status, 400);
});

test('optimizes a round trip route', async () => {
  testEnv.setOrsMock({ getORSMatrices: async () => mockMatrices() });
  const res = await request(app).post('/api/optimize').send({ locations, mode: 'roundtrip' });
  assert.equal(res.status, 200);
  assert.equal(res.body.mode, 'roundtrip');
  assert.equal(res.body.path.length, 3);
  assert.ok(Number(res.body.distance) > 0);
});

test('optimizes a one-way route with a fixed start and end', async () => {
  testEnv.setOrsMock({ getORSMatrices: async () => mockMatrices() });
  const res = await request(app)
    .post('/api/optimize')
    .send({ locations, mode: 'oneway', startIdx: 0, endIdx: 2 });
  assert.equal(res.status, 200);
  assert.equal(res.body.mode, 'oneway');
  assert.equal(res.body.path[0].originalIdx, 0);
  assert.equal(res.body.path[res.body.path.length - 1].originalIdx, 2);
});

test('returns 500 when the distance matrix cannot be retrieved', async () => {
  testEnv.setOrsMock({ getORSMatrices: async () => ({ distanceMatrix: null, durationMatrix: null, estimatedMatrix: null }) });
  const res = await request(app).post('/api/optimize').send({ locations, mode: 'roundtrip' });
  assert.equal(res.status, 500);
});
