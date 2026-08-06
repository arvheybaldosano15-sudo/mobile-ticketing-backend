const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { createAuditLogger } = require('../middleware/auditLogger');

router.use(verifyToken);
router.use(requireAdmin);

router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/settings', adminController.getSettings);
router.put('/settings', createAuditLogger('UPDATE_SETTINGS', 'Settings'), adminController.updateSettings);
router.get('/reports/tickets', adminController.exportTicketsReport);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
