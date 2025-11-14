/**
 * Rate Limiting Middleware
 * Prevents API abuse and ensures fair resource usage
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks
  skip: (req) => {
    const path = req.path || req.originalUrl || req.url;
    return path === '/health' || path === '/api/health' || path.endsWith('/health');
  },
  // Custom handler
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Strict rate limiter for expensive operations
 * 20 requests per 15 minutes per IP
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests for this resource, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Analytics endpoint rate limiter
 * 50 requests per 15 minutes per IP (analytics can be expensive)
 */
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: 'Too many analytics requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const path = req.path || req.originalUrl || req.url;
    return path === '/health' || path === '/api/health' || path.endsWith('/health');
  }
});

module.exports = {
  apiLimiter,
  strictLimiter,
  analyticsLimiter
};

