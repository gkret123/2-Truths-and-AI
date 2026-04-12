/**
 * Cold-open screen shown before the conversation begins.
 * One button: BEGIN. The piece does not need anything else here.
 */
export default function IntroScreen({ onBegin, loading, error }) {
  return (
    <section className="intro-screen" role="main">
      <div className="intro-frame">
        <span className="intro-eyebrow">Two Truths and AI</span>

        <h1 className="intro-title">
          The system does not know you.
        </h1>

        <p className="intro-body">
          You will tell an AI two truths and one lie about yourself.
          It will try to find the lie. It cannot detect deception.
          It will choose the statement that least resembles the
          patterns it has learned from millions of other people.
        </p>

        <p className="intro-body intro-body--dim">
          When it picks, it may not be wrong. It may simply be
          revealing what it cannot recognize as possible.
        </p>

        <button
          type="button"
          className="btn btn-primary intro-cta"
          onClick={onBegin}
          disabled={loading}
          autoFocus
        >
          {loading ? 'Connecting…' : 'Begin'}
        </button>

        {error && (
          <p className="error-msg" role="alert" style={{ marginTop: '1rem' }}>
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
