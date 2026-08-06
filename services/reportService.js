const { jsPDF } = require('jspdf');
const ExcelJS = require('exceljs');
const { supabase } = require('../config/db');

class ReportService {
  async generateTicketExcel(startDate, endDate) {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        ticket_number,
        priority,
        status,
        subject,
        created_at,
        resolved_at,
        customers!tickets_customer_id_fkey ( full_name, account_number ),
        service_categories!tickets_service_category_id_fkey ( name ),
        users!tickets_assigned_technician_id_fkey ( full_name )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (tickets || []).map(t => ({
      ticket_number: t.ticket_number,
      customer_name: t.customers?.full_name,
      account_number: t.customers?.account_number,
      service_category: t.service_categories?.name,
      priority: t.priority,
      status: t.status,
      technician_name: t.users?.full_name,
      created_at: t.created_at,
      resolved_at: t.resolved_at
    }));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tickets');
    
    sheet.columns = [
      { header: 'Ticket #', key: 'ticket_number', width: 15 },
      { header: 'Customer', key: 'customer_name', width: 25 },
      { header: 'Account #', key: 'account_number', width: 15 },
      { header: 'Category', key: 'service_category', width: 20 },
      { header: 'Priority', key: 'priority', width: 10 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Technician', key: 'technician_name', width: 25 },
      { header: 'Created', key: 'created_at', width: 20 },
      { header: 'Resolved', key: 'resolved_at', width: 20 }
    ];

    rows.forEach(row => {
      sheet.addRow({
        ...row,
        created_at: new Date(row.created_at).toLocaleString(),
        resolved_at: row.resolved_at ? new Date(row.resolved_at).toLocaleString() : ''
      });
    });

    return await workbook.xlsx.writeBuffer();
  }

  async generateServiceReportPDF(ticketId) {
    const doc = new jsPDF();
    doc.text(`Service Report for Ticket: ${ticketId}`, 10, 10);
    return doc.output('arraybuffer');
  }
}

module.exports = new ReportService();
