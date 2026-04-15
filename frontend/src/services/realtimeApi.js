/**
 * Frontend client for the realtime session endpoint.
 *
 * Fetches an ephemeral client secret from our backend, which the
 * LiveScreen component uses to open a WebRTC connection directly
 * with OpenAI's Realtime API.
 */

export async function createRealtimeSession() {
  const res = await fetch('/api/realtime/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid response from server.');
  }

  if (!res.ok) {
    throw new Error(data.error || 'Failed to create realtime session.');
  }

  return data;
}
