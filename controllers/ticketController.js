const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');
const { supabase } = require('../config/db');
const { successResponse, serverError, notFound, badRequest } = require('../utils/response');
const { getPagination, formatPaginatedResponse } = require('../utils/pagination');

class TicketController {
  
  async getTickets(req, res) {
    try {
      const { limit, offset, page } = getPagination(req);
      
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        search: req.query.search
      };

      // Technicians only see their own assigned tickets unless viewing open pool
      if (req.user.role === 'technician') {
        if (req.query.view === 'mine') {
          filters.technician_id = req.user.id;
        } else if (req.query.view === 'open') {
          filters.status = 'open';
          filters.technician_id = null; // Unassigned
        } else {
           filters.technician_id = req.user.id; // default to mine
        }
      }

      const { data, total } = await Ticket.getAll(filters, limit, offset);
      
      return successResponse(res, 200, 'Tickets retrieved', 
        formatPaginatedResponse(data, total, page, limit)
      );
    } catch (error) {
      return serverError(res, error);
    }
  }

  async getTicketById(req, res) {
    try {
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) {
        return notFound(res, 'Ticket not found');
      }
      return successResponse(res, 200, 'Ticket retrieved', ticket);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async assignTechnician(req, res) {
    try {
      const { id } = req.params;
      const { technician_id } = req.body;

      const ticket = await Ticket.findById(id);
      if (!ticket) return notFound(res, 'Ticket not found');

      const updated = await Ticket.assignTechnician(id, technician_id);
      
      // Add timeline entry
      await Ticket.addUpdate(id, req.user.id, updated.status, `Assigned to technician`);

      // Notify technician only if one was assigned
      if (technician_id) {
        await Notification.create({
          user_id: technician_id,
          title: 'New Ticket Assigned',
          message: `Ticket ${updated.ticket_number} has been assigned to you.`,
          type: 'ticket',
          reference_id: id
        });
      }

      return successResponse(res, 200, 'Technician assigned', updated);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async updateTicketStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes, gps_latitude, gps_longitude, gps_address } = req.body;

      const ticket = await Ticket.findById(id);
      if (!ticket) return notFound(res, 'Ticket not found');

      let resolvedAt = status === 'resolved' ? new Date() : null;
      let closedAt = status === 'closed' ? new Date() : null;

      const updated = await Ticket.updateStatus(id, status, resolvedAt, closedAt);
      
      await Ticket.addUpdate(id, req.user.id, status, notes, {
        latitude: gps_latitude,
        longitude: gps_longitude,
        address: gps_address
      });

      // If resolved, maybe send a notification to admin or trigger chatbot feedback link
      // (Implementation depends on chatbot architecture)

      return successResponse(res, 200, 'Ticket updated successfully', updated);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async getTicketTimeline(req, res) {
    try {
      const timeline = await Ticket.getTimeline(req.params.id);
      return successResponse(res, 200, 'Timeline retrieved', timeline);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async getTicketAttachments(req, res) {
    try {
      const { data, error } = await supabase
        .from('ticket_attachments')
        .select('*')
        .eq('ticket_id', req.params.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return successResponse(res, 200, 'Attachments retrieved', data || []);
    } catch (error) {
      return serverError(res, error);
    }
  }
}

module.exports = new TicketController();
