const { supabase } = require('../config/db');
const Ticket = require('../models/Ticket');

class WebhookController {
  /**
   * POST /api/webhooks/botcake
   * Called by Botcake's JSON API block after the customer completes the chatbot flow.
   * Creates or finds the customer by messenger_psid, then creates a ticket.
   */
  async handleBotcake(req, res) {
    try {
      // ── 1. Verify API Key ──────────────────────────────────────────────────
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.BOTCAKE_API_KEY) {
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
        category    // optional: category name e.g. "Starlink Internet"
      } = req.body;

      // ── 2. Validate required fields ────────────────────────────────────────
      if (!messenger_psid || !full_name || !subject) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: messenger_psid, full_name, subject.'
        });
      }

      // ── 3. Find or Create Customer ─────────────────────────────────────────
      let customer = null;

      // Try to find existing customer by messenger PSID
      const { data: existing } = await supabase
        .from('customers')
        .select('*')
        .eq('messenger_psid', messenger_psid)
        .maybeSingle();

      if (existing) {
        customer = existing;
        // Update contact info if provided
        const updates = {};
        if (full_name)        updates.full_name = full_name;
        if (contact_number)   updates.contact_number = contact_number;
        if (complete_address) updates.complete_address = complete_address;
        if (nearby_landmark)  updates.nearby_landmark = nearby_landmark;
        if (Object.keys(updates).length > 0) {
          await supabase.from('customers').update(updates).eq('id', customer.id);
        }
      } else {
        // Create a new customer record
        const { data: newCustomer, error: createErr } = await supabase
          .from('customers')
          .insert({
            messenger_psid,
            full_name:        full_name || 'Unknown',
            contact_number:   contact_number || null,
            complete_address: complete_address || null,
            nearby_landmark:  nearby_landmark || null,
            account_number:   account_number || null,
          })
          .select()
          .single();

        if (createErr) throw createErr;
        customer = newCustomer;
      }

      // ── 4. Resolve Service Category (optional) ─────────────────────────────
      let service_category_id = null;
      if (category) {
        const { data: cat } = await supabase
          .from('service_categories')
          .select('id')
          .ilike('name', `%${category}%`)
          .maybeSingle();
        service_category_id = cat?.id || null;
      }

      // ── 5. Create Ticket ───────────────────────────────────────────────────
      const ticket = await Ticket.create({
        customer_id:         customer.id,
        service_category_id: service_category_id,
        priority:            'normal',
        subject:             subject,
        description:         description || null,
        source:              'messenger',
      });

      // ── 6. Respond to Botcake ──────────────────────────────────────────────
      return res.status(200).json({
        success: true,
        message: 'Ticket created successfully.',
        data: {
          ticket_number: ticket.ticket_number,
          ticket_id:     ticket.id,
          customer_id:   customer.id,
          status:        ticket.status
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
}

module.exports = new WebhookController();
