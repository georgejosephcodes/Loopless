const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {
  COOKIE_NAME,
  signAccessToken,
  issueRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
} = require('../services/token.service');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_COST = 12;
// Compared against when the email is unknown so login timing does not reveal it.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email });

async function startSession(res, user, status = 200) {
  setRefreshCookie(res, await issueRefreshToken(user._id));
  return res.status(status).json({ accessToken: signAccessToken(user._id), user: publicUser(user) });
}

exports.register = async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!name || name.length > 80) return res.status(400).json({ error: 'Name is required (max 80 characters).' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'Password must be 8-72 characters.' });
  }

  if (await User.exists({ email })) return res.status(409).json({ error: 'Email already registered.' });

  let user;
  try {
    user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, BCRYPT_COST) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already registered.' });
    throw err;
  }
  return startSession(res, user, 201);
};

exports.login = async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  const user = await User.findOne({ email });
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: 'Invalid email or password.' });

  return startSession(res, user);
};

exports.refresh = async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'No session.' });

  const userId = await consumeRefreshToken(token);
  const user = userId && (await User.findById(userId));
  if (!user) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: 'Session expired.' });
  }
  return startSession(res, user);
};

exports.logout = async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) await revokeRefreshToken(token);
  clearRefreshCookie(res);
  res.status(204).end();
};

exports.me = async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'Invalid or expired token.' });
  res.json({ user: publicUser(user) });
};
