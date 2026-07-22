const redisClient = require('../config/redis');

// Thin wrappers around the Redis client so services don't depend on the
// client directly. Behaviour (keys, TTLs, values) is unchanged.
async function getCache(key) {
  return redisClient.get(key);
}

async function setCache(key, ttlSeconds, value) {
  return redisClient.setEx(key, ttlSeconds, value);
}

module.exports = { getCache, setCache, redisClient };
