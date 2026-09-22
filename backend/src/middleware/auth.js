const { verifyAccessToken } = require('../services/token.service');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    req.userId = verifyAccessToken(token).sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = requireAuth;
