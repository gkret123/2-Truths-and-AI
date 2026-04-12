/**
 * Frontend API client for the conversational backend.
 *
 * The backend already runs in MOCK_AI mode by default, so the frontend
 * does not need its own mock — it just talks to the same endpoints
 * regardless of whether the AI is real or scripted. That keeps the
 * "swap in a real key" path trivial.
 */

async function parseJsonResponse(res, fallbackMessage) {
  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error(fallbackMessage);
  }
  if (!res.ok) {
    throw new Error(data.error || fallbackMessage);
  }
  return data;
}

/**
 * Begin a new conversation. Returns the session id and the AI's
 * opening message(s).
 */
export async function startConversation() {
  const res = await fetch('/api/conversation/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return parseJsonResponse(res, 'Failed to start conversation.');
}

/**
 * Send the participant's next message. Returns whatever the AI says
 * back (often one message; sometimes two when judgment + reveal happen
 * in the same turn) plus the updated public state.
 */
export async function sendMessage(sessionId, text) {
  const res = await fetch(`/api/conversation/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return parseJsonResponse(res, 'Failed to send message.');
}

/**
 * Reset / delete the current session so the next visitor starts clean.
 */
export async function resetConversation(sessionId) {
  if (!sessionId) return;
  try {
    await fetch(`/api/conversation/${sessionId}`, { method: 'DELETE' });
  } catch (err) {
    // Best-effort cleanup — never block the UI on this.
    // eslint-disable-next-line no-console
    console.warn('Failed to delete session:', err);
  }
}
