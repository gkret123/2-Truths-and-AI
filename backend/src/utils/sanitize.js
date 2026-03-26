/**
 * Topic sanitization and safety checks.
 */

const MAX_TOPIC_LENGTH = 80;

/**
 * Keywords whose presence causes a topic to be rejected.
 * This list blocks obviously harmful or inappropriate content.
 */
const BLOCKED_PATTERNS = [
  /\b(porn|sex|nude|naked|xxx|adult|erotic)\b/i,
  /\b(kill(?:ing)?|murder|suicide|self.harm|rape|torture|abuse)\b/i,
  /\b(bomb|explosiv|weapon|gun|shoot|terror|attack|violen(?:ce|t))\b/i,
  /\b(drugs?|cocaine|heroin|meth|fentanyl|weed|marijuana)\b/i,
  /\b(hack|malware|phishing|exploit)\b/i,
  /\b(racist|racism|nazi|white.supremac)\b/i,
];

/**
 * Sanitize and validate a topic string.
 * Returns { ok: true, topic } on success or { ok: false, reason } on failure.
 *
 * @param {string} raw
 * @returns {{ ok: boolean, topic?: string, reason?: string }}
 */
function sanitizeTopic(raw) {
  if (typeof raw !== 'string') {
    return { ok: false, reason: 'Topic must be a string.' };
  }

  // Strip leading/trailing whitespace and collapse internal whitespace
  const topic = raw.trim().replace(/\s+/g, ' ');

  if (topic.length === 0) {
    return { ok: false, reason: 'Topic cannot be empty.' };
  }

  if (topic.length > MAX_TOPIC_LENGTH) {
    return {
      ok: false,
      reason: `Topic must be ${MAX_TOPIC_LENGTH} characters or fewer.`,
    };
  }

  // Allow only printable characters (no control characters)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(topic)) {
    return { ok: false, reason: 'Topic contains invalid characters.' };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(topic)) {
      return {
        ok: false,
        reason: 'That topic is not allowed for this exhibit. Please choose another.',
      };
    }
  }

  return { ok: true, topic };
}

module.exports = { sanitizeTopic };
