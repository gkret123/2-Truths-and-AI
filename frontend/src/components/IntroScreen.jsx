/**
 * Cold-open screen. Provocative, confrontational, edgy.
 * Sets the tone before the user enters the live voice session.
 */
export default function IntroScreen({ onBegin }) {
  return (
    <section className="intro-screen" role="main">
      <div className="intro-frame">
        <span className="intro-eyebrow">Two Truths and AI</span>

        <div className="intro-divider" />

        <h1 className="intro-title">
          You think you're different.
        </h1>

        <p className="intro-body">
          A machine has consumed the patterns of millions of human lives.
          You will speak to it. You will tell it three things about
          yourself — some true, some false. It will decide which is the
          lie.
        </p>

        <p className="intro-body intro-body--dim">
          Not by detecting deception. By recognizing how ordinary you are.
        </p>

        <button
          type="button"
          className="btn btn-primary intro-cta"
          onClick={onBegin}
          autoFocus
        >
          Prove it wrong
        </button>
      </div>
    </section>
  );
}
