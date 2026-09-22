const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { RedisMemoryServer } = require('redis-memory-server');

let mongod;
let redisServer;

const defaultOrsImpl = () => ({
  getORSMatrices: async () => ({ distanceMatrix: null, durationMatrix: null, estimatedMatrix: null }),
  getORSRouteGeometry: async () => [],
});
let orsImpl = defaultOrsImpl();

// Tests set this to control what the optimize endpoint's distance lookup
// returns, without ever hitting the real ORS API.
function setOrsMock(overrides) {
  orsImpl = { ...defaultOrsImpl(), ...overrides };
}

// config/env.js reads process.env once, at first require -- these must be
// set before anything under src/ is required, or the app will try to talk
// to the real Mongo/Redis/JWT config from backend/.env instead of the
// disposable in-memory instances started here.
async function start() {
  mongod = await MongoMemoryServer.create();
  redisServer = new RedisMemoryServer();

  process.env.MONGODB_URI = mongod.getUri();
  process.env.REDIS_URL = `redis://${await redisServer.getHost()}:${await redisServer.getPort()}`;
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.SEED_DEMO_USER = 'false';
  process.env.NODE_ENV = 'test';

  await mongoose.connect(process.env.MONGODB_URI);

  // optimize.controller.js destructures ors.service's exports at require
  // time -- patching them AFTER app.js is required would be too late, since
  // the controller would already hold the original function references.
  // Installing a stable wrapper now, before app.js exists, means the
  // controller permanently captures THIS wrapper, which forwards to
  // whatever orsImpl each test sets later via setOrsMock().
  const orsService = require('../../src/services/ors.service');
  orsService.getORSMatrices = (...args) => orsImpl.getORSMatrices(...args);
  orsService.getORSRouteGeometry = (...args) => orsImpl.getORSRouteGeometry(...args);

  const app = require('../../src/app');
  const redisClient = require('../../src/config/redis');
  if (!redisClient.isOpen) {
    await new Promise((resolve) => redisClient.once('ready', resolve));
  }

  return { app, redisClient };
}

async function reset(redisClient) {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  await redisClient.flushAll();
  orsImpl = defaultOrsImpl();
}

async function stop(redisClient) {
  await mongoose.disconnect();
  await mongod.stop();
  await redisClient.quit();
  await redisServer.stop();
}

module.exports = { start, reset, stop, setOrsMock };
