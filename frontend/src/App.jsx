import { useCallback, useState } from 'react';
import IntroScreen from './components/IntroScreen';
import ConversationScreen from './components/ConversationScreen';
import {
  resetConversation,
  sendMessage,
  startConversation,
} from './services/conversationApi';

/**
 * Top-level state machine for the installation:
 *
 *   intro  →  conversation  →  intro  (after reset)
 *
 * Everything else lives server-side. This component is just a thin
 * controller around the conversation API.
 */
export default function App() {
  const [screen, setScreen] = useState('intro');
  const [sessionId, setSessionId] = useState(null);
  const [history, setHistory] = useState([]);
  const [state, setState] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState(null);

  // ── Begin a new conversation ────────────────────────────────────────────────
  const handleBegin = useCallback(async () => {
    setError(null);
    setThinking(true);
    try {
      const data = await startConversation();
      setSessionId(data.sessionId);
      setHistory(data.messages || []);
      setState(data.state || null);
      setScreen('conversation');
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError('Could not reach the system. Please try again.');
    } finally {
      setThinking(false);
    }
  }, []);

  // ── Send a user message ─────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text) => {
      if (!sessionId || thinking) return;

      // Optimistically append the user message so the UI feels responsive.
      setHistory((prev) => [...prev, { role: 'user', text }]);
      setThinking(true);

      try {
        const data = await sendMessage(sessionId, text);
        // Append whatever the AI said back. Sometimes that's two messages
        // in one turn (judgment + ask_reveal).
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setHistory((prev) => [...prev, ...data.messages]);
        }
        setState(data.state || null);
      } catch (err) {
        console.error('Failed to send message:', err);
        setHistory((prev) => [
          ...prev,
          {
            role: 'ai',
            text:
              '[The system did not respond. Please try sending your message again.]',
          },
        ]);
      } finally {
        setThinking(false);
      }
    },
    [sessionId, thinking]
  );

  // ── Reset for the next visitor ──────────────────────────────────────────────
  const handleReset = useCallback(async () => {
    if (sessionId) {
      await resetConversation(sessionId);
    }
    setSessionId(null);
    setHistory([]);
    setState(null);
    setError(null);
    setThinking(false);
    setScreen('intro');
  }, [sessionId]);

  const awaitingInput =
    !!state && state.awaiting === 'text' && !state.done;
  const done = !!state?.done;

  return (
    <div className="app">
      {screen === 'intro' && (
        <IntroScreen
          onBegin={handleBegin}
          loading={thinking}
          error={error}
        />
      )}

      {screen === 'conversation' && (
        <ConversationScreen
          history={history}
          onSend={handleSend}
          awaitingInput={awaitingInput}
          thinking={thinking}
          done={done}
          onReset={handleReset}
          state={state}
        />
      )}
    </div>
  );
}
