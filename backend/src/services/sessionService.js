/**
 * In-memory session store.
 * Each session holds the game state: topic, rounds, answers, and score.
 * Sessions are automatically expired after SESSION_TTL_MS (default 30 min).
 */

const TTL = parseInt(process.env.SESSION_TTL_MS, 10) || 30 * 60 * 1000;

/** @type {Map<string, { data: object, expiresAt: number }>} */
const store = new Map();

// Sweep expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (entry.expiresAt < now) {
      store.delete(id);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create or overwrite a session.
 * @param {string} id
 * @param {object} data
 */
function setSession(id, data) {
  store.set(id, { data, expiresAt: Date.now() + TTL });
}

/**
 * Retrieve a session by id, or null if not found / expired.
 * @param {string} id
 * @returns {object|null}
 */
function getSession(id) {
  const entry = store.get(id);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(id);
    return null;
  }
  return entry.data;
}

/**
 * Delete a session.
 * @param {string} id
 */
function deleteSession(id) {
  store.delete(id);
}

module.exports = { setSession, getSession, deleteSession };
