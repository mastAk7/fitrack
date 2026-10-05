import { useState } from 'react';
import { loadUserApiKeys, saveUserApiKeys } from '../engine/storage.js';
import { getGoogleFitClientId, saveGoogleFitClientId, isGoogleFitConnected, connectGoogleFit, disconnectGoogleFit } from '../engine/googleFit.js';

const GIST_ID_KEY = 'sc_gist_id';

export default function SyncSettings({ onClose, onSyncNow, onClearAll }) {
  const envGistId = import.meta.env.VITE_GIST_ID || '';
  const localGistId = localStorage.getItem(GIST_ID_KEY) || '';
  const activeGistId = envGistId || localGistId;
  const hasToken = !!import.meta.env.VITE_GITHUB_TOKEN;

  const [input, setInput] = useState(activeGistId);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Google Fit
  const [fitClientId, setFitClientId] = useState(() => getGoogleFitClientId());
  const [isFitConnected, setIsFitConnected] = useState(() => isGoogleFitConnected());
  const [fitLoading, setFitLoading] = useState(false);
  const [fitMsg, setFitMsg] = useState('');

  const [userKeys, setUserKeys] = useState(() => loadUserApiKeys());
  const [geminiKeyInput, setGeminiKeyInput] = useState(userKeys.geminiKey || '');
  const [groqKeyInput, setGroqKeyInput] = useState(userKeys.groqKey || '');

  async function handleConnectFit() {
    setFitLoading(true);
    setFitMsg('');
    try {
      saveGoogleFitClientId(fitClientId);
      await connectGoogleFit(fitClientId);
      setIsFitConnected(true);
      setFitMsg('✓ Google Fit connected!');
    } catch (err) {
      setFitMsg('✕ ' + (err.message || 'Connection failed'));
    } finally {
      setFitLoading(false);
    }
  }

  function handleDisconnectFit() {
    disconnectGoogleFit();
    setIsFitConnected(false);
    setFitMsg('Disconnected from Google Fit');
  }

  function handleSave() {
    const trimmed = input.trim();
    if (trimmed) {
      localStorage.setItem(GIST_ID_KEY, trimmed);
    } else {
      localStorage.removeItem(GIST_ID_KEY);
    }

    saveGoogleFitClientId(fitClientId);

    const newKeys = {
      ...userKeys,
      geminiKey: geminiKeyInput.trim() || undefined,
      groqKey: groqKeyInput.trim() || undefined,
    };
    saveUserApiKeys(newKeys);
    setUserKeys(newKeys);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleCopy() {
    if (!activeGistId) return;
    navigator.clipboard.writeText(activeGistId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000000aa',
      zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div
        style={{
          width: '100%', maxWidth: 520,
          maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          background: '#13131a', borderTop: '1px solid #1e1e2a',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px 14px', borderBottom: '1px solid #1e1e2a',
          background: '#13131a', flexShrink: 0,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#e8e8ed' }}>Sync & API Settings</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#7a7a8a', fontSize: 18, cursor: 'pointer', padding: '2px 6px' }}
          >✕</button>
        </div>

        {/* Scrollable Modal Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '18px 20px 36px',
        }}>

        {/* Token status */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#4a4a5a', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 6 }}>
            GitHub Token
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#0d0d14', border: '1px solid #1e1e2a',
            borderRadius: 8, padding: '8px 12px',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: hasToken ? '#00e676' : '#ff5252', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: hasToken ? '#00e676' : '#ff5252' }}>
              {hasToken ? 'Configured in .env' : 'Not configured — add VITE_GITHUB_TOKEN to .env'}
            </span>
          </div>
        </div>

        {/* Gist ID */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#4a4a5a', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 6 }}>
            Gist ID
          </div>
          <div style={{ fontSize: 11, color: '#7a7a8a', marginBottom: 8 }}>
            Copy this from your laptop and paste it on your phone (or vice versa) so both devices sync to the same gist.
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Paste gist ID here…"
              style={{
                flex: 1, background: '#0d0d14', border: '1px solid #1e1e2a',
                borderRadius: 8, padding: '8px 12px', color: '#e8e8ed',
                fontSize: 12, outline: 'none', fontFamily: 'monospace',
              }}
            />
            {activeGistId && (
              <button
                onClick={handleCopy}
                style={{
                  background: '#1e1e2a', border: '1px solid #2a2a3a',
                  borderRadius: 8, padding: '8px 12px', color: copied ? '#00e676' : '#b388ff',
                  fontSize: 12, cursor: 'pointer', fontWeight: 600, flexShrink: 0,
                }}
              >{copied ? 'Copied!' : 'Copy'}</button>
            )}
          </div>
          {!activeGistId && (
            <div style={{ fontSize: 11, color: '#7a7a8a', marginTop: 6 }}>
              A gist will be auto-created on first sync.
            </div>
          )}
        </div>

        {/* Google Fit Integration */}
        <div style={{ marginBottom: 18, borderTop: '1px solid #1e1e2a', paddingTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: '#4a4a5a', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Google Fitness (Runs, Walks, Steps)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isFitConnected ? '#00e676' : '#5a5a6a' }} />
              <span style={{ fontSize: 11, color: isFitConnected ? '#00e676' : '#7a7a8a', fontWeight: 600 }}>
                {isFitConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#7a7a8a', marginBottom: 8 }}>
            Sync steps, active walking/running burns, and distance directly into your daily maintenance energy calculation.
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#00e676', marginBottom: 4, fontWeight: 500 }}>OAuth Client ID (Web Application)</div>
            <input
              type="text"
              value={fitClientId}
              onChange={e => setFitClientId(e.target.value)}
              placeholder="123456789-...apps.googleusercontent.com"
              style={{
                width: '100%', boxSizing: 'border-box', background: '#0d0d14', border: '1px solid #1e1e2a',
                borderRadius: 8, padding: '8px 12px', color: '#e8e8ed',
                fontSize: 12, outline: 'none', fontFamily: 'monospace',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            {isFitConnected ? (
              <button
                onClick={handleDisconnectFit}
                style={{
                  background: '#2a1a1a', border: '1px solid #ff525240',
                  borderRadius: 8, padding: '7px 12px', color: '#ff5252',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >Disconnect Google Fit</button>
            ) : (
              <button
                onClick={handleConnectFit}
                disabled={fitLoading || !fitClientId.trim()}
                style={{
                  background: '#132a1e', border: '1px solid #00e67640',
                  borderRadius: 8, padding: '7px 14px', color: '#00e676',
                  fontSize: 12, fontWeight: 600, cursor: fitLoading || !fitClientId.trim() ? 'default' : 'pointer',
                  opacity: fitLoading || !fitClientId.trim() ? 0.6 : 1,
                }}
              >{fitLoading ? 'Connecting…' : 'Connect Google Fit'}</button>
            )}
            {fitMsg && (
              <span style={{ fontSize: 11, color: fitMsg.startsWith('✓') ? '#00e676' : '#ff5252' }}>
                {fitMsg}
              </span>
            )}
          </div>
        </div>

        {/* Custom AI API Keys (Optional Fallbacks) */}
        <div style={{ marginBottom: 18, borderTop: '1px solid #1e1e2a', paddingTop: 14 }}>
          <div style={{ fontSize: 11, color: '#4a4a5a', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 4 }}>
            AI API Keys (Optional Fallbacks)
          </div>
          <div style={{ fontSize: 11, color: '#7a7a8a', marginBottom: 10 }}>
            Fitrack already uses built-in key rotation & local 0-token food parsing. If you hit rate limits, paste your own free Gemini or Groq key:
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#b388ff', marginBottom: 4, fontWeight: 500 }}>Personal Gemini API Key</div>
            <input
              type="password"
              value={geminiKeyInput}
              onChange={e => setGeminiKeyInput(e.target.value)}
              placeholder="AIzaSy... (from Google AI Studio)"
              style={{
                width: '100%', boxSizing: 'border-box', background: '#0d0d14', border: '1px solid #1e1e2a',
                borderRadius: 8, padding: '8px 12px', color: '#e8e8ed',
                fontSize: 12, outline: 'none', fontFamily: 'monospace',
              }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#00e676', marginBottom: 4, fontWeight: 500 }}>Personal Groq API Key</div>
            <input
              type="password"
              value={groqKeyInput}
              onChange={e => setGroqKeyInput(e.target.value)}
              placeholder="gsk_... (from Groq Console)"
              style={{
                width: '100%', boxSizing: 'border-box', background: '#0d0d14', border: '1px solid #1e1e2a',
                borderRadius: 8, padding: '8px 12px', color: '#e8e8ed',
                fontSize: 12, outline: 'none', fontFamily: 'monospace',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1, background: saved ? '#00e676' : '#b388ff',
              border: 'none', borderRadius: 10, padding: '10px',
              color: '#0a0a0f', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >{saved ? 'Settings Saved!' : 'Save Settings'}</button>
          {hasToken && (
            <button
              onClick={() => { onSyncNow(); onClose(); }}
              style={{
                flex: 1, background: '#1e1e2a',
                border: '1px solid #2a2a3a', borderRadius: 10, padding: '10px',
                color: '#e8e8ed', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >Sync Now</button>
          )}
        </div>

        {/* Danger Zone: Wipe / Clear All History */}
        <div style={{ marginTop: 22, borderTop: '1px solid #1e1e2a', paddingTop: 14 }}>
          <div style={{ fontSize: 11, color: '#ff5252', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 4 }}>
            Danger Zone
          </div>
          <div style={{ fontSize: 11, color: '#7a7a8a', marginBottom: 10 }}>
            Wipe all logged meals, workouts, health metrics, and coach chat for a completely fresh start.
          </div>
          {confirmClear ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  onClearAll?.();
                  setConfirmClear(false);
                  onClose();
                }}
                style={{
                  flex: 1, background: '#ff5252', border: 'none',
                  borderRadius: 8, padding: '9px', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Yes, Wipe Everything
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                style={{
                  flex: 1, background: '#1e1e2a', border: '1px solid #2a2a3a',
                  borderRadius: 8, padding: '9px', color: '#e8e8ed',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              style={{
                width: '100%', background: '#ff525215', border: '1px solid #ff525240',
                borderRadius: 8, padding: '9px', color: '#ff5252',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Clear All Logs & History
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
