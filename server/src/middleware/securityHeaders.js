const helmet = require('helmet');

/**
 * Security headers middleware using Helmet.
 * Protects against common web vulnerabilities.
 */
const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.telegram.org', 'https://openrouter.ai'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // XSS Protection
  xssFilter: true,
  
  // Prevent clickjacking
  frameguard: {
    action: 'deny',
  },
  
  // HSTS (force HTTPS)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false,
  },
  
  // IE Download Options
  ieNoOpen: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: true,
  
  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: true,
  
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: {
    policy: 'same-site',
  },
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Permitted Cross-Origin Policies
  permittedCrossOriginPolicies: true,
});

module.exports = { securityHeaders };
