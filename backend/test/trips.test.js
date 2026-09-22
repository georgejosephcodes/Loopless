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

const validSnapshot = (n = 3) => ({ locations: makeLocations(n), totalDistanceKm: 12.5, mode: 'roundtrip' });

async function registerUser(suffix) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email: `user-${suffix}@example.com`, password: 'password123' });
  return res.body.accessToken;
}

test('creating a trip requires auth', async () => {
  const res = await request(app).post('/api/trips').send({ title: 'Trip', snapshot: validSnapshot() });
  assert.equal(res.status, 401);
});

test('creates a trip with a valid snapshot', async () => {
  const token = await registerUser('create');
  const res = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Kerala Loop', snapshot: validSnapshot() });
  assert.equal(res.status, 201);
  assert.equal(res.body.title, 'Kerala Loop');
  assert.equal(res.body.stops, 3);
});

test('rejects a trip with no title', async () => {
  const token = await registerUser('notitle');
  const res = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${token}`)
    .send({ snapshot: validSnapshot() });
  assert.equal(res.status, 400);
});

test('rejects a snapshot with more than 16 locations', async () => {
  const token = await registerUser('toomany');
  const res = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Too many stops', snapshot: validSnapshot(17) });
  assert.equal(res.status, 400);
});

test("lists only the caller's own trips", async () => {
  const tokenA = await registerUser('a');
  const tokenB = await registerUser('b');
  await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ title: 'A trip', snapshot: validSnapshot() });

  const resA = await request(app).get('/api/trips').set('Authorization', `Bearer ${tokenA}`);
  const resB = await request(app).get('/api/trips').set('Authorization', `Bearer ${tokenB}`);
  assert.equal(resA.body.trips.length, 1);
  assert.equal(resB.body.trips.length, 0);
});

test("cannot read another user's trip", async () => {
  const tokenA = await registerUser('owner');
  const tokenB = await registerUser('other');
  const created = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ title: 'Private', snapshot: validSnapshot() });

  const res = await request(app).get(`/api/trips/${created.body.id}`).set('Authorization', `Bearer ${tokenB}`);
  assert.equal(res.status, 404);
});

test("updates a trip's title", async () => {
  const token = await registerUser('update');
  const created = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Old', snapshot: validSnapshot() });
  const res = await request(app)
    .put(`/api/trips/${created.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'New' });
  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'New');
});

test('deletes a trip', async () => {
  const token = await registerUser('delete');
  const created = await request(app)
    .post('/api/trips')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Bye', snapshot: validSnapshot() });
  const del = await request(app).delete(`/api/trips/${created.body.id}`).set('Authorization', `Bearer ${token}`);
  assert.equal(del.status, 204);
  const get = await request(app).get(`/api/trips/${created.body.id}`).set('Authorization', `Bearer ${token}`);
  assert.equal(get.status, 404);
});
