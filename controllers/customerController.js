const Customer = require('../models/Customer');
const { successResponse, serverError, notFound, badRequest } = require('../utils/response');
const { getPagination, formatPaginatedResponse } = require('../utils/pagination');
const { supabase } = require('../config/db');

class CustomerController {
  
  async getCustomers(req, res) {
    try {
      const { limit, offset, page } = getPagination(req);
      const search = req.query.search || '';
      
      const { data, total } = await Customer.getAll(limit, offset, search);
      
      return successResponse(res, 200, 'Customers retrieved successfully', 
        formatPaginatedResponse(data, total, page, limit)
      );
    } catch (error) {
      return serverError(res, error);
    }
  }

  async getCustomerById(req, res) {
    try {
      const customer = await Customer.findById(req.params.id);
      if (!customer) {
        return notFound(res, 'Customer not found');
      }

      const services = await Customer.getInstalledServices(customer.id);
      
      return successResponse(res, 200, 'Customer retrieved', {
        ...customer,
        services
      });
    } catch (error) {
      return serverError(res, error);
    }
  }

  async createCustomer(req, res) {
    try {
      // Check if account number already exists
      const existing = await Customer.findByAccountNumber(req.body.account_number);
      if (existing) {
        return badRequest(res, 'Account number already exists');
      }

      const customer = await Customer.create(req.body, req.user.id);
      
      // Add services if provided
      if (req.body.services && Array.isArray(req.body.services)) {
        const serviceInserts = req.body.services.map(categoryId => ({
          customer_id: customer.id,
          service_category_id: categoryId
        }));
        if (serviceInserts.length > 0) {
          await supabase.from('customer_services').insert(serviceInserts);
        }
      }

      return successResponse(res, 201, 'Customer created successfully', customer);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async updateCustomer(req, res) {
    try {
      const customer = await Customer.findById(req.params.id);
      if (!customer) {
        return notFound(res, 'Customer not found');
      }

      const updated = await Customer.update(req.params.id, req.body);
      
      // Update services if provided
      if (req.body.services && Array.isArray(req.body.services)) {
        await supabase.from('customer_services').delete().eq('customer_id', customer.id);
        const serviceInserts = req.body.services.map(categoryId => ({
          customer_id: customer.id,
          service_category_id: categoryId
        }));
        if (serviceInserts.length > 0) {
          await supabase.from('customer_services').insert(serviceInserts);
        }
      }

      return successResponse(res, 200, 'Customer updated successfully', updated);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async getCustomerTickets(req, res) {
    try {
      const { limit, offset, page } = getPagination(req);
      const customerId = req.params.id;

      const { data, error, count } = await supabase
        .from('tickets')
        .select(`
          *,
          service_categories!tickets_service_category_id_fkey ( name ),
          users!tickets_assigned_technician_id_fkey ( full_name )
        `, { count: 'exact' })
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const formattedData = (data || []).map(t => {
        const { service_categories: sc, users: u, ...ticket } = t;
        return {
          ...ticket,
          category_name: sc?.name,
          technician_name: u?.full_name
        };
      });

      return successResponse(res, 200, 'Customer tickets retrieved', 
        formatPaginatedResponse(formattedData, count || 0, page, limit)
      );
    } catch (error) {
      return serverError(res, error);
    }
  }
}

module.exports = new CustomerController();
