const { createClient } = require('redis');
const { REDIS_URL } = require('./env');

/**
 * 1. CLOUD REDIS CONNECTION
 */
const redisClient = createClient({
  url: REDIS_URL
});

redisClient.on('error', (err) => console.log('❌ Upstash Connection Error:', err));

redisClient.connect().then(() => {
  console.log('🌐 Connected to Upstash Cloud Redis');
}).catch((err) => {
  console.error('CRITICAL: Could not connect to Redis. Check your REDIS_URL.', err);
});

module.exports = redisClient;
