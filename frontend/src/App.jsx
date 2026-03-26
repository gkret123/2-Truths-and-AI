import { useState, useCallback } from 'react';
import LandingScreen from './components/LandingScreen';
import GameScreen from './components/GameScreen';
import RoundResult from './components/RoundResult';
import FinalScreen from './components/FinalScreen';

/**
 * App-level state machine:
 *   landing  →  loading  →  playing  →  round_result  →  playing (repeat)
 *                                                      →  final
 */
export default function App() {
  const [screen, setScreen] = useState('landing');
  const [sessionId, setSessionId] = useState(null);
  const [topic, setTopic] = useState('');
  const [currentRound, setCurrentRound] = useState(1);
  const [roundData, setRoundData] = useState(null); // { roundNumber, statements }
  const [lastResult, setLastResult] = useState(null); // answer result from API
  const [score, setScore] = useState(0);
  const [error, setError] = useState(null);
  const totalRounds = 5;

  // ── Start a new game ────────────────────────────────────────────────────────
  const handleStart = useCallback(async (chosenTopic) => {
    setError(null);
    setScreen('loading');
    setTopic(chosenTopic);

    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: chosenTopic }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to start game.');
        setScreen('landing');
        return;
      }

      setSessionId(data.sessionId);
      setScore(0);
      setCurrentRound(1);
      await loadRound(data.sessionId, 1);
    } catch {
      setError('Network error. Please check your connection and try again.');
      setScreen('landing');
    }
  }, []);

  // ── Fetch a specific round from the server ──────────────────────────────────
  const loadRound = useCallback(async (sid, roundNum) => {
    try {
      const res = await fetch(`/api/game/${sid}/round/${roundNum}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load round.');
        setScreen('landing');
        return;
      }

      setRoundData(data);
      setScreen('playing');
    } catch {
      setError('Network error while loading round.');
      setScreen('landing');
    }
  }, []);

  // ── Submit an answer (or null for timer expiry) ─────────────────────────────
  const handleAnswer = useCallback(
    async (selectedId) => {
      try {
        const res = await fetch(`/api/game/${sessionId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roundNumber: currentRound, selectedId }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to submit answer.');
          return;
        }

        setScore(data.score);
        setLastResult(data);
        setScreen('round_result');
      } catch {
        setError('Network error while submitting answer.');
      }
    },
    [sessionId, currentRound]
  );

  // ── Advance to the next round or show final screen ──────────────────────────
  const handleNextRound = useCallback(async () => {
    if (lastResult?.completed) {
      setScreen('final');
      return;
    }

    const nextRound = currentRound + 1;
    setCurrentRound(nextRound);
    await loadRound(sessionId, nextRound);
  }, [lastResult, currentRound, sessionId, loadRound]);

  // ── Reset everything for the next visitor ───────────────────────────────────
  const handleReset = useCallback(async () => {
    if (sessionId) {
      try {
        await fetch(`/api/game/${sessionId}`, { method: 'DELETE' });
      } catch {
        // best-effort cleanup
      }
    }
    setSessionId(null);
    setTopic('');
    setCurrentRound(1);
    setRoundData(null);
    setLastResult(null);
    setScore(0);
    setError(null);
    setScreen('landing');
  }, [sessionId]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {screen === 'landing' && (
        <LandingScreen onStart={handleStart} error={error} />
      )}

      {screen === 'loading' && (
        <div className="loading-screen" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p>Generating your game about <strong>{topic}</strong>…</p>
          <p className="loading-sub">This may take a few seconds.</p>
        </div>
      )}

      {screen === 'playing' && roundData && (
        <GameScreen
          roundData={roundData}
          totalRounds={totalRounds}
          score={score}
          onAnswer={handleAnswer}
        />
      )}

      {screen === 'round_result' && lastResult && roundData && (
        <RoundResult
          result={lastResult}
          roundData={roundData}
          currentRound={currentRound}
          totalRounds={totalRounds}
          onNext={handleNextRound}
        />
      )}

      {screen === 'final' && (
        <FinalScreen
          score={score}
          totalRounds={totalRounds}
          topic={topic}
          onReplay={handleReset}
        />
      )}
    </div>
  );
}
