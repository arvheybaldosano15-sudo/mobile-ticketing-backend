const { supabase } = require('../config/db');

class Attachment {
  static async create(ticketId, ticketUpdateId, uploadedBy, fileName, fileUrl, fileType) {
    const { data, error } = await supabase
      .from('ticket_attachments')
      .insert({
        ticket_id: ticketId,
        ticket_update_id: ticketUpdateId,
        uploaded_by: uploadedBy,
        file_name: fileName,
        file_url: fileUrl,
        file_type: fileType
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getByTicketId(ticketId) {
    const { data, error } = await supabase
      .from('ticket_attachments')
      .select(`
        *,
        users!ticket_attachments_uploaded_by_fkey ( full_name )
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(a => {
      const { users: uploader, ...attachment } = a;
      return { ...attachment, uploader_name: uploader?.full_name };
    });
  }
}

module.exports = Attachment;
