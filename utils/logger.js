const morgan = require('morgan');

// Configure morgan format
const morganFormat = ':method :url :status :res[content-length] - :response-time ms';

// Basic logger object for manual logging
const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, Object.keys(meta).length ? meta : '');
  },
  error: (message, error = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, Object.keys(meta).length ? meta : '');
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, Object.keys(meta).length ? meta : '');
    }
  }
};

module.exports = {
  morganMiddleware: morgan(morganFormat),
  logger
};
