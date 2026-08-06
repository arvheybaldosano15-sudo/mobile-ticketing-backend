const { supabase } = require('../config/db');
const Customer = require('../models/Customer');
const Ticket = require('../models/Ticket');
const Settings = require('../models/Settings');
const aiService = require('./aiService');
const ticketService = require('./ticketService');
const { logger } = require('../utils/logger');

class MessengerService {
  
  async handleWebhookSubmission(payload, ipAddress) {
    try {
      const { account_number, full_name, concern } = payload;
      
      // 1. VERIFY CUSTOMER (using Account Number)
      const customer = await Customer.findByAccountNumber(account_number);
      
      if (!customer) {
        return {
          success: false,
          error: 'ACCOUNT_NOT_FOUND',
          message: 'Account number not found in our records. Please ensure you have an active account.'
        };
      }

      // 2. AI CLASSIFICATION
      const serviceCategories = await Settings.getServiceCategories();
      const aiResult = await aiService.classifyTicket(concern, serviceCategories);
      
      // 3. CHECK FOR DUPLICATES
      const duplicate = await ticketService.checkForDuplicates(customer.id, aiResult.service_category_id);
      if (duplicate) {
        return {
          success: false,
          error: 'DUPLICATE_TICKET',
          message: `You already have an open ticket for this issue (${duplicate.ticket_number}).`,
          data: duplicate
        };
      }

      // 4. CREATE TICKET
      const ticketData = {
        customer_id: customer.id,
        service_category_id: aiResult.service_category_id,
        priority: aiResult.ai_priority_recommendation,
        subject: concern.substring(0, 50) + (concern.length > 50 ? '...' : ''),
        description: concern,
        source: 'messenger',
        ai_priority_recommendation: aiResult.ai_priority_recommendation,
        ai_estimated_resolution_hours: aiResult.ai_estimated_resolution_hours,
        ai_classification_confidence: aiResult.ai_classification_confidence
      };

      const ticket = await Ticket.create(ticketData);

      // 5. LOG RAW SUBMISSION
      await supabase
        .from('messenger_submissions')
        .insert({
          ticket_id: ticket.id,
          customer_id: customer.id,
          raw_payload: payload,
          ip_address: ipAddress
        });

      return {
        success: true,
        message: 'Ticket created successfully',
        data: {
          ticket_number: ticket.ticket_number,
          status: ticket.status,
          priority: ticket.priority,
          tracking_url: `${process.env.CLIENT_URL}/track/${ticket.ticket_number}`
        }
      };

    } catch (error) {
      logger.error('Webhook processing error:', error);
      throw error;
    }
  }
}

module.exports = new MessengerService();
