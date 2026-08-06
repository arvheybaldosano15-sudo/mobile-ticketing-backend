const { validationResult } = require('express-validator');
const { badRequest } = require('../utils/response');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors nicely
    const formattedErrors = {};
    errors.array().forEach(err => {
      formattedErrors[err.path] = err.msg;
    });
    
    return badRequest(res, 'Validation failed', formattedErrors);
  }
  next();
};

module.exports = {
  validate
};
