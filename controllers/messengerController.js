const messengerService = require('../services/messengerService');
const { successResponse, serverError, badRequest } = require('../utils/response');
const { supabase } = require('../config/db');

class MessengerController {
  
  // GET /api/messenger/webhook (for Facebook/Custom webhook verification)
  async verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === process.env.WEBHOOK_SECRET) {
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    } else {
      res.status(200).send('Webhook is ready');
    }
  }

  // POST /api/messenger/webhook (Receive data from chatbot)
  async handleIncomingMessage(req, res) {
    try {
      const payload = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      
      // Basic validation
      if (!payload.account_number || !payload.concern) {
        return badRequest(res, 'Missing required fields: account_number and concern');
      }

      const result = await messengerService.handleWebhookSubmission(payload, ipAddress);

      if (!result.success) {
        return badRequest(res, result.message, result.data);
      }

      return successResponse(res, 201, result.message, result.data);
    } catch (error) {
      return serverError(res, error);
    }
  }

  // GET /api/messenger/submissions (Admin view)
  async getSubmissions(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('messenger_submissions')
        .select(`
          *,
          tickets!messenger_submissions_ticket_id_fkey ( ticket_number ),
          customers!messenger_submissions_customer_id_fkey ( full_name, account_number )
        `, { count: 'exact' })
        .order('submitted_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const items = (data || []).map(item => {
        const { tickets, customers, ...sub } = item;
        return {
          ...sub,
          ticket_number: tickets?.ticket_number,
          customer_name: customers?.full_name,
          account_number: customers?.account_number
        };
      });

      return successResponse(res, 200, 'Submissions retrieved', {
        items,
        meta: {
          total: count || 0,
          page,
          limit
        }
      });
    } catch (error) {
      return serverError(res, error);
    }
  }
}

module.exports = new MessengerController();
