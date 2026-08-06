const express = require('express');
const router = express.Router();
const technicianController = require('../controllers/technicianController');
const { verifyToken, requireAdmin, requireAnyRole } = require('../middleware/auth');
const { createAuditLogger } = require('../middleware/auditLogger');

router.use(verifyToken);

// Both Admin and Technician can view technicians (maybe technician needs it for assignment dropdowns)
router.get('/', requireAnyRole, technicianController.getTechnicians);
router.get('/:id', requireAnyRole, technicianController.getTechnicianById);

// Only admin can approve/reject
router.put('/:id/approve', requireAdmin, createAuditLogger('APPROVE_TECHNICIAN', 'Technician'), technicianController.approveTechnician);
router.put('/:id/reject', requireAdmin, createAuditLogger('REJECT_TECHNICIAN', 'Technician'), technicianController.rejectTechnician);

module.exports = router;
