const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');

const app = express();

// Only enable this when actually deployed behind a reverse proxy/load
// balancer (Render, Railway, nginx, ...) that sets X-Forwarded-For itself —
// otherwise a client could set that header directly and spoof its own IP,
// defeating the rate limiter below. See server/.env.example.
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Security headers (CSP, X-Content-Type-Options, no X-Powered-By, etc.).
// This API only ever returns JSON plus the static admin pages in public/,
// so a fairly strict default policy is safe here.
app.use(helmet());

// Only the site itself (and localhost during development) may call this API
// from a browser — an open cors() would let any other website's script read
// responses from a signed-in admin's browser via a cross-origin fetch.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    // No Origin header (curl, server-to-server, same-origin) — allow.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (!allowedOrigins.length && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true); // local dev fallback when ALLOWED_ORIGINS isn't set yet
    }
    return callback(new Error('Not allowed by CORS'));
  },
}));

app.use(express.json({ limit: '1mb' }));

// Blunt brute-force/credential-stuffing attempts against /api/login: a real
// user mistyping a password a handful of times is unaffected, a script
// trying thousands of passwords is not.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a few minutes.' },
});

// A looser limit across the whole API as a general backstop against abuse
// (scraping, scripted mass-creation, etc.) beyond the login-specific one.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use('/api/login', loginLimiter);
app.use('/api', authRoutes);
app.use('/api/services', servicesRoutes);

// Serve the adapted admin pages (index / login / dashboard) as static files.
app.use(express.static(path.join(__dirname, '..', 'public')));

// Centralized error handler — every route below is wrapped with the
// asyncHandler helper (see routes/*.js), which forwards a thrown/rejected
// error here instead of leaving it as an unhandled rejection. Never leak
// internal error details (stack traces, DB error text) to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed.' });
  }
  console.error(err);
  res.status(err.status || 500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
