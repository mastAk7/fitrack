import { useState } from 'react';

const GIST_ID_KEY = 'sc_gist_id';

export default function SyncSettings({ onClose, onSyncNow }) {
  const envGistId = import.meta.env.VITE_GIST_ID || '';
  const localGistId = localStorage.getItem(GIST_ID_KEY) || '';
  const activeGistId = envGistId || localGistId;
  const hasToken = !!import.meta.env.VITE_GITHUB_TOKEN;

  const [input, setInput] = useState(activeGistId);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const trimmed = input.trim();
    if (trimmed) {
      localStorage.setItem(GIST_ID_KEY, trimmed);
    } else {
      localStorage.removeItem(GIST_ID_KEY);
    }
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
    }} onClick={onClose}>
      <div
        style={{
          width: '100%', maxWidth: 520,
          background: '#13131a', borderTop: '1px solid #1e1e2a',
          borderRadius: '16px 16px 0 0', padding: '20px 20px 36px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#e8e8ed' }}>Sync Settings</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#7a7a8a', fontSize: 18, cursor: 'pointer', padding: '2px 6px' }}
          >✕</button>
        </div>

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

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1, background: saved ? '#00e676' : '#b388ff',
              border: 'none', borderRadius: 10, padding: '10px',
              color: '#0a0a0f', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >{saved ? 'Saved!' : 'Save Gist ID'}</button>
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
      </div>
    </div>
  );
}
