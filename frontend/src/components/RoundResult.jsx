import { useEffect, useRef } from 'react';

export default function RoundResult({ result, roundData, currentRound, totalRounds, onNext }) {
  const { correct, lieId, lieText } = result;

  // Determine timeout: selectedId is null (timer expired)
  const timedOut = result.selectedId === null;

  const nextBtnRef = useRef(null);
  useEffect(() => {
    // Auto-focus the Next button for keyboard / accessibility
    const t = setTimeout(() => nextBtnRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // Auto-advance after 4 seconds
  useEffect(() => {
    const t = setTimeout(onNext, 4000);
    return () => clearTimeout(t);
  }, [onNext]);

  let resultLabel, resultClass;
  if (timedOut) {
    resultLabel = "\u23F1 Time\u2019s up!";
    resultClass = 'timeout';
  } else if (correct) {
    resultLabel = '\u2713 Correct!';
    resultClass = 'correct';
  } else {
    resultLabel = '\u2717 Wrong';
    resultClass = 'wrong';
  }

  const isLast = currentRound === totalRounds;

  return (
    <section className="round-result" aria-live="polite" aria-label="Round result">
      <div className={`result-badge ${resultClass}`} role="heading" aria-level={2}>
        {resultLabel}
      </div>

      <div className="lie-reveal">
        <h3>The Lie</h3>
        <p>{lieText || `Statement ${lieId?.toUpperCase() ?? '?'}`}</p>
      </div>

      <p className="score-progress">
        Score so far: <strong>{result.score}</strong> / {currentRound}
      </p>

      <button
        ref={nextBtnRef}
        className="btn btn-primary"
        onClick={onNext}
        aria-label={isLast ? 'See final results' : 'Next round'}
      >
        {isLast ? 'See Results →' : 'Next Round →'}
      </button>

      <p style={{ fontSize: '0.8rem', color: 'var(--neutral)' }}>
        Advancing automatically in 4 seconds…
      </p>
    </section>
  );
}
