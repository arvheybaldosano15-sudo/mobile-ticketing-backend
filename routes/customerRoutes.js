const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { verifyToken, requireAnyRole, requireAdmin } = require('../middleware/auth');
const { createAuditLogger } = require('../middleware/auditLogger');

// Auth required
router.use(verifyToken);
router.use(requireAnyRole);

router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);
router.get('/:id/tickets', customerController.getCustomerTickets);

// Create/Update require Admin role based on requirements (only admin adds customers)
router.post('/', requireAdmin, createAuditLogger('CREATE_CUSTOMER', 'Customer', 'id'), customerController.createCustomer);
router.put('/:id', requireAdmin, createAuditLogger('UPDATE_CUSTOMER', 'Customer', 'id'), customerController.updateCustomer);
router.delete('/:id', requireAdmin, createAuditLogger('DELETE_CUSTOMER', 'Customer', 'id'), customerController.deleteCustomer);

module.exports = router;
