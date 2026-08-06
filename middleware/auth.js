const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../utils/response');

const verifyToken = (req, res, next) => {
  let token = req.headers.authorization;
  
  if (!token || !token.startsWith('Bearer ')) {
    return unauthorized(res, 'No token provided or invalid format');
  }

  token = token.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, email }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token expired');
    }
    return unauthorized(res, 'Invalid token');
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return forbidden(res, 'Admin privileges required');
  }
};

const requireTechnician = (req, res, next) => {
  if (req.user && req.user.role === 'technician') {
    next();
  } else {
    return forbidden(res, 'Technician privileges required');
  }
};

const requireAnyRole = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'technician')) {
    next();
  } else {
    return forbidden(res, 'Access denied');
  }
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireTechnician,
  requireAnyRole
};
