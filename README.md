# Two Truths and AI

An audio-first interactive installation about how AI sees you — and how it doesn't.

The participant speaks to an AI. They tell it three things about themselves — some true, some false. The AI interrogates them, probes their statements, and declares which one it believes is the lie. It cannot detect deception. It identifies what does not fit the pattern it has learned from millions of other people. After the verdict, the conversation continues: the participant can push back, argue, and challenge. The AI holds its ground.

The piece is built around a single uncomfortable thesis: that humans are not as unique as they believe, and that everything they call personal is, statistically, predictable.

---

## How the experience works

The participant presses **Prove it wrong** and immediately enters a live voice conversation. There is no text input. The AI speaks; the participant speaks back.

The conversation follows these phases:

1. **Opening** — the AI announces what it intends to do and asks for a name.
2. **Warm-up** — three short questions (name, location, a detail about the day) to build a profile.
3. **Collecting statements** — the AI asks for three personal statements (two true, one false), one at a time. As each statement is spoken, it appears in a numbered box on screen so people nearby can follow along.
4. **Probing** — the AI asks pointed follow-up questions about each statement. It expresses skepticism. It pushes back.
5. **Judgment** — the AI declares which statement it believes is the lie. Definitive. Confrontational.
6. **Reveal and argument** — the participant says which one was really false. The AI responds — and continues to push its thesis regardless of whether it was right or wrong.
7. **Continuation** — the conversation does not end after the reveal. The participant can argue back. The session only resets when someone presses **Restart**.

The model's speech is displayed as large live captions on screen as it speaks, so the piece works as a public installation where people nearby can read along.

---

## Architecture

The primary experience is **voice-first**, built on the OpenAI Realtime API via WebRTC:

```
Browser
  ├── WebRTC audio track  ──────────────────────→  OpenAI Realtime API
  │    (microphone input)                               (gpt-realtime-1.5)
  │
  ├── WebRTC audio track  ←──────────────────────  OpenAI Realtime API
  │    (speaker output)                              (voice: echo)
  │
  └── WebRTC data channel ←──────────────────────  OpenAI Realtime API
       (transcripts, events,                        (server-side VAD,
        function call results)                       Whisper transcription)

Backend (Express)
  └── POST /api/realtime/session
        Creates an ephemeral client secret via
        OpenAI's session API. The API key never
        leaves the server.
```

The browser uses the ephemeral key to establish the WebRTC connection directly with OpenAI. The backend's only role in the live session is the initial token exchange.

### Statement capture

The model is given a `record_statement(index, text)` tool that it calls once for each of the three statements as the participant speaks them. The frontend listens for the function-call event on the data channel and populates the numbered boxes in real time.

---

## Project structure

```
2-Truths-and-AI/
├── backend/
│   ├── src/
│   │   ├── index.js                  # Express server entry point
│   │   ├── routes/
│   │   │   ├── realtime.js           # POST /api/realtime/session
│   │   │   │                         # (system prompt, voice, tool config live here)
│   │   │   └── conversation.js       # Legacy text-mode API (kept for reference)
│   │   ├── services/
│   │   │   ├── aiService.js          # Legacy text AI service (MOCK + LIVE)
│   │   │   ├── conversationEngine.js # Legacy phase state machine
│   │   │   └── sessionService.js     # In-memory session store with TTL
│   │   └── utils/
│   │       └── sanitize.js
│   ├── .env.example                  # Copy to .env and fill in your key
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.jsx                   # intro ↔ live screen router
    │   ├── App.css                   # All styles
    │   ├── main.jsx
    │   ├── components/
    │   │   ├── IntroScreen.jsx       # "You think you're different." welcome screen
    │   │   ├── LiveScreen.jsx        # WebRTC session, live captions, statement boxes
    │   │   └── ConversationScreen.jsx # Legacy text UI (kept, not imported)
    │   └── services/
    │       ├── realtimeApi.js        # Fetches ephemeral session token
    │       └── conversationApi.js    # Legacy text API client
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Prerequisites

- **Node.js** 18 or later
- An **OpenAI API key** with access to the Realtime API

---

## Quick start

You need two terminals.

**Step 1 — set up the backend:**

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your API key:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-realtime-1.5
PORT=3001
```

Then start the server:

```bash
npm install
npm run dev
# → Two Truths and AI backend running on http://localhost:3001
```

**Step 2 — start the frontend:**

```bash
cd frontend
npm install
npm run dev
# → Vite dev server on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173). Click **Prove it wrong**. Allow microphone access when prompted. The AI will begin speaking immediately.

---

## Tuning the experience

All of the model's behavior is controlled by the system instructions in [backend/src/routes/realtime.js](backend/src/routes/realtime.js) — the `SYSTEM_INSTRUCTIONS` constant at the top of the file. Edit that string to change the AI's persona, the game structure, how aggressively it pushes back, or what it says at each phase.

The voice and model are set in the same file inside the `fetch` call to OpenAI's session endpoint:

```js
model: process.env.OPENAI_MODEL || 'gpt-realtime-mini',
voice: 'echo',
```

To upgrade to a different voice or model, change those values (or set `OPENAI_MODEL` in `.env`).

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/realtime/session` | Creates an ephemeral WebRTC session token. Called once when the participant presses Begin. Returns the full OpenAI session object including `client_secret`. |
| `GET` | `/api/health` | Health check. |
| `POST` | `/api/conversation/start` | Legacy text mode: open a new session. |
| `POST` | `/api/conversation/:id/message` | Legacy text mode: send a message. |
| `DELETE` | `/api/conversation/:id` | Legacy text mode: reset a session. |

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | Your OpenAI API key. Used server-side only to create ephemeral tokens. |
| `OPENAI_MODEL` | No | `gpt-realtime-mini` | Realtime model. Use `gpt-realtime-1.5` for the full model. |
| `PORT` | No | `3001` | Backend server port. |
| `MOCK_AI` | No | `false` | When `true`, the legacy text mode uses scripted responses instead of calling OpenAI. Has no effect on the voice/WebRTC path. |
| `SESSION_TTL_MS` | No | `1800000` | TTL for legacy text sessions in ms (30 min default). |

---

## Production / kiosk deployment

Build the frontend and let the backend serve it from a single port:

```bash
cd frontend && npm run build
cd ../backend && NODE_ENV=production npm start
# → serves everything on http://localhost:3001
```

For a dedicated installation display:

- Launch Chromium in kiosk mode: `chromium --kiosk http://localhost:3001`
- The large serif captions are designed to be readable from several metres away.
- The **Restart** button in the top-right corner resets the session for the next visitor without reloading the page.
- Consider setting `SESSION_TTL_MS=600000` (10 min) to clear idle legacy sessions faster.
