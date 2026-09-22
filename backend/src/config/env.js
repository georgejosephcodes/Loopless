const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
});

const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(
    `Missing required env vars: ${missing.join(', ')}. Copy backend/.env.example to backend/.env and fill them in.`
  );
}

// CLIENT_ORIGIN may hold several comma-separated origins. "*" is dropped: browsers
// reject a wildcard when cookies are sent, so every origin must be explicit.
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter((o) => o && o !== '*');
if (!CLIENT_ORIGINS.length) CLIENT_ORIGINS.push('http://localhost:5173');

module.exports = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEOAPIFY_API_KEY: process.env.GEOAPIFY_API_KEY,
  ORS_API_KEY: process.env.ORS_API_KEY,
  REDIS_URL: process.env.REDIS_URL,
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  CLIENT_ORIGIN: CLIENT_ORIGINS[0],
  CLIENT_ORIGINS,
  IS_PROD: process.env.NODE_ENV === 'production',
  // Local testing account; off in production unless explicitly enabled.
  SEED_DEMO_USER:
    process.env.SEED_DEMO_USER === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_USER !== 'false'),
};
