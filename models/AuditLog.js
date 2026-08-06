const { supabase } = require('../config/db');

class AuditLog {
  static async log(action, entityType, entityId, newValues = null, oldValues = null, performedBy = null, ipAddress = null) {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          action,
          entity_type: entityType,
          entity_id: entityId,
          new_values: newValues ? JSON.stringify(newValues) : null,
          old_values: oldValues ? JSON.stringify(oldValues) : null,
          performed_by: performedBy,
          ip_address: ipAddress
        });

      if (error) throw error;
    } catch (e) {
      console.error('Failed to write audit log:', e);
      // Never throw — logging failure shouldn't break main execution
    }
  }

  static async getLogs(filters, limit = 50, offset = 0) {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        users!audit_logs_performed_by_fkey (
          full_name,
          email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.action) query = query.eq('action', filters.action);
    if (filters.entityType) query = query.eq('entity_type', filters.entityType);
    if (filters.performedBy) query = query.eq('performed_by', filters.performedBy);

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = (data || []).map(log => {
      const { users: performer, ...entry } = log;
      return {
        ...entry,
        performed_by_name: performer?.full_name,
        performed_by_email: performer?.email
      };
    });

    return { data: rows, total: count || 0 };
  }
}

module.exports = AuditLog;
