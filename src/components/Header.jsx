const PHASE_COLORS = {
  'Ramp Up':   { bg: '#1a2a1a', text: '#00e676' },
  'Mid Cut':   { bg: '#2a1a0a', text: '#ffab40' },
  'Deep Cut':  { bg: '#2a0a0a', text: '#ff5252' },
  'Final Push':{ bg: '#1a0a2a', text: '#b388ff' },
};

const SYNC_META = {
  syncing: { color: '#ffab40', label: 'Syncing…' },
  synced:  { color: '#00e676', label: 'Synced'  },
  error:   { color: '#ff5252', label: 'Sync failed' },
  idle:    { color: '#4a4a5a', label: null },
};

export default function Header({ phase, week, syncStatus = 'idle', lastSync = null }) {
  const colors = PHASE_COLORS[phase] || PHASE_COLORS['Ramp Up'];
  const sync = SYNC_META[syncStatus] || SYNC_META.idle;

  function formatSync(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  return (
    <header style={{
      background: '#0a0a0f',
      borderBottom: '1px solid #1e1e2a',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      maxWidth: 520,
      margin: '0 auto',
      width: '100%',
    }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#e8e8ed', letterSpacing: '-0.3px' }}>
          Fitrack
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: '#7a7a8a' }}>Week {week} · Adaptive Cut</span>
          {sync.label && (
            <>
              <span style={{ color: '#2a2a3a', fontSize: 10 }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: sync.color,
                  display: 'inline-block',
                  ...(syncStatus === 'syncing' ? { animation: 'pulse 1s infinite' } : {}),
                }} />
                <span style={{ fontSize: 10, color: sync.color }}>{sync.label}</span>
              </span>
            </>
          )}
          {syncStatus === 'idle' && lastSync && (
            <>
              <span style={{ color: '#2a2a3a', fontSize: 10 }}>·</span>
              <span style={{ fontSize: 10, color: '#4a4a5a' }}>↑ {formatSync(lastSync)}</span>
            </>
          )}
        </div>
      </div>

      <div style={{
        background: colors.bg,
        color: colors.text,
        fontSize: 11,
        fontWeight: 600,
        padding: '4px 10px',
        borderRadius: 8,
        border: `1px solid ${colors.text}30`,
        letterSpacing: '0.3px',
      }}>
        {phase}
      </div>
    </header>
  );
}
