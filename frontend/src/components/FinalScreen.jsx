const REFLECTION =
  `Today's AI models can generate text that is fluent, confident, and ` +
  `indistinguishable in tone from verified facts. They don't "know" ` +
  `what is true — they predict what text looks plausible. This makes ` +
  `it easier than ever to spread convincing misinformation at scale. ` +
  `Critical thinking, source-checking, and healthy skepticism are more ` +
  `important than ever in an AI-saturated world.`;

export default function FinalScreen({ score, totalRounds, topic, onReplay }) {
  const win = score >= 4;

  return (
    <section className="final-screen" aria-label="Final results" role="main">
      <header>
        <div className="final-score-circle" aria-label={`Score: ${score} out of ${totalRounds}`}>
          <span className="final-score-number">{score}</span>
          <span className="final-score-denom">/ {totalRounds}</span>
        </div>

        <p
          className={`final-verdict ${win ? 'win' : 'lose'}`}
          role="heading"
          aria-level={1}
          style={{ marginTop: '1rem' }}
        >
          {win ? '🎉 You spotted the lies!' : '🤔 The AI fooled you.'}
        </p>

        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          You answered <strong style={{ color: 'var(--text-primary)' }}>{score}/{totalRounds}</strong>{' '}
          correctly on the topic of <em>{topic}</em>.
        </p>
      </header>

      {win ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Impressive! You weren't fooled by AI-generated misinformation.
          That kind of critical thinking is exactly what our world needs more of.
        </p>
      ) : (
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Don't worry — AI-generated text is designed to be believable.
          The more you practice spotting patterns, the better you'll get.
        </p>
      )}

      <div className="reflection">
        <h3>Reflect</h3>
        <p>{REFLECTION}</p>
      </div>

      <button
        className="btn btn-primary"
        onClick={onReplay}
        aria-label="Play again"
        autoFocus
      >
        Play Again →
      </button>
    </section>
  );
}
