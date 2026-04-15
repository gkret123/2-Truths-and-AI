import { useCallback, useState } from 'react';
import IntroScreen from './components/IntroScreen';
import LiveScreen from './components/LiveScreen';

/**
 * Top-level state machine for the installation:
 *
 *   intro  →  live  →  intro  (after restart)
 *
 * The live screen handles its own WebRTC connection lifecycle.
 * This component just toggles between the two screens.
 */
export default function App() {
  const [screen, setScreen] = useState('intro');

  const handleBegin = useCallback(() => {
    setScreen('live');
  }, []);

  const handleReset = useCallback(() => {
    setScreen('intro');
  }, []);

  return (
    <div className={`app${screen === 'live' ? ' app--live' : ''}`}>
      {screen === 'intro' && <IntroScreen onBegin={handleBegin} />}
      {screen === 'live' && <LiveScreen onReset={handleReset} />}
    </div>
  );
}
