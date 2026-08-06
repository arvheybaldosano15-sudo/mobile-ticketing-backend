const { supabase } = require('../config/db');
const { calculateSLA } = require('../utils/dateHelpers');

class TicketService {
  async checkForDuplicates(customerId, serviceCategoryId) {
    // A duplicate is an open or in-progress ticket for the same customer and service category
    const { data, error } = await supabase
      .from('tickets')
      .select('id, ticket_number')
      .eq('customer_id', customerId)
      .eq('service_category_id', serviceCategoryId)
      .in('status', ['open', 'in_progress', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    return (data && data.length > 0) ? data[0] : null;
  }

  async generateTicketNumber() {
    return null; 
  }

  getSLAForPriority(priority) {
    return calculateSLA(priority);
  }
}

module.exports = new TicketService();
