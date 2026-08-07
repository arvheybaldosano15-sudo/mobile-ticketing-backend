const { supabase } = require('../config/db');
const Ticket = require('../models/Ticket');

// In-memory log buffer for live debugging
const recentLogs = [];

class WebhookController {
  getDebugLogs(req, res) {
    return res.status(200).json({ success: true, count: recentLogs.length, logs: recentLogs });
  }

  /**
   * POST /api/webhooks/botcake
   * Called by Botcake's JSON API block after the customer completes the chatbot flow.
   * Creates or finds the customer by messenger_psid, then creates a ticket.
   */
  async handleBotcake(req, res) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        endpoint: '/botcake',
        method: req.method,
        query: req.query,
        body: req.body,
        headers: { 'x-api-key': req.headers['x-api-key'] }
      };
      recentLogs.unshift(logEntry);
      if (recentLogs.length > 20) recentLogs.pop();

      // ── 1. Verify API Key ──────────────────────────────────────────────────
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.BOTCAKE_API_KEY) {
        logEntry.error = 'Unauthorized: Invalid API key.';
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid API key.' });
      }

      const {
        messenger_psid,
        full_name,
        contact_number,
        complete_address,
        nearby_landmark,
        account_number,
        subject,
        description,
        category
      } = req.body;

      // Scan payload for digits if account_number string has extra characters
      const fullPayloadString = JSON.stringify({ body: req.body, query: req.query });
      const matchedDigits = fullPayloadString.match(/\b\d{3,10}\b/g) || [];

      let cleanAcc = account_number ? String(account_number).replace(/[^0-9]/g, '').trim() : '';
      if (!cleanAcc && matchedDigits.length > 0) {
        cleanAcc = matchedDigits.find(d => d.length >= 4 && d.length <= 8) || matchedDigits[0];
      }

      // ── 2. Validate required fields ────────────────────────────────────────
      if (!cleanAcc) {
        logEntry.error = 'Account number is required to create a ticket.';
        return res.status(400).json({
          success: false,
          message: 'Account number is required to create a ticket.'
        });
      }

      const ticketSubject = subject || (description ? description.substring(0, 80) : 'Support Request from Messenger');
      const customerId = messenger_psid || `fb_${Date.now()}`;

      // ── 3. Find Customer by Account Number ONLY ────────────────────────────
      let { data: customer } = await supabase
        .from('customers')
        .select('*')
        .ilike('account_number', cleanAcc)
        .maybeSingle();

      if (!customer && cleanAcc.length >= 3) {
        const { data: subCustomer } = await supabase
          .from('customers')
          .select('*')
          .ilike('account_number', `%${cleanAcc}%`)
          .limit(1)
          .maybeSingle();
        customer = subCustomer;
      }

      if (!customer && messenger_psid) {
        const { data: psidCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('messenger_psid', String(messenger_psid))
          .maybeSingle();
        customer = psidCustomer;
      }

      // If account number not found — reject and do NOT create ticket
      if (!customer) {
        logEntry.error = `Account not found for cleanAcc="${cleanAcc}"`;
        return res.status(404).json({
          success: false,
          message: 'Account not found. Please check your Account Number and try again.',
          data: { account_number: cleanAcc }
        });
      }

      // Customer found — update their messenger_psid and fill in any missing info
      const updates = { messenger_psid: customerId };
      if (full_name && !customer.full_name) updates.full_name = full_name;
      if (contact_number && !customer.contact_number) updates.contact_number = contact_number;
      if (complete_address && !customer.complete_address) updates.complete_address = complete_address;
      if (nearby_landmark && !customer.nearby_landmark) updates.nearby_landmark = nearby_landmark;
      await supabase.from('customers').update(updates).eq('id', customer.id);

      // ── 4. Resolve Service Category ─────────────────────────────
      let service_category_id = null;
      if (category) {
        const { data: cat } = await supabase
          .from('service_categories')
          .select('id')
          .ilike('name', `%${category}%`)
          .maybeSingle();
        service_category_id = cat?.id || null;
      }

      if (!service_category_id) {
        const { data: defaultCat } = await supabase
          .from('service_categories')
          .select('id')
          .limit(1)
          .single();
        service_category_id = defaultCat?.id;
      }

      // ── 5. Create Ticket ───────────────────────────────────────────────────
      const ticket = await Ticket.create({
        customer_id: customer.id,
        service_category_id: service_category_id,
        priority: 'medium',
        subject: ticketSubject,
        description: description || null,
        source: 'messenger',
      });

      logEntry.result = `Ticket created: ${ticket.ticket_number}`;

      // ── 6. Respond to Botcake ──────────────────────────────────────────────
      return res.status(200).json({
        success: true,
        message: 'Ticket created successfully.',
        data: {
          ticket_number: ticket.ticket_number,
          ticket_id: ticket.id,
          customer_id: customer.id,
          customer_name: customer.full_name,
          account_number: customer.account_number,
          status: ticket.status
        }
      });

    } catch (error) {
      console.error('[Botcake Webhook Error]', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
        error: error.message
      });
    }
  }

  /**
   * POST /api/webhooks/botcake/verify
   * Checks if an account_number exists in Supabase.
   */
  async verifyAccount(req, res) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        endpoint: '/botcake/verify',
        method: req.method,
        query: req.query,
        body: req.body,
        headers: { 'x-api-key': req.headers['x-api-key'] }
      };
      recentLogs.unshift(logEntry);
      if (recentLogs.length > 20) recentLogs.pop();

      console.log('[BOTCAKE VERIFY INCOMING BODY]:', req.body);
      console.log('[BOTCAKE VERIFY INCOMING QUERY]:', req.query);
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.BOTCAKE_API_KEY) {
        logEntry.error = 'Unauthorized: Invalid API key.';
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid API key.' });
      }

      // 1. Scan req.body and req.query exhaustively for any account_number or raw digits
      const fullPayloadString = JSON.stringify({ body: req.body, query: req.query });
      console.log('[BOTCAKE VERIFY FULL PAYLOAD]:', fullPayloadString);

      let account_number = req.body?.account_number || req.query?.account_number || req.body?.account || req.query?.account;
      const messenger_psid = req.body?.messenger_psid || req.query?.messenger_psid || req.body?.user_id || req.query?.user_id;

      // Extract all numeric sequences (3-10 digits) from the entire payload string
      const matchedDigits = fullPayloadString.match(/\b\d{3,10}\b/g) || [];
      
      let rawAcc = account_number ? String(account_number).replace(/[^0-9]/g, '').trim() : '';
      if (!rawAcc && matchedDigits.length > 0) {
        rawAcc = matchedDigits.find(d => d.length >= 4 && d.length <= 8) || matchedDigits[0];
      }

      console.log(`[BOTCAKE VERIFY QUERY PARAMS]: rawAcc="${rawAcc}", psid="${messenger_psid}"`);

      let customer = null;

      // 1. Search by account_number (exact ilike)
      if (rawAcc) {
        const { data } = await supabase
          .from('customers')
          .select('id, full_name, account_number, messenger_psid')
          .ilike('account_number', rawAcc)
          .maybeSingle();
        customer = data;
      }

      // 2. Fallback: Search by substring if exact match yielded nothing
      if (!customer && rawAcc && rawAcc.length >= 3) {
        const { data } = await supabase
          .from('customers')
          .select('id, full_name, account_number, messenger_psid')
          .ilike('account_number', `%${rawAcc}%`)
          .limit(1)
          .maybeSingle();
        customer = data;
      }

      // 3. Fallback: Search by messenger_psid if account_number lookup yielded no result
      if (!customer && messenger_psid) {
        const { data } = await supabase
          .from('customers')
          .select('id, full_name, account_number, messenger_psid')
          .eq('messenger_psid', String(messenger_psid))
          .maybeSingle();
        customer = data;
      }

      // If customer found and PSID provided, persist PSID to customer record for seamless future lookups
      if (customer && messenger_psid && customer.messenger_psid !== String(messenger_psid)) {
        await supabase.from('customers').update({ messenger_psid: String(messenger_psid) }).eq('id', customer.id);
      }

      if (!customer) {
        logEntry.error = `Account NOT found for rawAcc="${rawAcc}", psid="${messenger_psid}"`;
        console.log(`[BOTCAKE VERIFY]: Account NOT found for rawAcc="${rawAcc}", psid="${messenger_psid}"`);
        return res.status(200).json({
          success: false,
          account_found: "false",
          found_account: "false",
          is_account_found: false,
          is_found: false,
          api_success: "false",
          status: "failed",
          message: 'Account not found.'
        });
      }

      logEntry.result = `Account FOUND for ${customer.full_name} (${customer.account_number})`;
      console.log(`[BOTCAKE VERIFY SUCCESS]: Account found for customer="${customer.full_name}" (${customer.account_number})`);
      return res.status(200).json({
        success: true,
        account_found: "true",
        found_account: "true",
        is_account_found: true,
        is_found: true,
        api_success: "true",
        status: "success",
        message: 'Account found successfully.',
        data: {
          customer_id: customer.id,
          full_name: customer.full_name,
          account_number: customer.account_number,
          account_found: "true",
          found_account: "true",
          is_account_found: true,
          is_found: true
        }
      });
    } catch (error) {
      console.error('[Botcake Verify Error]', error);
      return res.status(500).json({
        success: false,
        account_found: "false",
        found_account: "false",
        is_account_found: false,
        is_found: false,
        api_success: "false",
        status: "error",
        message: 'Internal server error.',
        error: error.message
      });
    }
  }
}

module.exports = new WebhookController();
