const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const ticketRoutes = require('./ticketRoutes');
const customerRoutes = require('./customerRoutes');
const technicianRoutes = require('./technicianRoutes');
const kbRoutes = require('./knowledgeBaseRoutes');
const adminRoutes = require('./adminRoutes');
const messengerRoutes = require('./messengerRoutes');
const webhookRoutes = require('./webhookRoutes');

router.use('/auth', authRoutes);
router.use('/tickets', ticketRoutes);
router.use('/customers', customerRoutes);
router.use('/technicians', technicianRoutes);
router.use('/knowledge-base', kbRoutes);
router.use('/admin', adminRoutes);
router.use('/messenger', messengerRoutes);
router.use('/webhooks', webhookRoutes);

module.exports = router;
