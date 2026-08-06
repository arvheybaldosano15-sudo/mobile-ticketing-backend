const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken, requireAnyRole } = require('../middleware/auth');
const upload = require('../config/multer');
const { createAuditLogger } = require('../middleware/auditLogger');

// All ticket routes require authentication (admin or technician)
router.use(verifyToken);
router.use(requireAnyRole);

router.get('/', ticketController.getTickets);
router.get('/:id', ticketController.getTicketById);
router.get('/:id/timeline', ticketController.getTicketTimeline);
router.get('/:id/attachments', ticketController.getTicketAttachments);

// Actions with audit logging
router.put('/:id/assign', createAuditLogger('ASSIGN_TICKET', 'Ticket'), ticketController.assignTechnician);
router.put('/:id/status', createAuditLogger('UPDATE_TICKET_STATUS', 'Ticket'), ticketController.updateTicketStatus);

// Attachments (Upload)
router.post('/:id/attachments', upload.single('attachment'), (req, res) => {
  // Placeholder for saving attachment reference to DB after multer handles upload
  res.json({ success: true, message: 'File uploaded', file: req.file });
});

module.exports = router;
