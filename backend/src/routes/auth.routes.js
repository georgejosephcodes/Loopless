const express = require('express');
const requireAuth = require('../middleware/auth');
const { authLimiter } = require('../middleware/authRateLimiter');
const ctrl = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', requireAuth, ctrl.me);

module.exports = router;
