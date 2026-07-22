const express = require('express');
const { aiAutofill, aiPlan } = require('../controllers/ai.controller');

const router = express.Router();

router.post('/ai-autofill', aiAutofill);
router.post('/ai-plan', aiPlan);

module.exports = router;
