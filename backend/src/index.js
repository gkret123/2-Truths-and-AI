require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const gameRouter = require('./routes/game');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;

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

app.use('/api/game', gameRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

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
  console.log(`Spot the Lie backend running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('CORS enabled — expecting frontend at http://localhost:5173');
  }
});

module.exports = app;
