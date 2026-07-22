const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
});

module.exports = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEOAPIFY_API_KEY: process.env.GEOAPIFY_API_KEY,
  ORS_API_KEY: process.env.ORS_API_KEY,
  REDIS_URL: process.env.REDIS_URL,
  PORT: process.env.PORT || 5000,
};