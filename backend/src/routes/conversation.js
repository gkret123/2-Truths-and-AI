/**
 * HTTP routes for the conversational installation.
 *
 *   POST   /api/conversation/start             → open a new session
 *   POST   /api/conversation/:sessionId/message → send the next user message
 *   GET    /api/conversation/:sessionId        → fetch full transcript + state
 *   DELETE /api/conversation/:sessionId        → reset for the next visitor
 *
 * The route layer is intentionally thin: it owns HTTP, validation, and
 * session storage, and delegates ALL dialogue logic to conversationEngine.
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const {
  createConversationState,
  openConversation,
  handleUserMessage,
} = require('../services/conversationEngine');
const {
  getSession,
  setSession,
  deleteSession,
} = require('../services/sessionService');
const { sanitizeUserText } = require('../utils/sanitize');

const router = express.Router();

/**
 * Build the public-facing snapshot of a session. We deliberately do NOT
 * leak `actualLieIdx` until the participant has revealed it themselves,
 * and we do not leak `judgmentIdx` until after the judgment phase.
 */
function publicState(session) {
  return {
    phase: session.phase,
    awaiting: session.awaiting,
    done: session.done,
    history: session.history.map((m) => ({ role: m.role, text: m.text })),
    judgmentIdx: session.judgmentIdx,
    actualLieIdx: session.actualLieIdx,
    judgmentCorrect: session.judgmentCorrect,
    statements: session.statements,
  };
}

// ─── POST /api/conversation/start ────────────────────────────────────────────
router.post('/start', async (_req, res) => {
  const sessionId = uuidv4();
  const session = createConversationState();

  try {
    const { messages } = await openConversation(session);
    setSession(sessionId, session);
    return res.status(201).json({
      sessionId,
      messages,
      state: publicState(session),
    });
  } catch (err) {
    console.error('Failed to open conversation:', err);
    return res
      .status(503)
      .json({ error: 'Could not start the conversation. Please try again.' });
  }
});

// ─── POST /api/conversation/:sessionId/message ───────────────────────────────
router.post('/:sessionId/message', async (req, res) => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired.' });
  }

  if (session.done) {
    return res.status(400).json({ error: 'Conversation is already over.' });
  }

  const sanitized = sanitizeUserText(req.body?.text);
  if (!sanitized.ok) {
    return res.status(400).json({ error: sanitized.reason });
  }

  try {
    const { messages } = await handleUserMessage(session, sanitized.text);
    setSession(sessionId, session);
    return res.json({
      messages,
      state: publicState(session),
    });
  } catch (err) {
    console.error('Conversation engine error:', err);
    return res
      .status(503)
      .json({ error: 'The system could not respond. Please try again.' });
  }
});

// ─── GET /api/conversation/:sessionId ────────────────────────────────────────
router.get('/:sessionId', (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired.' });
  }
  return res.json({ state: publicState(session) });
});

// ─── DELETE /api/conversation/:sessionId ─────────────────────────────────────
router.delete('/:sessionId', (req, res) => {
  deleteSession(req.params.sessionId);
  return res.json({ ok: true });
});

module.exports = router;
