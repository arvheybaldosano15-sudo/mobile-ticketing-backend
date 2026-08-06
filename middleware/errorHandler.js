const { serverError } = require('../utils/response');
const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.message, err);

  // If headers have already been sent, delegate to default error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle specific known errors (e.g., multer errors, JSON parsing errors)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + err.message
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload'
    });
  }

  // Fallback to generic server error response
  return serverError(res, err);
};

module.exports = errorHandler;
