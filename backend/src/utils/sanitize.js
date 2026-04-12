/**
 * Input sanitization for user-supplied text in the conversation.
 *
 * The participant types short, freeform answers — names, places, statements
 * about themselves. We do not need topic-style filtering here, but we do
 * need to:
 *   - reject non-strings,
 *   - cap length so the model context cannot blow up,
 *   - strip control characters that would corrupt the transcript.
 */

const MAX_USER_TEXT_LENGTH = 500;

/**
 * Sanitize a freeform user message.
 *
 * @param {unknown} raw
 * @returns {{ ok: true, text: string } | { ok: false, reason: string }}
 */
function sanitizeUserText(raw) {
  if (typeof raw !== 'string') {
    return { ok: false, reason: 'Message must be a string.' };
  }

  // Collapse internal whitespace and trim ends.
  const text = raw.replace(/\s+/g, ' ').trim();

  if (text.length === 0) {
    return { ok: false, reason: 'Message cannot be empty.' };
  }

  if (text.length > MAX_USER_TEXT_LENGTH) {
    return {
      ok: false,
      reason: `Message must be ${MAX_USER_TEXT_LENGTH} characters or fewer.`,
    };
  }

  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(text)) {
    return { ok: false, reason: 'Message contains invalid characters.' };
  }

  return { ok: true, text };
}

module.exports = { sanitizeUserText, MAX_USER_TEXT_LENGTH };
