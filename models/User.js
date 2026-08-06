const { supabase, query } = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  static async findByEmail(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!error && data) return data;
    } catch (e) {
      console.warn('[User.findByEmail] Supabase query error, fallback to PG query:', e.message);
    }
    
    try {
      const { rows } = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (rows && rows.length > 0) return rows[0];
    } catch (e) {
      // Fallback
    }

    return null;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, full_name, contact_number, avatar_url, status, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async updateProfile(id, { full_name, contact_number }) {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...(full_name && { full_name }),
        ...(contact_number && { contact_number }),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, email, role, full_name, contact_number, avatar_url')
      .single();

    if (error) throw error;
    return data;
  }

  static async updateAvatar(id, avatarUrl) {
    const { data, error } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('avatar_url')
      .single();

    if (error) throw error;
    return data;
  }

  static async updatePassword(id, newPasswordHash) {
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Creates a user row AND a technician profile row in a single operation.
   * Returns the newly created user's id.
   */
  static async createTechnician(userData, technicianData) {
    const newUserId = uuidv4();

    // Convert specializations string (e.g. "starkink" or "Fiber, CCTV") into a PostgreSQL array
    let specArray = [];
    if (Array.isArray(technicianData.specializations)) {
      specArray = technicianData.specializations;
    } else if (typeof technicianData.specializations === 'string' && technicianData.specializations.trim()) {
      specArray = technicianData.specializations
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }

    // 1. Insert user into users table via Supabase REST API
    const { data: userRows, error: userError } = await supabase
      .from('users')
      .insert({
        id: newUserId,
        email: userData.email,
        password_hash: userData.password_hash,
        role: 'technician',
        full_name: userData.full_name,
        contact_number: userData.contact_number || '',
        status: 'pending'
      })
      .select('id');

    if (userError) {
      console.error('[createTechnician] Supabase user insert error:', userError);
      throw new Error(userError.message || userError.details || 'Failed to create user account');
    }

    const userId = userRows && userRows.length > 0 ? userRows[0].id : newUserId;

    // 2. Insert technician profile into technicians table with array-formatted specializations
    const { error: techError } = await supabase
      .from('technicians')
      .insert({
        user_id: userId,
        employee_id: technicianData.employee_id,
        specializations: specArray,
        approval_status: 'pending'
      });

    if (techError) {
      console.error('[createTechnician] Supabase technician insert error:', techError);
      // Clean up user row if technician creation fails
      await supabase.from('users').delete().eq('id', userId);
      throw new Error(techError.message || techError.details || 'Failed to create technician profile');
    }

    return userId;
  }
}

module.exports = User;
