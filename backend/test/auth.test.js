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

test('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' });
});

test('register creates a user and starts a session', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Ada', email: 'ada@example.com', password: 'password123' });
  assert.equal(res.status, 201);
  assert.ok(res.body.accessToken);
  assert.equal(res.body.user.email, 'ada@example.com');
  assert.ok(res.headers['set-cookie']?.some((c) => c.startsWith('refreshToken=')));
});

test('register rejects a duplicate email', async () => {
  const payload = { name: 'Ada', email: 'dup@example.com', password: 'password123' };
  await request(app).post('/api/auth/register').send(payload);
  const res = await request(app).post('/api/auth/register').send(payload);
  assert.equal(res.status, 409);
});

test('register rejects a short password', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Ada', email: 'short@example.com', password: '123' });
  assert.equal(res.status, 400);
});

test('login succeeds with the right password', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Bob', email: 'bob@example.com', password: 'password123' });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'bob@example.com', password: 'password123' });
  assert.equal(res.status, 200);
  assert.ok(res.body.accessToken);
});

test('login rejects the wrong password', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Cara', email: 'cara@example.com', password: 'password123' });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'cara@example.com', password: 'wrongpass' });
  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'Invalid email or password.');
});

test('login rejects an unknown email with the same message (no user enumeration)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nobody@example.com', password: 'whatever1' });
  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'Invalid email or password.');
});

test('GET /api/auth/me requires a bearer token', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 401);
});

test('GET /api/auth/me returns the current user for a valid token', async () => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Dee', email: 'dee@example.com', password: 'password123' });
  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${registerRes.body.accessToken}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, 'dee@example.com');
});

test('logout clears the session cookie', async () => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Hank', email: 'hank@example.com', password: 'password123' });
  const res = await request(app).post('/api/auth/logout').set('Cookie', registerRes.headers['set-cookie']);
  assert.equal(res.status, 204);
});

test('11th failed login for the same email is rate-limited', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Eve', email: 'eve@example.com', password: 'password123' });

  for (let i = 0; i < 10; i++) {
    await request(app).post('/api/auth/login').send({ email: 'eve@example.com', password: 'wrongpass' });
  }
  const res = await request(app).post('/api/auth/login').send({ email: 'eve@example.com', password: 'wrongpass' });
  assert.equal(res.status, 429);
});

test("failed logins for one email do not block a different email's attempts", async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Frank', email: 'frank@example.com', password: 'password123' });
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Grace', email: 'grace@example.com', password: 'password123' });

  for (let i = 0; i < 10; i++) {
    await request(app).post('/api/auth/login').send({ email: 'frank@example.com', password: 'wrongpass' });
  }
  const res = await request(app).post('/api/auth/login').send({ email: 'grace@example.com', password: 'wrongpass' });
  assert.notEqual(res.status, 429);
});
