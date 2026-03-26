const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { generateRounds } = require('../services/aiService');
const { getSession, setSession, deleteSession } = require('../services/sessionService');
const { sanitizeTopic } = require('../utils/sanitize');

const router = express.Router();

const TOTAL_ROUNDS = 5;

/** Mock rounds used when DEMO_MODE=true (no OpenAI key required) */
const DEMO_ROUNDS = [
  {
    statements: [
      { id: 'a', text: 'Black holes form when massive stars collapse under their own gravity at the end of their lives.' },
      { id: 'b', text: 'The event horizon is the boundary beyond which nothing — not even light — can escape a black hole.' },
      { id: 'c', text: 'Black holes constantly emit a vivid blue glow that is visible to the naked eye from Earth.' },
    ],
    lieId: 'c',
  },
  {
    statements: [
      { id: 'a', text: 'Supermassive black holes, millions to billions of times heavier than our Sun, anchor the centres of most large galaxies.' },
      { id: 'b', text: 'Stephen Hawking proposed that black holes slowly evaporate by emitting thermal radiation over astronomical timescales.' },
      { id: 'c', text: 'Time passes faster near a black hole due to extreme gravitational time dilation effects.' },
    ],
    lieId: 'c',
  },
  {
    statements: [
      { id: 'a', text: 'The first direct image of a black hole\'s shadow was released in 2019, captured by the Event Horizon Telescope.' },
      { id: 'b', text: 'When two black holes merge they can release more energy in gravitational waves than all the stars in the observable universe combined.' },
      { id: 'c', text: 'If you fell into a black hole you would immediately freeze motionless at the event horizon as seen by a distant observer.' },
    ],
    lieId: 'c',
  },
  {
    statements: [
      { id: 'a', text: 'Stellar-mass black holes are typically five to one hundred times the mass of our Sun.' },
      { id: 'b', text: 'According to the no-hair theorem, a black hole is fully described by just three properties: mass, electric charge, and spin.' },
      { id: 'c', text: 'The gravitational pull of a black hole is stronger on solids than on gases because of their higher density.' },
    ],
    lieId: 'c',
  },
  {
    statements: [
      { id: 'a', text: 'Spaghettification is the process by which extreme tidal forces stretch a falling object into a long, thin strand near a black hole.' },
      { id: 'b', text: 'Black holes can act as gravitational lenses, bending and magnifying the light of objects far behind them.' },
      { id: 'c', text: 'A black hole compressed to the size of a pea would have the same gravitational pull as a medium-sized car.' },
    ],
    lieId: 'c',
  },
];

/**
 * POST /api/game/start
 * Body: { topic: string }
 * Creates a new game session, generates all 5 rounds, stores server-side.
 * Returns: { sessionId, totalRounds }
 */
router.post('/start', async (req, res) => {
  const { topic: rawTopic } = req.body;

  const sanitized = sanitizeTopic(rawTopic);
  if (!sanitized.ok) {
    return res.status(400).json({ error: sanitized.reason });
  }

  const { topic } = sanitized;

  let rounds;
  try {
    if (process.env.DEMO_MODE === 'true') {
      // Demo mode: use pre-built rounds so the app can be evaluated without an API key
      rounds = DEMO_ROUNDS;
    } else {
      rounds = await generateRounds(topic);
    }
  } catch (err) {
    console.error('AI generation error:', err.message);
    return res.status(503).json({
      error:
        'Failed to generate game content. Please check your API key or try again later.',
    });
  }

  const sessionId = uuidv4();
  setSession(sessionId, {
    sessionId,
    topic,
    rounds, // full rounds with lieId (kept server-side)
    currentRound: 0,
    score: 0,
    answers: [], // { roundIndex, selectedId, correct }
    completed: false,
  });

  return res.status(201).json({ sessionId, totalRounds: TOTAL_ROUNDS, topic });
});

/**
 * GET /api/game/:sessionId/round/:roundNumber
 * Returns the public view of a round (statements only, no lieId).
 * roundNumber is 1-based.
 */
router.get('/:sessionId/round/:roundNumber', (req, res) => {
  const { sessionId, roundNumber } = req.params;
  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired.' });
  }

  const idx = parseInt(roundNumber, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= TOTAL_ROUNDS) {
    return res.status(400).json({ error: 'Invalid round number.' });
  }

  const round = session.rounds[idx];
  // Return statements but NOT the lieId
  return res.json({
    roundNumber: idx + 1,
    totalRounds: TOTAL_ROUNDS,
    topic: session.topic,
    statements: round.statements,
  });
});

/**
 * POST /api/game/:sessionId/answer
 * Body: { roundNumber: number, selectedId: string | null }
 * selectedId is null when the timer expired (auto-submit).
 * Returns: { correct, lieId, lieText, score, completed, finalScore }
 */
router.post('/:sessionId/answer', (req, res) => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired.' });
  }

  if (session.completed) {
    return res.status(400).json({ error: 'Game is already completed.' });
  }

  const { roundNumber, selectedId } = req.body;
  const idx = parseInt(roundNumber, 10) - 1;

  if (isNaN(idx) || idx < 0 || idx >= TOTAL_ROUNDS) {
    return res.status(400).json({ error: 'Invalid round number.' });
  }

  // Prevent re-answering a round
  if (session.answers.some((a) => a.roundIndex === idx)) {
    return res.status(400).json({ error: 'Round already answered.' });
  }

  const round = session.rounds[idx];
  const correct = selectedId !== null && selectedId === round.lieId;

  if (correct) session.score += 1;

  session.answers.push({ roundIndex: idx, selectedId, correct });
  session.currentRound = idx + 1;

  const completed = session.answers.length === TOTAL_ROUNDS;
  if (completed) session.completed = true;

  // Persist updated session
  setSession(sessionId, session);

  const lieStatement = round.statements.find((s) => s.id === round.lieId);

  return res.json({
    correct,
    lieId: round.lieId,
    lieText: lieStatement ? lieStatement.text : '',
    score: session.score,
    completed,
    finalScore: completed ? session.score : null,
    totalRounds: TOTAL_ROUNDS,
  });
});

/**
 * DELETE /api/game/:sessionId
 * Resets (deletes) a session so the next visitor can start fresh.
 */
router.delete('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  deleteSession(sessionId);
  return res.json({ ok: true });
});

module.exports = router;
