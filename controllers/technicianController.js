const Technician = require('../models/Technician');
const db = require('../config/db');
const { successResponse, serverError, notFound, badRequest } = require('../utils/response');

class TechnicianController {
  
  async getTechnicians(req, res) {
    try {
      const status = req.query.status || null; // pending, approved, rejected
      const technicians = await Technician.getAll(status);
      
      return successResponse(res, 200, 'Technicians retrieved', technicians);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async getTechnicianById(req, res) {
    try {
      const technician = await Technician.findByUserId(req.params.id);
      if (!technician) {
        return notFound(res, 'Technician not found');
      }
      return successResponse(res, 200, 'Technician retrieved', technician);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async approveTechnician(req, res) {
    try {
      const { id } = req.params; // this is user_id
      
      const technician = await Technician.findByUserId(id);
      if (!technician) return notFound(res, 'Technician not found');
      
      if (technician.approval_status === 'approved') {
        return badRequest(res, 'Technician is already approved');
      }

      const updated = await Technician.approve(id, req.user.id);
      
      return successResponse(res, 200, 'Technician approved successfully', updated);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async rejectTechnician(req, res) {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;

      if (!rejection_reason) {
        return badRequest(res, 'Rejection reason is required');
      }

      const technician = await Technician.findByUserId(id);
      if (!technician) return notFound(res, 'Technician not found');

      const updated = await Technician.reject(id, rejection_reason, req.user.id);
      
      return successResponse(res, 200, 'Technician rejected', updated);
    } catch (error) {
      return serverError(res, error);
    }
  }
}

module.exports = new TechnicianController();
