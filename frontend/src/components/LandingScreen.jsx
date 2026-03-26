import { useState } from 'react';

const SUGGESTED_TOPICS = [
  'Black holes',
  'Ancient Rome',
  'The human brain',
  'Ocean creatures',
  'The Moon',
  'Volcanoes',
  'Dinosaurs',
  'Quantum physics',
];

export default function LandingScreen({ onStart, error }) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed) return;
    setLoading(true);
    await onStart(trimmed);
    setLoading(false);
  };

  const chooseTopic = (t) => {
    setTopic(t);
  };

  return (
    <div className="panel landing" role="main">
      <header>
        <span className="badge" aria-label="Game type">Interactive Exhibit</span>
        <h1 className="headline">Spot&nbsp;the&nbsp;Lie</h1>
        <p className="subheadline">
          Can you tell which statement is AI-generated fiction?
        </p>
      </header>

      <form className="topic-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="topic-input" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Choose a topic to explore
        </label>

        <input
          id="topic-input"
          className="topic-input"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Black holes, Ancient Rome, the Moon…"
          maxLength={80}
          autoComplete="off"
          autoFocus
          aria-describedby={error ? 'topic-error' : undefined}
        />

        <div className="suggestions" role="group" aria-label="Suggested topics">
          <label>Or pick one:</label>
          {SUGGESTED_TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              onClick={() => chooseTopic(t)}
              aria-pressed={topic === t}
            >
              {t}
            </button>
          ))}
        </div>

        {error && (
          <p id="topic-error" className="error-msg" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!topic.trim() || loading}
          aria-busy={loading}
        >
          {loading ? 'Starting…' : 'Start Game →'}
        </button>
      </form>

      <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--neutral)', textAlign: 'center' }}>
        Each game has 5 rounds. You have 15 seconds per round. Good luck.
      </p>
    </div>
  );
}
