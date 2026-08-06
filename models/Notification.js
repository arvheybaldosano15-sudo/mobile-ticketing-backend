const { supabase } = require('../config/db');

let io = null;
try {
  const socketConfig = require('../config/socket');
  io = socketConfig.getIO ? socketConfig.getIO() : null;
} catch (e) {
  // Socket not configured — notifications will still save to DB
}

class Notification {
  static async create(data) {
    const { user_id, title, message, type, reference_id } = data;

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({ user_id, title, message, type, reference_id })
      .select()
      .single();

    if (error) throw error;

    // Emit real-time socket event if IO is available
    try {
      const { getIO } = require('../config/socket');
      const ioInstance = getIO();
      if (ioInstance) {
        ioInstance.to(user_id).emit('new_notification', notification);
      }
    } catch (e) {
      // Socket not configured, skip
    }

    return notification;
  }

  static async getUserNotifications(userId, limit = 50, offset = 0) {
    const { data, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return {
      data: data || [],
      total: count || 0,
      unread: unreadCount || 0
    };
  }

  static async markAsRead(id, userId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async markAllAsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return { success: true };
  }
}

module.exports = Notification;
