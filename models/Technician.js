const { supabase } = require('../config/db');

class Technician {
  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('technicians')
      .select(`
        *,
        users!technicians_user_id_fkey (
          id,
          full_name,
          email,
          contact_number,
          avatar_url,
          status
        )
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Flatten user fields
    const { users: user, ...tech } = data;
    return {
      ...tech,
      full_name: user?.full_name,
      email: user?.email,
      contact_number: user?.contact_number,
      avatar_url: user?.avatar_url,
      user_status: user?.status,
      user_id: userId
    };
  }

  static async getAll(status = null) {
    let query = supabase
      .from('technicians')
      .select(`
        employee_id,
        specializations,
        approval_status,
        date_applied,
        user_id,
        users!technicians_user_id_fkey (
          id,
          full_name,
          email,
          contact_number,
          status
        )
      `)
      .order('date_applied', { ascending: false });

    if (status) {
      query = query.eq('approval_status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Flatten user fields into each technician object
    return (data || []).map(t => {
      const { users: user, ...tech } = t;
      return {
        ...tech,
        full_name: user?.full_name,
        email: user?.email,
        contact_number: user?.contact_number,
        user_status: user?.status
      };
    });
  }

  static async approve(userId, approvedById) {
    // Update technician approval status
    const { data: tech, error: techError } = await supabase
      .from('technicians')
      .update({
        approval_status: 'approved',
        approval_date: new Date().toISOString(),
        approved_by: approvedById
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (techError) throw techError;

    // Update user status to active
    const { error: userError } = await supabase
      .from('users')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (userError) throw userError;

    return tech;
  }

  static async reject(userId, rejectionReason, approvedById) {
    const { data: tech, error: techError } = await supabase
      .from('technicians')
      .update({
        approval_status: 'rejected',
        approval_date: new Date().toISOString(),
        approved_by: approvedById,
        rejection_reason: rejectionReason
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (techError) throw techError;

    // Set user status to inactive
    const { error: userError } = await supabase
      .from('users')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (userError) throw userError;

    return tech;
  }
}

module.exports = Technician;
