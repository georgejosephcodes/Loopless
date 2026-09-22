const express = require('express');
const requireAuth = require('../middleware/auth');
const ctrl = require('../controllers/trips.controller');

const router = express.Router();

// Auth first so anonymous callers can't make us buffer large bodies.
// Snapshots carry distance/duration matrices and route geometry.
router.use(requireAuth);
router.use(express.json({ limit: '5mb' }));

router.post('/', ctrl.create);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/share', ctrl.enableShare);
router.delete('/:id/share', ctrl.revokeShare);

module.exports = router;
