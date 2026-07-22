const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');

/**
 * 2. RATE LIMITER
 */
const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Optimization limit reached. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = limiter;
