const { supabase } = require('../config/db');

class Settings {
  static async get(key) {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    return data ? data.value : null;
  }

  static async getAll() {
    const { data, error } = await supabase
      .from('settings')
      .select('*');
    if (error) throw error;
    const settings = {};
    (data || []).forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  }

  static async set(key, value, userId = null) {
    const stringifiedValue = JSON.stringify(value);
    // Supabase upsert (conflict on key)
    const { data, error } = await supabase
      .from('settings')
      .upsert(
        { key, value: stringifiedValue, updated_by: userId, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getServiceCategories() {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }
}

module.exports = Settings;
