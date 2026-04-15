import { useCallback, useEffect, useRef, useState } from 'react';
import { createRealtimeSession } from '../services/realtimeApi';

/**
 * Full-screen live interaction surface. Establishes a WebRTC peer
 * connection with OpenAI's Realtime API for bidirectional audio,
 * and displays the model's spoken output as large live captions.
 */
export default function LiveScreen({ onReset }) {
  const [status, setStatus] = useState('connecting'); // connecting | connected | error
  const [aiTranscript, setAiTranscript] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [connectAttempt, setConnectAttempt] = useState(0);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);

  // ── Teardown helpers ────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ── WebRTC connection lifecycle ─────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      setStatus('connecting');
      setError(null);
      setAiTranscript('');
      setIsAiSpeaking(false);
      setIsUserSpeaking(false);

      try {
        // 1. Obtain ephemeral client secret from our backend
        const session = await createRealtimeSession();
        if (cancelled) return;

        const ephemeralKey = session.client_secret.value;
        const model = session.model || 'gpt-realtime-mini';

        // 2. Create RTCPeerConnection
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        // 3. Wire remote audio to <audio> element
        pc.ontrack = (e) => {
          if (audioRef.current) {
            audioRef.current.srcObject = e.streams[0];
          }
        };

        // 4. Capture microphone and add track
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          pc.close();
          return;
        }
        streamRef.current = stream;
        pc.addTrack(stream.getTracks()[0]);

        // 5. Open data channel for Realtime API events
        const dc = pc.createDataChannel('oai-events');
        dcRef.current = dc;

        dc.addEventListener('open', () => {
          if (cancelled) return;
          setStatus('connected');
          // Ask the model to deliver its opening line
          dc.send(JSON.stringify({ type: 'response.create' }));
        });

        dc.addEventListener('message', (e) => {
          if (cancelled) return;
          try {
            const event = JSON.parse(e.data);
            switch (event.type) {
              case 'response.created':
                setAiTranscript('');
                setIsAiSpeaking(true);
                break;

              case 'response.audio_transcript.delta':
                setAiTranscript((prev) => prev + event.delta);
                break;

              case 'response.audio_transcript.done':
                // Keep text visible; speaking flag cleared by response.done
                break;

              case 'response.done':
                setIsAiSpeaking(false);
                break;

              case 'input_audio_buffer.speech_started':
                setIsUserSpeaking(true);
                break;

              case 'input_audio_buffer.speech_stopped':
                setIsUserSpeaking(false);
                break;

              case 'error':
                console.error('Realtime API error:', event.error);
                break;

              default:
                break;
            }
          } catch {
            // Ignore malformed messages
          }
        });

        // 6. Monitor ICE / connection state
        pc.onconnectionstatechange = () => {
          if (cancelled) return;
          const s = pc.connectionState;
          if (s === 'failed' || s === 'disconnected') {
            setStatus('error');
            setError('Connection lost.');
          }
        };

        // 7. SDP offer → OpenAI → SDP answer
        const offer = await pc.createOffer();
        if (cancelled) {
          pc.close();
          return;
        }
        await pc.setLocalDescription(offer);

        const sdpRes = await fetch(
          `https://api.openai.com/v1/realtime?model=${model}`,
          {
            method: 'POST',
            body: offer.sdp,
            headers: {
              Authorization: `Bearer ${ephemeralKey}`,
              'Content-Type': 'application/sdp',
            },
          }
        );

        if (cancelled) {
          pc.close();
          return;
        }

        if (!sdpRes.ok) {
          throw new Error('Failed to establish realtime connection.');
        }

        await pc.setRemoteDescription({
          type: 'answer',
          sdp: await sdpRes.text(),
        });
      } catch (err) {
        if (cancelled) return;
        console.error('Connection failed:', err);
        disconnect();
        setStatus('error');
        setError(
          err.name === 'NotAllowedError'
            ? 'Microphone access is required for this experience.'
            : err.message || 'Failed to connect.'
        );
      }
    }

    connect();

    return () => {
      cancelled = true;
      disconnect();
    };
  }, [connectAttempt, disconnect]);

  // ── User actions ────────────────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    disconnect();
    setConnectAttempt((c) => c + 1);
  }, [disconnect]);

  const handleRestart = useCallback(() => {
    disconnect();
    onReset();
  }, [disconnect, onReset]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="live-screen">
      {/* Hidden audio element for model speech output */}
      <audio ref={audioRef} autoPlay />

      <header className="live-header">
        <span className="live-eyebrow">Two Truths and AI</span>
        <button
          type="button"
          className="btn live-restart"
          onClick={handleRestart}
        >
          Restart
        </button>
      </header>

      <div className="live-stage">
        {/* ── Connecting ────────────────────────────────────────────── */}
        {status === 'connecting' && (
          <div className="live-connecting">
            <div className="live-pulse" />
            <p className="live-status-text">Establishing connection</p>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────── */}
        {status === 'error' && (
          <div className="live-error-box">
            <p className="error-msg">{error}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRetry}
              style={{ marginTop: '1.5rem' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Connected — live captions + indicators ────────────────── */}
        {status === 'connected' && (
          <>
            <div
              className={`live-caption${isAiSpeaking ? ' live-caption--active' : ''}`}
              aria-live="polite"
            >
              {aiTranscript}
            </div>

            <div className="live-indicator-bar">
              {isUserSpeaking && (
                <div className="live-mic-active">
                  <div className="live-bars">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="live-indicator-label">Listening</span>
                </div>
              )}

              {isAiSpeaking && (
                <div className="live-ai-active">
                  <div className="live-pulse-ring" />
                </div>
              )}

              {!isUserSpeaking && !isAiSpeaking && aiTranscript && (
                <div className="live-waiting">
                  <span className="live-indicator-label">Speak</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
