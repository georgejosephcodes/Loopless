const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');

const build = (prefix, windowMs, max, error, keyGenerator) =>
  rateLimit({
    store: new RedisStore({
      prefix,
      sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    windowMs,
    max,
    message: { error },
    standardHeaders: true,
    legacyHeaders: false,
    ...(keyGenerator && { keyGenerator }),
  });

// Key by the account being attempted, not the caller's IP, so one user's bad
// attempts don't lock out everyone sharing a NAT/proxy IP and a single
// attacker can't spread attempts across many IPs to dodge a shared limit.
// Falls back to IP when the body has no parseable email (e.g. malformed JSON).
const emailOrIpKey = (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  return email || `ip:${ipKeyGenerator(req.ip)}`;
};

// Register + login: brute-force protection.
const authLimiter = build(
  'rl:auth:',
  15 * 60 * 1000,
  10,
  'Too many attempts. Please wait 15 minutes.',
  emailOrIpKey
);

// Public share link reads.
const sharedLimiter = build('rl:shared:', 60 * 1000, 60, 'Too many requests. Please slow down.');

module.exports = { authLimiter, sharedLimiter };
