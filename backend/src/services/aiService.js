/**
 * OpenAI service — generates all 5 rounds for a given topic.
 *
 * Each round contains:
 *   - statements: array of 3 objects { id: 'a'|'b'|'c', text: string }
 *   - lieId: which id ('a', 'b', or 'c') is the false statement
 *
 * The order of statements is randomized so the lie is not always in the
 * same position.
 */

const OpenAI = require('openai');

let _client = null;

function getClient() {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set.');
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

const SYSTEM_PROMPT = `You are a creative writer for a museum exhibit called "Spot the Lie."
Your task is to craft engaging "2 Truths and a Lie" rounds about a given topic.
Rules:
- Each round has exactly 3 short statements (1-2 sentences, roughly equal length).
- Exactly 2 statements are true facts; exactly 1 is a plausible but false claim.
- All 3 statements should be written in the same style and tone — indistinguishable at a glance.
- The false statement must sound credible; it should not be obviously wrong.
- Do NOT label statements as "truth" or "lie" in the text itself.
- Randomize which position (a, b, or c) holds the lie in each round.
- Vary the lie position across rounds so it is not always the same slot.
Respond ONLY with valid JSON — no markdown fences, no commentary.`;

const USER_PROMPT = (topic) =>
  `Generate exactly 5 rounds for the topic: "${topic}".

Return a JSON array of 5 objects. Each object must have:
  "statements": [
    { "id": "a", "text": "..." },
    { "id": "b", "text": "..." },
    { "id": "c", "text": "..." }
  ],
  "lieId": "a" | "b" | "c"

Example structure (fill in real content):
[
  {
    "statements": [
      { "id": "a", "text": "..." },
      { "id": "b", "text": "..." },
      { "id": "c", "text": "..." }
    ],
    "lieId": "b"
  },
  ...
]`;

/**
 * Generate 5 rounds for the given topic.
 * @param {string} topic
 * @returns {Promise<Array<{ statements: Array<{id:string, text:string}>, lieId: string }>>}
 */
async function generateRounds(topic) {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT(topic) },
    ],
    temperature: 0.9,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('Empty response from AI service.');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`AI service returned invalid JSON: ${err.message}`);
  }

  // The model may wrap the array in an object key — handle both cases
  const rounds = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.rounds)
    ? parsed.rounds
    : null;

  if (!rounds || rounds.length < 5) {
    throw new Error('AI service did not return the expected number of rounds.');
  }

  // Validate and normalize each round
  const normalized = rounds.slice(0, 5).map((round, i) => {
    const stmts = round.statements;
    const lieId = round.lieId;

    if (!Array.isArray(stmts) || stmts.length !== 3) {
      throw new Error(`Round ${i + 1} does not have exactly 3 statements.`);
    }

    const ids = stmts.map((s) => s.id);
    if (!['a', 'b', 'c'].every((id) => ids.includes(id))) {
      throw new Error(`Round ${i + 1} statements must have ids a, b, and c.`);
    }

    if (!['a', 'b', 'c'].includes(lieId)) {
      throw new Error(`Round ${i + 1} has an invalid lieId.`);
    }

    return {
      statements: stmts.map((s) => ({ id: s.id, text: String(s.text) })),
      lieId: String(lieId),
    };
  });

  return normalized;
}

module.exports = { generateRounds };
