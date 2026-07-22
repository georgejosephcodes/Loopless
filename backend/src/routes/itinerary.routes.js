const express = require('express');
const { itinerary } = require('../controllers/itinerary.controller');

const router = express.Router();

router.post('/itinerary', itinerary);

module.exports = router;
