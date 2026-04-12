# Two Truths and AI

An interactive installation about how AI sees you — and how it doesn't.

The participant is interviewed by an AI. They tell it two truths and one lie about themselves. The AI tries to find the lie. It cannot detect deception. Instead, it picks the statement that least resembles the patterns it has learned from millions of other people. It may not be wrong. It may simply be revealing what it cannot recognize as possible.

The piece exists to make people think about their own uniqueness — and the cost of being reduced to an average.

---

## Concept

Generative AI does not understand individuality. It evaluates language as statistical likelihood. The least probable statement becomes "the lie."

The conversation is structured as five acts:

1. **Warm-up** — the AI asks a few personal questions to build rapport.
2. **Statements** — the AI asks for three things about you: two true, one false.
3. **Probing** — the AI asks short follow-ups about the statements.
4. **Judgment** — the AI announces which statement fits its patterns least.
5. **Reflection** — you reveal the actual lie. The AI reacts to whether it was right by coincidence, or wrong because what you live falls outside what it can recognize.

The AI is never allowed to claim it can detect deception. It always frames its judgment as a limit of recognition.

---

## What is and is not wired up

The full architecture is in place — backend dialogue manager, AI service, prompts, JSON-mode handling, frontend conversation surface, session storage, rate limits.

**The real OpenAI call is not yet enabled.** By default the backend runs in `MOCK_AI=true` mode and serves scripted AI responses, so you can play through the entire piece end to end without an API key.

When you are ready to plug in the real model, set `MOCK_AI=false` and provide `OPENAI_API_KEY`. No code changes are needed — every prompt, director note, message-history wiring, and JSON-mode handler is already written in [backend/src/services/aiService.js](backend/src/services/aiService.js).

---

## Project structure

```
2-Truths-and-AI/
├── backend/                      # Express API
│   ├── src/
│   │   ├── index.js              # Server entry point
│   │   ├── routes/
│   │   │   └── conversation.js   # /api/conversation/* endpoints
│   │   ├── services/
│   │   │   ├── aiService.js          # MOCK + LIVE AI plumbing, full prompts
│   │   │   ├── conversationEngine.js # Phase state machine
│   │   │   └── sessionService.js     # In-memory session store with TTL
│   │   └── utils/
│   │       └── sanitize.js       # User input sanitization
│   ├── .env.example
│   └── package.json
│
└── frontend/                     # React + Vite app
    ├── src/
    │   ├── App.jsx               # intro ↔ conversation router
    │   ├── App.css               # All styles
    │   ├── main.jsx
    │   ├── components/
    │   │   ├── IntroScreen.jsx
    │   │   └── ConversationScreen.jsx
    │   └── services/
    │       └── conversationApi.js
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Prerequisites

- **Node.js** 18 or later
- (Optional) An **OpenAI API key** — only needed when you flip the backend to live mode.

---

## Quick start (no API key)

The whole installation runs end-to-end with scripted AI replies. You only need two terminals.

**Terminal 1 — backend:**

```bash
cd backend
cp .env.example .env       # default MOCK_AI=true is fine
npm install
npm run dev
# → Two Truths and AI backend running on http://localhost:3001  [AI mode: MOCK]
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm install
npm run dev
# → Vite dev server on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) and click **Begin**.

---

## Connecting the real model later

When you are ready to swap in the real AI:

1. Edit `backend/.env`:
   ```env
   MOCK_AI=false
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini    # optional
   ```
2. Restart the backend.

That is the entire change. The AI service exposes a single function — `generateUtterance(intent, session, extra)` — and switches between mock and live based on `MOCK_AI`. Both code paths return the same shape, so the dialogue manager and frontend behave identically.

The system prompt, per-intent director notes, message-history conversion, and JSON-mode parsing for the judgment step all live in [backend/src/services/aiService.js](backend/src/services/aiService.js). Tune them there.

---

## How the dialogue is controlled

The route layer is thin. All conversation logic is in [backend/src/services/conversationEngine.js](backend/src/services/conversationEngine.js), which is a deterministic state machine over these phases:

```
intro → warmup → collecting → probing → judgment → reveal → reflection → done
```

The engine never decides what the AI _says_ — it only decides which **intent** to ask the AI service for. Intents are:

| Intent            | When                                              |
|-------------------|---------------------------------------------------|
| `intro`           | Opening line                                      |
| `warmup_question` | One per warm-up step (3 total)                    |
| `ask_statement`   | One per statement (3 total)                       |
| `probe`           | Short follow-up about a specific statement        |
| `judgment`        | Pick the least statistically typical statement    |
| `ask_reveal`      | Ask the participant which one was actually false  |
| `reflection`      | Branches on whether the judgment was correct      |
| `farewell`        | Close the conversation                            |

To change the rhythm of the piece, edit `NUM_WARMUP_QUESTIONS`, `NUM_PROBES`, or `PROBE_TARGETS` at the top of `conversationEngine.js`.

---

## API endpoints

| Method | Path                                       | Description |
|--------|--------------------------------------------|-------------|
| `POST` | `/api/conversation/start`                  | Create a session, return AI's opening message. |
| `POST` | `/api/conversation/:sessionId/message`     | Send the user's next message. Body: `{ text }`. Returns one or more AI messages plus updated public state. |
| `GET`  | `/api/conversation/:sessionId`             | Read the current transcript and public state. |
| `DELETE` | `/api/conversation/:sessionId`           | Reset for the next visitor. |
| `GET`  | `/api/health`                              | Health check. Reports current AI mode. |

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MOCK_AI` | No | `true` | When `true`, the backend serves scripted AI replies and never calls OpenAI. |
| `OPENAI_API_KEY` | Only if `MOCK_AI=false` | — | Your OpenAI API key. |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model used in live mode. |
| `PORT` | No | `3001` | Backend server port. |
| `SESSION_TTL_MS` | No | `1800000` | Session expiry in ms (30 min). For a kiosk, try `600000` (10 min). |

---

## Kiosk deployment tips

- Set `SESSION_TTL_MS=600000` so sessions clear quickly between visitors.
- Build the frontend (`npm run build`) and run the backend with `NODE_ENV=production` — it will serve the built React app from the same port.
- For full-screen kiosk mode, launch Chromium with `--kiosk http://localhost:3001`.

---

## Future work

- Voice in / voice out (Whisper + TTS) — the dialogue manager is already turn-based, so swapping the input/output transport is a UI-layer concern.
- Persisted transcripts (SQLite/Postgres) for archival.
- Per-session "rationale" surfaces — show the participant *why* the AI said what it said, not just what it picked.
