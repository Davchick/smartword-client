const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const { securityHeaders } = require('./middleware/securityHeaders');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Security first: Apply security headers to ALL routes
app.use(securityHeaders);

// CORS configuration - restrict to known origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('[CORS] Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' })); // Limit body size

// Healthcheck (no rate limiting for health checks)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Apply rate limiting to API routes
app.use('/auth', require('./middleware/rateLimiter').authLimiter);
app.use(apiLimiter);

const authRouter = require('./modules/auth/auth.routes');
const profileRouter = require('./modules/profile/profile.routes');
const groupsRouter = require('./modules/groups/groups.routes');
const wordsRouter = require('./modules/words/words.routes');
const statsRouter = require('./modules/stats/stats.routes');
const chatRouter = require('./modules/chat/chat.routes');
const billingRouter = require('./modules/billing/billing.routes');

app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/groups', groupsRouter);
app.use('/words', wordsRouter);
app.use('/stats', statsRouter);
app.use('/chat', chatRouter);
app.use('/billing', billingRouter);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Telegram bot long-polling
const { startPolling } = require('./modules/support/telegram.polling');
startPolling();

const port = env.port;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on port ${port}`);
});

