const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Public route — no JWT needed, uses x-api-key header for security instead
router.post('/botcake', webhookController.handleBotcake);
router.post('/botcake/verify', webhookController.verifyAccount);
router.get('/botcake/verify', webhookController.verifyAccount);
router.get('/botcake/debug-logs', webhookController.getDebugLogs);

module.exports = router;
