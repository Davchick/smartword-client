const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication endpoints.
 * Prevents brute force attacks and credential stuffing.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { 
    error: 'Too many authentication attempts',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  // Use built-in IP handling (works with IPv4 and IPv6)
});

/**
 * Rate limiter for password reset endpoint.
 * Prevents email flooding attacks.
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: { 
    error: 'Too many password reset requests',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for refresh token endpoint.
 * Prevents token brute forcing.
 */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 refresh attempts per window
  message: { 
    error: 'Too many token refresh attempts',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter for other endpoints.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { 
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive operations.
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: { 
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  passwordResetLimiter,
  refreshLimiter,
  apiLimiter,
  strictLimiter,
};
