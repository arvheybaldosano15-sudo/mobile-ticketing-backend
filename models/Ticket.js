const { supabase } = require('../config/db');

class Ticket {
  static async create(data) {
    const {
      customer_id, service_category_id, priority, subject, description, source,
      ai_priority_recommendation, ai_estimated_resolution_hours, ai_classification_confidence
    } = data;

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        customer_id, service_category_id, priority, subject, description, source,
        ai_priority_recommendation, ai_estimated_resolution_hours, ai_classification_confidence
      })
      .select()
      .single();

    if (error) throw error;
    return ticket;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        customers!tickets_customer_id_fkey (
          full_name,
          account_number,
          contact_number,
          complete_address
        ),
        service_categories!tickets_service_category_id_fkey (
          name,
          color_code
        ),
        users!tickets_assigned_technician_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const { customers, service_categories, users: tech, ...ticket } = data;
    return {
      ...ticket,
      customer_name: customers?.full_name,
      account_number: customers?.account_number,
      contact_number: customers?.contact_number,
      complete_address: customers?.complete_address,
      category_name: service_categories?.name,
      category_color: service_categories?.color_code,
      technician_name: tech?.full_name,
      technician_avatar: tech?.avatar_url
    };
  }

  static async updateStatus(id, status, resolvedAt = null, closedAt = null) {
    const updates = {
      status,
      updated_at: new Date().toISOString(),
      ...(resolvedAt && { resolved_at: resolvedAt }),
      ...(closedAt && { closed_at: closedAt })
    };

    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async assignTechnician(id, technicianId) {
    // First get current status to decide new status
    const { data: current } = await supabase
      .from('tickets')
      .select('status')
      .eq('id', id)
      .single();

    const newStatus = current?.status === 'open' ? 'in_progress' : current?.status;

    const { data, error } = await supabase
      .from('tickets')
      .update({
        assigned_technician_id: technicianId,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async addUpdate(ticketId, userId, statusChangedTo, notes, gpsData = {}) {
    const { latitude, longitude, address } = gpsData;

    const { data, error } = await supabase
      .from('ticket_updates')
      .insert({
        ticket_id: ticketId,
        updated_by: userId,
        status_changed_to: statusChangedTo,
        notes,
        gps_latitude: latitude || null,
        gps_longitude: longitude || null,
        gps_address: address || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getAll(filters, limit, offset) {
    let query = supabase
      .from('tickets')
      .select(`
        id,
        ticket_number,
        priority,
        status,
        subject,
        created_at,
        sla_deadline,
        customers!tickets_customer_id_fkey ( full_name ),
        service_categories!tickets_service_category_id_fkey ( name ),
        users!tickets_assigned_technician_id_fkey ( full_name )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.priority) query = query.eq('priority', filters.priority);
    if (filters.technician_id) {
      if (filters.technician_id === null) {
        query = query.is('assigned_technician_id', null);
      } else {
        query = query.eq('assigned_technician_id', filters.technician_id);
      }
    }
    if (filters.search) {
      query = query.or(`ticket_number.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const flatData = (data || []).map(t => {
      const { customers, service_categories, users: tech, ...ticket } = t;
      return {
        ...ticket,
        customer_name: customers?.full_name,
        category_name: service_categories?.name,
        technician_name: tech?.full_name
      };
    });

    return { data: flatData, total: count || 0 };
  }

  static async getTimeline(ticketId) {
    const { data, error } = await supabase
      .from('ticket_updates')
      .select(`
        *,
        users!ticket_updates_updated_by_fkey (
          full_name,
          role,
          avatar_url
        )
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(u => {
      const { users: updater, ...update } = u;
      return {
        ...update,
        updater_name: updater?.full_name,
        updater_role: updater?.role,
        avatar_url: updater?.avatar_url
      };
    });
  }
}

module.exports = Ticket;
