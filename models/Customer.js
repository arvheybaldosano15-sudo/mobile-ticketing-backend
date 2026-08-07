const { supabase } = require('../config/db');

class Customer {
  static async findByAccountNumber(accountNumber) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('account_number', accountNumber)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async create(data, createdById) {
    const { account_number, full_name, complete_address, nearby_landmark, contact_number } = data;
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({ account_number, full_name, complete_address, nearby_landmark, contact_number, created_by: createdById })
      .select()
      .single();
    if (error) throw error;
    return customer;
  }

  static async update(id, data) {
    const { full_name, complete_address, nearby_landmark, contact_number, account_number } = data;
    const updates = {
      ...(account_number !== undefined && { account_number }),
      ...(full_name !== undefined && { full_name }),
      ...(complete_address !== undefined && { complete_address }),
      ...(nearby_landmark !== undefined && { nearby_landmark }),
      ...(contact_number !== undefined && { contact_number }),
      updated_at: new Date().toISOString()
    };
    const { data: customer, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return customer;
  }

  static async getAll(limit, offset, search = '') {
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,account_number.ilike.%${search}%,contact_number.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  }

  static async getInstalledServices(customerId) {
    const { data, error } = await supabase
      .from('customer_services')
      .select(`
        id,
        installation_date,
        status,
        notes,
        service_categories!customer_services_service_category_id_fkey (
          id,
          name
        )
      `)
      .eq('customer_id', customerId);

    if (error) throw error;
    return (data || []).map(cs => {
      const { service_categories: cat, ...service } = cs;
      return {
        ...service,
        category_name: cat?.name,
        category_id: cat?.id
      };
    });
  }

  static async hasService(customerId, categoryId) {
    const { data, error } = await supabase
      .from('customer_services')
      .select('id')
      .eq('customer_id', customerId)
      .eq('service_category_id', categoryId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }

  static async delete(id) {
    // 1. Get all tickets for this customer
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id')
      .eq('customer_id', id);

    if (tickets && tickets.length > 0) {
      const ticketIds = tickets.map(t => t.id);
      // Delete ticket updates & attachments
      await supabase.from('ticket_updates').delete().in('ticket_id', ticketIds);
      await supabase.from('ticket_attachments').delete().in('ticket_id', ticketIds);
      // Delete tickets
      await supabase.from('tickets').delete().eq('customer_id', id);
    }

    // 2. Delete customer services
    await supabase.from('customer_services').delete().eq('customer_id', id);

    // 3. Delete customer
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
}

module.exports = Customer;
