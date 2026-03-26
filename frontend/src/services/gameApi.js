import {
  getRound as getMockRound,
  resetSession as resetMockSession,
  startGame as startMockGame,
  submitAnswer as submitMockAnswer,
} from './mockGameApi';

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

async function parseJsonResponse(res, fallbackMessage) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || fallbackMessage);
  }
  return data;
}

export async function startGame(topic) {
  if (USE_MOCK_API) {
    return startMockGame(topic);
  }

  const res = await fetch('/api/game/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });

  return parseJsonResponse(res, 'Failed to start game.');
}

export async function getRound(sessionId, roundNumber) {
  if (USE_MOCK_API) {
    return getMockRound(sessionId, roundNumber);
  }

  const res = await fetch(`/api/game/${sessionId}/round/${roundNumber}`);
  return parseJsonResponse(res, 'Failed to load round.');
}

export async function submitAnswer(sessionId, roundNumber, selectedId) {
  if (USE_MOCK_API) {
    return submitMockAnswer(sessionId, roundNumber, selectedId);
  }

  const res = await fetch(`/api/game/${sessionId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundNumber, selectedId }),
  });

  return parseJsonResponse(res, 'Failed to submit answer.');
}

export async function resetSession(sessionId) {
  if (USE_MOCK_API) {
    return resetMockSession(sessionId);
  }

  await fetch(`/api/game/${sessionId}`, { method: 'DELETE' });
}
