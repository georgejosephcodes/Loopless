const express = require('express');
const limiter = require('../middleware/rateLimiter');
const { optimizeRoute } = require('../controllers/optimize.controller');

const router = express.Router();

router.post('/optimize', limiter, optimizeRoute);

module.exports = router;
