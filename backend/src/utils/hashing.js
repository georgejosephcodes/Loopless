const crypto = require('crypto');

// SHA1 hex digest helper (used to build cache keys, e.g. ai-plan:<sha1>)
function sha1Hex(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

module.exports = { sha1Hex };
