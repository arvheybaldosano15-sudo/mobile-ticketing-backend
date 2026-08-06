const Settings = require('../models/Settings');
const User = require('../models/User');
const { supabase } = require('../config/db');
const { successResponse, serverError, badRequest } = require('../utils/response');
const reportService = require('../services/reportService');
const aiService = require('../services/aiService');

class AdminController {
  
  async getDashboardStats(req, res) {
    try {
      // 1. Fetch tickets safely
      const { data: allTickets, error: ticketErr } = await supabase
        .from('tickets')
        .select('status, priority, created_at, service_category_id');

      if (ticketErr) {
        console.error('Error fetching tickets for dashboard stats:', ticketErr);
      }

      // Fetch categories for mapping
      const { data: categories } = await supabase
        .from('service_categories')
        .select('id, name');
      
      const categoryMap = {};
      (categories || []).forEach(c => { categoryMap[c.id] = c.name; });

      const ticketStats = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
      const priorityStats = { high: 0, medium: 0, low: 0 };
      const categoryStats = {};

      // Build monthly trend buckets for last 6 months
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const now = new Date();
      const monthlyMap = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = { month: monthNames[d.getMonth()], total: 0, resolved: 0, open: 0 };
      }

      (allTickets || []).forEach(t => {
        const s = (t.status || '').toLowerCase();
        const p = (t.priority || '').toLowerCase();
        const catName = categoryMap[t.service_category_id] || 'General';

        if (ticketStats[s] !== undefined) ticketStats[s]++;
        if (priorityStats[p] !== undefined) priorityStats[p]++;
        categoryStats[catName] = (categoryStats[catName] || 0) + 1;

        // Monthly trend
        if (t.created_at) {
          const d = new Date(t.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyMap[key]) {
            monthlyMap[key].total++;
            if (s === 'resolved' || s === 'closed') monthlyMap[key].resolved++;
            if (s === 'open') monthlyMap[key].open++;
          }
        }
      });

      const monthlyTrends = Object.values(monthlyMap);

      // 2. Active technicians count
      let activeTechCount = 0;
      let pendingTechCount = 0;
      let pendingList = [];

      try {
        const { count: activeCount } = await supabase
          .from('technicians')
          .select('user_id', { count: 'exact', head: true })
          .eq('approval_status', 'approved');
        activeTechCount = activeCount || 0;

        const { count: pendingCount } = await supabase
          .from('technicians')
          .select('user_id', { count: 'exact', head: true })
          .eq('approval_status', 'pending');
        pendingTechCount = pendingCount || 0;

        const { data: pendingTechsData } = await supabase
          .from('technicians')
          .select('user_id, employee_id, specializations, date_applied')
          .eq('approval_status', 'pending')
          .limit(5);

        if (pendingTechsData && pendingTechsData.length > 0) {
          const userIds = pendingTechsData.map(pt => pt.user_id).filter(Boolean);
          const { data: usersData } = await supabase
            .from('users')
            .select('id, full_name, email')
            .in('id', userIds);

          const userMap = {};
          (usersData || []).forEach(u => { userMap[u.id] = u; });

          pendingList = pendingTechsData.map(t => ({
            user_id: t.user_id,
            employee_id: t.employee_id,
            specializations: t.specializations,
            date_applied: t.date_applied,
            full_name: userMap[t.user_id]?.full_name || 'Technician Applicant',
            email: userMap[t.user_id]?.email || ''
          }));
        }
      } catch (techErr) {
        console.error('Technicians stats error:', techErr);
      }

      const stats = {
        tickets: ticketStats,
        priorities: priorityStats,
        categories: categoryStats,
        monthly_trends: monthlyTrends,
        active_technicians: activeTechCount,
        pending_technicians: pendingTechCount,
        pending_list: pendingList
      };

      // Optionally fetch AI recommendation for dashboard
      let aiRecommendation = null;
      if (req.query.includeAi === 'true') {
        try {
          aiRecommendation = await aiService.getAdminRecommendations(stats);
        } catch (aiErr) {
          console.error('AI Recommendation Error:', aiErr);
        }
      }

      return successResponse(res, 200, 'Dashboard stats retrieved', { stats, aiRecommendation });
    } catch (error) {
      console.error('getDashboardStats Error:', error);
      return serverError(res, error);
    }
  }

  async getSettings(req, res) {
    try {
      const settings = await Settings.getAll();
      return successResponse(res, 200, 'Settings retrieved', settings);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async updateSettings(req, res) {
    try {
      const updates = req.body;
      const results = [];
      
      for (const [key, value] of Object.entries(updates)) {
        const updated = await Settings.set(key, value, req.user.id);
        results.push(updated);
      }

      return successResponse(res, 200, 'Settings updated', results);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async exportTicketsReport(req, res) {
    try {
      const { startDate, endDate, format = 'excel' } = req.query;
      
      if (!startDate || !endDate) {
        return badRequest(res, 'Start date and end date are required');
      }

      if (format === 'excel') {
        const buffer = await reportService.generateTicketExcel(startDate, endDate);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=tickets-report-${startDate}-to-${endDate}.xlsx`);
        
        return res.status(200).send(buffer);
      } else {
        return badRequest(res, 'Unsupported export format');
      }
    } catch (error) {
      return serverError(res, error);
    }
  }

  async getAuditLogs(req, res) {
    try {
      const AuditLog = require('../models/AuditLog');
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const logs = await AuditLog.getLogs({}, limit, offset);
      return successResponse(res, 200, 'Audit logs retrieved', logs);
    } catch (error) {
      return serverError(res, error);
    }
  }
}

module.exports = new AdminController();
