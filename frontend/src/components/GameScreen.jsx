import { useState, useEffect, useRef } from 'react';

const TOTAL_TIME = 15;
const CIRCUMFERENCE = 2 * Math.PI * 22; // r=22

export default function GameScreen({ roundData, totalRounds, score, onAnswer }) {
  const { roundNumber, statements } = roundData;
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [locked, setLocked] = useState(false);
  const answeredRef = useRef(false);

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    answeredRef.current = false;
    setLocked(false);
    setTimeLeft(TOTAL_TIME);
  }, [roundNumber]);

  useEffect(() => {
    if (locked) return;

    if (timeLeft === 0) {
      if (!answeredRef.current) {
        answeredRef.current = true;
        setLocked(true);
        onAnswer(null); // null = timer expired
      }
      return;
    }

    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, locked, onAnswer]);

  const handleSelect = (id) => {
    if (locked || answeredRef.current) return;
    answeredRef.current = true;
    setLocked(true);
    onAnswer(id);
  };

  // ── Timer ring SVG ──────────────────────────────────────────────────────────
  const dashOffset = CIRCUMFERENCE * (1 - timeLeft / TOTAL_TIME);
  const urgent = timeLeft <= 5;

  const progressPercent = ((roundNumber - 1) / totalRounds) * 100;

  return (
    <section className="game-screen" aria-label={`Round ${roundNumber} of ${totalRounds}`}>
      {/* Header row */}
      <div className="game-header">
        <div>
          <div className="round-label" aria-label={`Round ${roundNumber} of ${totalRounds}`}>
            Round {roundNumber} / {totalRounds}
          </div>
          <div className="score-label" aria-label={`Score: ${score}`}>
            Score: {score}
          </div>
        </div>

        {/* Circular timer */}
        <div
          className="timer-ring"
          role="timer"
          aria-label={`${timeLeft} seconds remaining`}
          aria-live="polite"
        >
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <circle className="track" cx="28" cy="28" r="22" />
            <circle
              className={`progress${urgent ? ' urgent' : ''}`}
              cx="28"
              cy="28"
              r="22"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <span className="timer-number">{timeLeft}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="progress-bar-wrap"
        role="progressbar"
        aria-valuenow={roundNumber - 1}
        aria-valuemin={0}
        aria-valuemax={totalRounds}
        aria-label="Game progress"
      >
        <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Instruction */}
      <p className="instruction">
        <strong>Which statement is the lie?</strong> Tap a card to answer.
      </p>

      {/* Statement cards */}
      <div className="cards" role="list">
        {statements.map((s) => (
          <button
            key={s.id}
            role="listitem"
            className="statement-card"
            onClick={() => handleSelect(s.id)}
            disabled={locked}
            aria-label={`Statement ${s.id.toUpperCase()}: ${s.text}`}
          >
            <span className="card-letter" aria-hidden="true">
              {s.id.toUpperCase()}
            </span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
