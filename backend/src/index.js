require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const conversationRouter = require('./routes/conversation');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;

// ── Rate limiting ─────────────────────────────────────────────────────────────

// General limiter for all routes (protects static files and health endpoint)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// Stricter limiter for conversation-start (creates a new session)
const startLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many new conversations. Please wait a moment.' },
});

app.use(generalLimiter);

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(
  cors({
    // In production the frontend is served by this same server.
    // In development the Vite dev server (port 5173) talks to this server.
    origin: process.env.NODE_ENV === 'production' ? false : true,
    methods: ['GET', 'POST', 'DELETE'],
  })
);

app.use(express.json({ limit: '10kb' }));

// ── API routes ────────────────────────────────────────────────────────────────

app.use('/api/conversation/start', startLimiter);
app.use('/api/conversation', conversationRouter);

// Health check
app.get('/api/health', (_req, res) =>
  res.json({
    status: 'ok',
    mockAi: process.env.MOCK_AI !== 'false',
  })
);

// ── Serve React frontend in production ───────────────────────────────────────

const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(FRONTEND_DIST));

  // SPA fallback — send index.html for any non-API route
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
    }
  });
}

// ── Start server ──────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const mode = process.env.MOCK_AI !== 'false' ? 'MOCK' : 'LIVE';
  console.log(
    `Two Truths and AI backend running on http://localhost:${PORT}  [AI mode: ${mode}]`
  );
  if (process.env.NODE_ENV !== 'production') {
    console.log('CORS enabled — expecting frontend at http://localhost:5173');
  }
});

module.exports = app;
