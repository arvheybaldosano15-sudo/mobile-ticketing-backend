const { supabase } = require('../config/db');

class Feedback {
  static async submit(ticketId, customerId, rating, comments) {
    const { data, error } = await supabase
      .from('feedback')
      .insert({ ticket_id: ticketId, customer_id: customerId, rating, comments })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async findByTicketId(ticketId) {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('ticket_id', ticketId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async getStats() {
    const { data, error } = await supabase
      .from('feedback')
      .select('rating');
    if (error) throw error;

    const rows = data || [];
    const total = rows.length;
    const sum = rows.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avg = total > 0 ? (sum / total).toFixed(1) : '0.0';

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    rows.forEach(r => {
      if (distribution[r.rating] !== undefined) distribution[r.rating]++;
    });

    return {
      average_rating: parseFloat(avg),
      total_feedback: total,
      distribution
    };
  }
}

module.exports = Feedback;
