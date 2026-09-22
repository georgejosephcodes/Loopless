const express = require('express');
const { sharedLimiter } = require('../middleware/authRateLimiter');
const { getShared } = require('../controllers/trips.controller');

const router = express.Router();

router.get('/:token', sharedLimiter, getShared);

module.exports = router;
