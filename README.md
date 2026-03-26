# Spot the Lie — 2 Truths and AI

An interactive museum kiosk experience exploring the erosion of shared reality in the age of AI.

Players are given a topic and must identify which of three AI-generated statements is the lie — all written in the same convincing style.

---

## Features

- 5 rounds per game, all generated upfront via OpenAI
- 15-second countdown timer per round
- Automatic scoring and win/loss verdict (≥ 4/5 to win)
- Session state stored server-side (no cookies/localStorage required)
- Topic sanitization and content blocklist
- Minimalist dark design — readable on a museum kiosk display
- Accessible: keyboard-navigable, ARIA roles, focus management
- Easy to reset for the next visitor

---

## Project Structure

```
2-Truths-and-AI/
├── backend/                 # Express API
│   ├── src/
│   │   ├── index.js         # Server entry point
│   │   ├── routes/
│   │   │   └── game.js      # Game API routes
│   │   ├── services/
│   │   │   ├── aiService.js     # OpenAI round generation
│   │   │   └── sessionService.js # In-memory session store
│   │   └── utils/
│   │       └── sanitize.js  # Topic sanitization
│   ├── .env.example
│   └── package.json
│
└── frontend/                # React + Vite app
    ├── src/
    │   ├── App.jsx           # State machine / screen router
    │   ├── App.css           # All styles
    │   ├── main.jsx
    │   └── components/
    │       ├── LandingScreen.jsx
    │       ├── GameScreen.jsx
    │       ├── RoundResult.jsx
    │       └── FinalScreen.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Prerequisites

- **Node.js** 18 or later
- An **OpenAI API key** with access to `gpt-4o-mini` (or `gpt-3.5-turbo` — update `aiService.js` if needed)

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/gkret123/2-Truths-and-AI.git
cd 2-Truths-and-AI
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
# Required — your OpenAI API key
OPENAI_API_KEY=sk-...

# Optional — port the backend listens on (default: 3001)
PORT=3001

# Optional — session TTL in milliseconds (default: 30 minutes)
SESSION_TTL_MS=1800000
```

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Install frontend dependencies

```bash
cd ../frontend
npm install
```

---

## Running in Development

You need **two terminals**.

**Terminal 1 — backend:**

```bash
cd backend
npm run dev
# Server running on http://localhost:3001
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev
# Vite dev server on http://localhost:5173
# API requests to /api are proxied to the backend automatically
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running in Production

Build the frontend, then start only the backend (it serves the built frontend):

```bash
cd frontend
npm run build      # outputs to frontend/dist/

cd ../backend
NODE_ENV=production npm start
# Open http://localhost:3001
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/game/start` | Start a game. Body: `{ topic }`. Returns `{ sessionId, totalRounds, topic }` |
| `GET` | `/api/game/:sessionId/round/:roundNumber` | Get a round's statements (1-based). The `lieId` is **never** sent to the client. |
| `POST` | `/api/game/:sessionId/answer` | Submit an answer. Body: `{ roundNumber, selectedId }`. `selectedId` is `null` on timer expiry. Returns `{ correct, lieId, lieText, score, completed }` |
| `DELETE` | `/api/game/:sessionId` | Delete a session (reset for next visitor). |
| `GET` | `/api/health` | Health check. |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ | — | Your OpenAI API key |
| `PORT` | No | `3001` | Backend server port |
| `SESSION_TTL_MS` | No | `1800000` | Session expiry in ms (30 min) |

---

## Kiosk Deployment Tips

- Set `SESSION_TTL_MS=600000` (10 min) so sessions expire faster between visitors.
- Run with `NODE_ENV=production` so the backend serves the built React app.
- Consider a process manager like PM2: `pm2 start backend/src/index.js --name spot-the-lie`
- For full-screen kiosk mode, launch Chromium with `--kiosk http://localhost:3001`
