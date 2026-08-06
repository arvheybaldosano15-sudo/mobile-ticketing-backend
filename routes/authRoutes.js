const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { verifyToken } = require('../middleware/auth');

// Auth Limiter applied to login and register
router.post('/login', authLimiter, authController.login);
router.post('/register/technician', authLimiter, authController.registerTechnician);
router.post('/refresh', authController.refresh);
router.post('/logout', verifyToken, authController.logout);

module.exports = router;
