const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const testEnv = require('./helpers/testEnv');

let app;
let redisClient;
let geminiModel;

before(async () => {
  ({ app, redisClient } = await testEnv.start());
  // Mutating this object's method affects geminiItinerary.service.js too --
  // it holds the same require-cached object, and reads .generateContent at
  // call time, so this works regardless of when it's set (no destructuring
  // pitfall here, unlike ors.service.js -- see testEnv.js).
  geminiModel = require('../src/config/gemini');
});

beforeEach(async () => {
  await testEnv.reset(redisClient);
});

after(async () => {
  await testEnv.stop(redisClient);
});

const validPayload = () => ({
  optimizedRoute: [
    { name: 'A', originalIdx: 0 },
    { name: 'B', originalIdx: 1 },
  ],
  durationMatrix: [
    [0, 3600],
    [3600, 0],
  ],
  startTime: '09:00',
  endTime: '18:00',
  stayMinutes: 60,
});

const validGeminiRows = () =>
  JSON.stringify([
    {
      day: 1,
      place: 'A',
      arrival: '09:00',
      departure: '10:00',
      stayMinutes: 60,
      travelMinutes: 0,
      isTravelDay: false,
      isStayDay: false,
      estimatedTravel: false,
    },
    {
      day: 1,
      place: 'B',
      arrival: '11:00',
      departure: '12:00',
      stayMinutes: 60,
      travelMinutes: 60,
      isTravelDay: false,
      isStayDay: false,
      estimatedTravel: false,
    },
  ]);

function mockGemini(fn) {
  geminiModel.generateContent = fn;
}

test('generates an itinerary from a valid Gemini response', async () => {
  mockGemini(async () => ({ response: { text: () => validGeminiRows() } }));
  const res = await request(app).post('/api/itinerary').send(validPayload());
  assert.equal(res.status, 200);
  assert.equal(res.body.itinerary.length, 2);
  assert.equal(res.body.itinerary[0].place, 'A');
});

test('rejects a request with no optimized route', async () => {
  const { optimizedRoute, ...rest } = validPayload();
  const res = await request(app).post('/api/itinerary').send(rest);
  assert.equal(res.status, 400);
});

test('rejects an end time before the start time', async () => {
  const res = await request(app)
    .post('/api/itinerary')
    .send({ ...validPayload(), startTime: '18:00', endTime: '09:00' });
  assert.equal(res.status, 400);
});

test('returns a busy response instead of crashing when Gemini fails', async () => {
  mockGemini(async () => {
    throw new Error('network down');
  });
  const res = await request(app).post('/api/itinerary').send(validPayload());
  assert.equal(res.status, 503);
  assert.equal(res.body.error, 'busy');
});

test('returns a busy response when Gemini returns unparseable text', async () => {
  mockGemini(async () => ({ response: { text: () => 'not json at all' } }));
  const res = await request(app).post('/api/itinerary').send(validPayload());
  assert.equal(res.status, 503);
  assert.equal(res.body.error, 'busy');
});

test('a second identical request is served from cache, not a second Gemini call', async () => {
  let calls = 0;
  mockGemini(async () => {
    calls++;
    return { response: { text: () => validGeminiRows() } };
  });

  const first = await request(app).post('/api/itinerary').send(validPayload());
  const second = await request(app).post('/api/itinerary').send(validPayload());

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.deepEqual(second.body, first.body);
  assert.equal(calls, 1);
});
