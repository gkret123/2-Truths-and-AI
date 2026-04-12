import { useEffect, useRef, useState } from 'react';

/**
 * The conversation surface. Renders the rolling transcript and a single
 * input box. The parent (App) owns all state and the API client; this
 * component only knows how to display messages and emit a "send" event.
 */
export default function ConversationScreen({
  history,
  onSend,
  awaitingInput,
  thinking,
  done,
  onReset,
  state,
}) {
  const [draft, setDraft] = useState('');
  const transcriptRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll the transcript to the bottom whenever it grows
  // or when the AI starts/stops thinking.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, thinking]);

  // Re-focus the input after each AI turn so the participant
  // can keep typing without reaching for the mouse.
  useEffect(() => {
    if (awaitingInput && !thinking && inputRef.current) {
      inputRef.current.focus();
    }
  }, [awaitingInput, thinking]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !awaitingInput || thinking) return;
    setDraft('');
    onSend(trimmed);
  };

  const phaseLabel = formatPhase(state?.phase);

  return (
    <section className="conversation" aria-label="Conversation with the system">
      <header className="conversation-header">
        <span className="conversation-eyebrow">Two Truths and AI</span>
        {phaseLabel && (
          <span
            className="conversation-phase"
            aria-label={`Current phase: ${phaseLabel}`}
          >
            {phaseLabel}
          </span>
        )}
      </header>

      <div
        className="transcript"
        ref={transcriptRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {history.map((msg, i) => (
          <div
            key={i}
            className={`bubble bubble--${msg.role}`}
            data-role={msg.role}
          >
            {msg.role === 'ai' && (
              <span className="bubble-label" aria-hidden="true">
                System
              </span>
            )}
            {msg.role === 'user' && (
              <span className="bubble-label" aria-hidden="true">
                You
              </span>
            )}
            <p className="bubble-text">{msg.text}</p>
          </div>
        ))}

        {thinking && (
          <div className="bubble bubble--ai bubble--thinking" aria-live="polite">
            <span className="bubble-label" aria-hidden="true">
              System
            </span>
            <p className="bubble-text">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </p>
          </div>
        )}
      </div>

      {!done ? (
        <form className="composer" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="composer-input"
            placeholder={
              thinking
                ? 'The system is responding…'
                : awaitingInput
                ? 'Type your reply…'
                : ''
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!awaitingInput || thinking}
            maxLength={500}
            aria-label="Your reply"
            autoComplete="off"
          />
          <button
            type="submit"
            className="btn btn-primary composer-send"
            disabled={!awaitingInput || thinking || !draft.trim()}
          >
            Send
          </button>
        </form>
      ) : (
        <div className="conversation-footer">
          <p className="footer-note">
            The conversation is over. Reset to begin again.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onReset}
            autoFocus
          >
            Reset
          </button>
        </div>
      )}
    </section>
  );
}

function formatPhase(phase) {
  if (!phase) return '';
  switch (phase) {
    case 'intro':
      return 'Opening';
    case 'warmup':
      return 'Warm-up';
    case 'collecting':
      return 'Statements';
    case 'probing':
      return 'Follow-up';
    case 'judgment':
      return 'Judgment';
    case 'reveal':
      return 'Reveal';
    case 'reflection':
      return 'Reflection';
    case 'done':
      return 'Closed';
    default:
      return '';
  }
}
