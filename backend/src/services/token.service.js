const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, IS_PROD } = require('../config/env');

const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ALG = { algorithms: ['HS256'] };

const COOKIE_NAME = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? 'none' : 'lax',
  path: '/api/auth',
};

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

const signAccessToken = (userId) =>
  jwt.sign({ sub: String(userId) }, JWT_ACCESS_SECRET, { algorithm: 'HS256', expiresIn: ACCESS_TTL });

const verifyAccessToken = (token) => jwt.verify(token, JWT_ACCESS_SECRET, ALG);

async function issueRefreshToken(userId) {
  const token = jwt.sign(
    { sub: String(userId), jti: crypto.randomUUID() },
    JWT_REFRESH_SECRET,
    { algorithm: 'HS256', expiresIn: Math.floor(REFRESH_TTL_MS / 1000) }
  );
  await RefreshToken.create({
    user: userId,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return token;
}

/**
 * Verifies a refresh token and consumes it (single use). Returns the user id,
 * or null when the token is invalid, expired or already used.
 */
async function consumeRefreshToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, JWT_REFRESH_SECRET, ALG);
  } catch {
    return null;
  }
  const deleted = await RefreshToken.findOneAndDelete({ tokenHash: hash(token) });
  return deleted ? payload.sub : null;
}

const revokeRefreshToken = (token) => RefreshToken.deleteOne({ tokenHash: hash(token) });

const setRefreshCookie = (res, token) =>
  res.cookie(COOKIE_NAME, token, { ...COOKIE_OPTIONS, maxAge: REFRESH_TTL_MS });

const clearRefreshCookie = (res) => res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);

module.exports = {
  COOKIE_NAME,
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
};
