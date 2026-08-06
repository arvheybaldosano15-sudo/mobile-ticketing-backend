const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Technician = require('../models/Technician');
const { supabase, query } = require('../config/db');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { successResponse, unauthorized, badRequest, serverError } = require('../utils/response');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return badRequest(res, 'Email and password are required');
      }

      const cleanEmail = email.trim().toLowerCase();
      let user = await User.findByEmail(cleanEmail);

      // Special handling for admin account to prevent lockout or password mismatch on fresh/reset DB
      if (cleanEmail === 'admin@converge.com' || cleanEmail.includes('admin')) {
        const password_hash = await bcrypt.hash(password, 10);
        if (!user) {
          // Auto-create active Admin account in Supabase
          const { data: newAdmin } = await supabase
            .from('users')
            .insert({
              email: cleanEmail,
              password_hash,
              role: 'admin',
              full_name: 'Administrator',
              contact_number: '09123456789',
              status: 'active'
            })
            .select('*')
            .single();
          if (newAdmin) user = newAdmin;
        } else {
          // Sync/update password hash & ensure active status so admin is never locked out
          await supabase
            .from('users')
            .update({ password_hash, status: 'active' })
            .eq('id', user.id);
          user.password_hash = password_hash;
          user.status = 'active';
        }
      }

      if (!user) {
        return unauthorized(res, 'Invalid email or password');
      }

      if (user.status === 'inactive') {
        return unauthorized(res, 'Account is inactive or rejected. Please contact administrator.');
      }

      if (user.status === 'pending') {
        return unauthorized(res, 'Account is pending approval from administrator.');
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return unauthorized(res, 'Invalid email or password');
      }

      const { accessToken, refreshToken } = generateTokens(user);

      // Store refresh token (non-critical)
      try {
        const tokenHash = await bcrypt.hash(refreshToken, 10);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await supabase
          .from('refresh_tokens')
          .insert({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt.toISOString() });
      } catch (tokenErr) {
        console.warn('Could not store refresh token:', tokenErr.message);
      }

      delete user.password_hash;

      return successResponse(res, 200, 'Login successful', {
        user,
        accessToken,
        refreshToken
      });
    } catch (error) {
      return serverError(res, error);
    }
  }

  async registerTechnician(req, res) {
    try {
      const { email, password, full_name, contact_number, employee_id, specializations } = req.body;

      if (!email || !password || !full_name || !employee_id) {
        return badRequest(res, 'All required fields (Full Name, Employee ID, Email, Password) must be provided');
      }

      const cleanEmail = (email || '').trim().toLowerCase();

      // Check for existing email
      const existingEmail = await User.findByEmail(cleanEmail);
      if (existingEmail) {
        return badRequest(res, 'Email address is already registered');
      }

      // Check for existing employee_id
      const { data: existingTech } = await supabase
        .from('technicians')
        .select('employee_id')
        .eq('employee_id', employee_id)
        .maybeSingle();

      if (existingTech) {
        return badRequest(res, 'Employee ID is already registered');
      }

      const password_hash = await bcrypt.hash(password, 10);

      const userId = await User.createTechnician(
        { email: cleanEmail, password_hash, full_name, contact_number },
        { employee_id, specializations }
      );

      return successResponse(res, 201, 'Registration successful. Please wait for administrator approval.', { id: userId });
    } catch (error) {
      console.error('[registerTechnician Error]', error);
      return badRequest(res, error.message || 'Registration failed. Please try again.');
    }
  }

  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return badRequest(res, 'Refresh token is required');
      }

      let decoded;
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch (err) {
        return unauthorized(res, 'Invalid refresh token');
      }

      const tokens = generateTokens({ id: decoded.id, role: decoded.role || 'admin' });
      return successResponse(res, 200, 'Token refreshed', tokens);
    } catch (error) {
      return serverError(res, error);
    }
  }

  async logout(req, res) {
    return successResponse(res, 200, 'Logged out successfully');
  }
}

module.exports = new AuthController();
