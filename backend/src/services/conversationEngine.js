/**
 * Conversation engine for "Two Truths and AI."
 *
 * This is the dialogue manager — a deterministic state machine that decides
 * what the AI should do next, given the current session and the latest user
 * input. It does NOT generate text. It calls into aiService.generateUtterance()
 * for that, so the same engine works whether the AI is mocked or live.
 *
 * Phases (in order):
 *   intro       → opening line, waits for any input to begin
 *   warmup      → 3 short personal questions (name, place, ordinary detail)
 *   collecting  → 3 statements (two true, one false) — the engine does NOT
 *                 know which is which, just like the AI does not.
 *   probing     → 2 follow-up questions about specific statements
 *   judgment    → AI picks the statement it finds least statistically typical
 *                 (immediately followed by ask_reveal in the same turn)
 *   reveal      → user discloses which statement was actually the lie
 *   reflection  → AI reacts to whether its judgment matched
 *   done        → conversation closed
 */

const { generateUtterance } = require('./aiService');

const PHASES = Object.freeze({
  INTRO: 'intro',
  WARMUP: 'warmup',
  COLLECTING: 'collecting',
  PROBING: 'probing',
  JUDGMENT: 'judgment',
  REVEAL: 'reveal',
  REFLECTION: 'reflection',
  DONE: 'done',
});

// Tunables — change these to adjust the dramatic pacing.
const NUM_WARMUP_QUESTIONS = 3;
const NUM_STATEMENTS = 3;
const NUM_PROBES = 2;

/**
 * The order in which the engine probes specific statements during the
 * "probing" phase. We deliberately do NOT probe all three (that would
 * mechanically signal the structure to the participant). Two probes,
 * one on the second statement and then one on the first, feels rooted
 * without being obvious.
 */
const PROBE_TARGETS = [1, 0]; // statement indices, 0-based

/**
 * Build a fresh, empty session.
 */
function createConversationState() {
  return {
    phase: PHASES.INTRO,
    step: 0, // sub-step within the current phase
    history: [], // [{ role: 'ai' | 'user', text, ts }]
    profile: {}, // { name, location, dayDetail }
    statements: [], // string[] — collected from the user, in order
    probes: [], // [{ statementIdx, question, answer }]
    judgmentIdx: null, // 0 | 1 | 2 — what the AI picked as least typical
    actualLieIdx: null, // 0 | 1 | 2 — what the user revealed
    judgmentCorrect: null, // boolean
    awaiting: 'text', // 'text' | 'none' — what kind of input is expected
    done: false,
  };
}

function appendUser(session, text) {
  session.history.push({ role: 'user', text, ts: Date.now() });
}

function appendAi(session, text) {
  session.history.push({ role: 'ai', text, ts: Date.now() });
}

/**
 * Parse the user's reveal answer ("which one was the lie?") into a
 * statement index. Accepts:
 *   - digits 1-3
 *   - "first/second/third", "one/two/three"
 *   - exact text match against one of the statements
 */
function parseRevealAnswer(text, statements) {
  if (!text || typeof text !== 'string') return null;
  const t = text.trim().toLowerCase();

  const digit = t.match(/[1-3]/);
  if (digit) return parseInt(digit[0], 10) - 1;

  if (/\b(first|one|1st)\b/.test(t)) return 0;
  if (/\b(second|two|2nd)\b/.test(t)) return 1;
  if (/\b(third|three|3rd)\b/.test(t)) return 2;

  // Loose substring match against statements
  for (let i = 0; i < statements.length; i += 1) {
    const s = (statements[i] || '').toLowerCase();
    if (s.length > 0 && (t.includes(s) || s.includes(t))) {
      return i;
    }
  }
  return null;
}

/**
 * Generate the OPENING utterance for a brand-new session.
 * Called once by the route handler immediately after createConversationState().
 *
 * @param {object} session
 * @returns {Promise<{ messages: Array<{role:'ai',text:string}> }>}
 */
async function openConversation(session) {
  const intro = await generateUtterance('intro', session);
  appendAi(session, intro.text);
  session.awaiting = 'text';
  return { messages: [{ role: 'ai', text: intro.text }] };
}

/**
 * Advance the conversation by one user turn.
 *
 * @param {object} session
 * @param {string} userText  The participant's latest message.
 * @returns {Promise<{ messages: Array<{role:'ai',text:string}> }>}
 */
async function handleUserMessage(session, userText) {
  if (session.done) {
    return { messages: [] };
  }

  const safeText = typeof userText === 'string' ? userText.trim() : '';
  if (safeText.length > 0) {
    appendUser(session, safeText);
  }

  const out = [];

  switch (session.phase) {
    // ──────────────────────────────────────────────────────────────────────
    // INTRO  →  WARMUP
    // The user typed anything ("ready", "ok", "hi") to begin.
    // ──────────────────────────────────────────────────────────────────────
    case PHASES.INTRO: {
      session.phase = PHASES.WARMUP;
      session.step = 0;
      const m = await generateUtterance('warmup_question', session, {
        stepIdx: 0,
      });
      appendAi(session, m.text);
      out.push({ role: 'ai', text: m.text });
      break;
    }

    // ──────────────────────────────────────────────────────────────────────
    // WARMUP  →  COLLECTING
    // ──────────────────────────────────────────────────────────────────────
    case PHASES.WARMUP: {
      // Store the answer in the participant's profile.
      if (session.step === 0) session.profile.name = safeText;
      else if (session.step === 1) session.profile.location = safeText;
      else if (session.step === 2) session.profile.dayDetail = safeText;

      session.step += 1;

      if (session.step < NUM_WARMUP_QUESTIONS) {
        const m = await generateUtterance('warmup_question', session, {
          stepIdx: session.step,
        });
        appendAi(session, m.text);
        out.push({ role: 'ai', text: m.text });
      } else {
        // Hand off to the collecting phase
        session.phase = PHASES.COLLECTING;
        session.step = 0;
        const m = await generateUtterance('ask_statement', session, {
          stepIdx: 0,
        });
        appendAi(session, m.text);
        out.push({ role: 'ai', text: m.text });
      }
      break;
    }

    // ──────────────────────────────────────────────────────────────────────
    // COLLECTING  →  PROBING
    // ──────────────────────────────────────────────────────────────────────
    case PHASES.COLLECTING: {
      session.statements.push(safeText);
      session.step += 1;

      if (session.step < NUM_STATEMENTS) {
        const m = await generateUtterance('ask_statement', session, {
          stepIdx: session.step,
        });
        appendAi(session, m.text);
        out.push({ role: 'ai', text: m.text });
      } else {
        // Move into probing — first probe.
        session.phase = PHASES.PROBING;
        session.step = 0;
        const stmtIdx = PROBE_TARGETS[0];
        const m = await generateUtterance('probe', session, {
          stepIdx: 0,
          statementIdx: stmtIdx,
        });
        session.probes.push({
          statementIdx: stmtIdx,
          question: m.text,
          answer: null,
        });
        appendAi(session, m.text);
        out.push({ role: 'ai', text: m.text });
      }
      break;
    }

    // ──────────────────────────────────────────────────────────────────────
    // PROBING  →  JUDGMENT  →  REVEAL  (judgment+ask_reveal in one turn)
    // ──────────────────────────────────────────────────────────────────────
    case PHASES.PROBING: {
      // Record the answer to the most recent probe.
      const lastProbe = session.probes[session.probes.length - 1];
      if (lastProbe) lastProbe.answer = safeText;

      session.step += 1;

      if (session.step < NUM_PROBES) {
        const stmtIdx = PROBE_TARGETS[session.step];
        const m = await generateUtterance('probe', session, {
          stepIdx: session.step,
          statementIdx: stmtIdx,
        });
        session.probes.push({
          statementIdx: stmtIdx,
          question: m.text,
          answer: null,
        });
        appendAi(session, m.text);
        out.push({ role: 'ai', text: m.text });
      } else {
        // Judgment.
        session.phase = PHASES.JUDGMENT;
        const judgment = await generateUtterance('judgment', session);
        session.judgmentIdx =
          typeof judgment.judgmentIdx === 'number' ? judgment.judgmentIdx : 0;
        appendAi(session, judgment.text);
        out.push({ role: 'ai', text: judgment.text });

        // Immediately ask for the reveal in the same turn — pacing matters.
        session.phase = PHASES.REVEAL;
        const ask = await generateUtterance('ask_reveal', session);
        appendAi(session, ask.text);
        out.push({ role: 'ai', text: ask.text });
      }
      break;
    }

    // ──────────────────────────────────────────────────────────────────────
    // REVEAL  →  REFLECTION  →  DONE
    // ──────────────────────────────────────────────────────────────────────
    case PHASES.REVEAL: {
      const lieIdx = parseRevealAnswer(safeText, session.statements);

      if (lieIdx === null) {
        // The participant typed something we cannot parse. Re-prompt without
        // burning a state transition. This is the only place the engine
        // ever loops on itself.
        const reAsk = await generateUtterance('ask_reveal', session);
        appendAi(session, reAsk.text);
        out.push({ role: 'ai', text: reAsk.text });
        break;
      }

      session.actualLieIdx = lieIdx;
      session.judgmentCorrect = lieIdx === session.judgmentIdx;

      session.phase = PHASES.REFLECTION;
      const reflect = await generateUtterance('reflection', session);
      appendAi(session, reflect.text);
      out.push({ role: 'ai', text: reflect.text });

      // Final beat — close the conversation.
      session.phase = PHASES.DONE;
      const farewell = await generateUtterance('farewell', session);
      appendAi(session, farewell.text);
      out.push({ role: 'ai', text: farewell.text });

      session.done = true;
      session.awaiting = 'none';
      break;
    }

    // ──────────────────────────────────────────────────────────────────────
    // DONE — anything the user types is ignored.
    // ──────────────────────────────────────────────────────────────────────
    case PHASES.DONE:
    default:
      session.done = true;
      session.awaiting = 'none';
      break;
  }

  return { messages: out };
}

module.exports = {
  PHASES,
  createConversationState,
  openConversation,
  handleUserMessage,
  // Exported for tests
  _internal: { parseRevealAnswer, PROBE_TARGETS, NUM_PROBES },
};
