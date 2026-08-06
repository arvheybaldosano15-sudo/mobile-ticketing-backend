const rateLimit = require('express-rate-limit');

// ── General API limiter (dashboard, tickets, customers, etc.)
// 1,000 requests per 15-minute window — generous enough for an internal admin portal
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15 minutes
  limit: 1000,                    // was 100 → bumped to 1,000
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for internal loopback / trusted origins
    const origin = req.headers.origin || '';
    const referer = req.headers.referer || '';
    const isLocal =
      req.ip === '127.0.0.1' ||
      req.ip === '::1' ||
      origin.includes('localhost') ||
      referer.includes('localhost');
    return isLocal;
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

// ── Auth limiter (login / register) — keep strict
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15 minutes
  limit: 20,                      // was 10 → bumped slightly for dev
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes'
  }
});

module.exports = {
  apiLimiter,
  authLimiter
};
