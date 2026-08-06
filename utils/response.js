/**
 * Standardized API response formatters
 */

const successResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

// Common error responses
const serverError = (res, error) => {
  console.error('[Server Error Detail]', error);
  const detailMessage = error?.message || error?.details || (typeof error === 'string' ? error : 'Internal server error');
  return errorResponse(res, 500, detailMessage);
};

const badRequest = (res, message = 'Bad request', errors = null) => {
  return errorResponse(res, 400, message, errors);
};

const unauthorized = (res, message = 'Unauthorized') => {
  return errorResponse(res, 401, message);
};

const forbidden = (res, message = 'Forbidden: Insufficient permissions') => {
  return errorResponse(res, 403, message);
};

const notFound = (res, message = 'Resource not found') => {
  return errorResponse(res, 404, message);
};

module.exports = {
  successResponse,
  errorResponse,
  serverError,
  badRequest,
  unauthorized,
  forbidden,
  notFound
};
