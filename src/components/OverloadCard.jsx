import { useState } from 'react';

export default function OverloadCard({ targets, consistency, sleep_h }) {
  const [expanded, setExpanded] = useState(true);

  if (!targets || targets.length === 0) return null;

  const lowSleep = sleep_h > 0 && sleep_h < 6;

  return (
    <div style={{
      background: lowSleep ? '#1c150a' : '#12121e',
      border: `1px solid ${lowSleep ? '#ffab4040' : '#b388ff40'}`,
      borderRadius: 14,
      padding: '12px 14px',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>{lowSleep ? '🛡️' : '🎯'}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: lowSleep ? '#ffab40' : '#b388ff' }}>
              {lowSleep ? 'Autoregulated Form Mode' : 'Progressive Overload Targets'}
            </div>
            <div style={{ fontSize: 10, color: '#7a7a8a' }}>
              {lowSleep
                ? `Only ${sleep_h}h sleep logged — prioritize form, hold volume`
                : 'Beat past reps & weights for progressive adaptation'}
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background: 'none', border: 'none', color: '#7a7a8a',
            fontSize: 11, cursor: 'pointer', padding: '2px 6px',
          }}
        >
          {expanded ? 'Hide' : 'View'}
        </button>
      </div>

      {consistency?.hasFourWeekBackBase && (
        <div style={{
          marginTop: 8, background: '#00e67615', border: '1px solid #00e67630',
          borderRadius: 6, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 12 }}>🔥</span>
          <span style={{ fontSize: 11, color: '#00e676', fontWeight: 600 }}>
            {consistency.backSessions} Back sessions logged! Your strength capacity has grown.
          </span>
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {targets.slice(0, 3).map((t, idx) => (
            <div
              key={idx}
              style={{
                background: '#0d0d14',
                border: '1px solid #1a1a26',
                borderRadius: 8,
                padding: '8px 10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#e8e8ed' }}>{t.exerciseName}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: t.isDeload ? '#ffab40' : '#00e676',
                  background: t.isDeload ? '#ffab4015' : '#00e67615',
                  padding: '1px 6px', borderRadius: 4,
                }}>
                  {t.targetAction}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#9a9aaa', marginTop: 3, lineHeight: 1.4 }}>
                {t.overloadHint}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
