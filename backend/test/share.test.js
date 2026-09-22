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

function makeLocations(n) {
  return Array.from({ length: n }, (_, i) => ({ name: `Stop ${i}`, lat: 10 + i * 0.01, lng: 76 + i * 0.01 }));
}
const validSnapshot = () => ({ locations: makeLocations(3), totalDistanceKm: 12.5, mode: 'roundtrip' });

async function registerAndCreateTrip(suffix) {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Sharer', email: `sharer-${suffix}@example.com`, password: 'password123' });
  const token = reg.body.accessToken;
  const created = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Shared Trip', snapshot: validSnapshot() });
  return { token, tripId: created.body.id };
}

test('enabling share returns a token and public url', async () => {
  const { token, tripId } = await registerAndCreateTrip('enable');
  const res = await request(app).post(`/api/trips/${tripId}/share`).set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.shareToken);
  assert.ok(res.body.url.includes(res.body.shareToken));
});

test("a non-owner cannot enable sharing on someone else's trip", async () => {
  const { tripId } = await registerAndCreateTrip('victim');
  const otherReg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Intruder', email: 'intruder@example.com', password: 'password123' });
  const res = await request(app)
    .post(`/api/trips/${tripId}/share`)
    .set('Authorization', `Bearer ${otherReg.body.accessToken}`);
  assert.equal(res.status, 404);
});

test('a shared trip is readable with no auth', async () => {
  const { token, tripId } = await registerAndCreateTrip('read');
  const share = await request(app).post(`/api/trips/${tripId}/share`).set('Authorization', `Bearer ${token}`);

  const res = await request(app).get(`/api/shared/${share.body.shareToken}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'Shared Trip');
  assert.ok(res.body.snapshot);
});

test('an unknown share token returns not found', async () => {
  const res = await request(app).get('/api/shared/does-not-exist');
  assert.equal(res.status, 404);
});

test('revoking share makes the link stop working', async () => {
  const { token, tripId } = await registerAndCreateTrip('revoke');
  const share = await request(app).post(`/api/trips/${tripId}/share`).set('Authorization', `Bearer ${token}`);

  const revoke = await request(app).delete(`/api/trips/${tripId}/share`).set('Authorization', `Bearer ${token}`);
  assert.equal(revoke.status, 204);

  const res = await request(app).get(`/api/shared/${share.body.shareToken}`);
  assert.equal(res.status, 404);
});
