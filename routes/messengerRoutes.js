const express = require('express');
const router = express.Router();
const messengerController = require('../controllers/messengerController');
const { verifyWebhookSecret } = require('../middleware/webhookAuth');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Webhook endpoints (External Chatbot -> This System)
// Does not use JWT, uses FB style verify or custom Secret Header
router.get('/webhook', messengerController.verifyWebhook);

// Depending on chatbot architecture, it might send a custom header. We can apply verifyWebhookSecret middleware here
// if we control the chatbot's outgoing POST request headers.
router.post('/webhook', verifyWebhookSecret, messengerController.handleIncomingMessage);

// Admin view of submissions (requires JWT Auth)
router.get('/submissions', verifyToken, requireAdmin, messengerController.getSubmissions);

module.exports = router;
