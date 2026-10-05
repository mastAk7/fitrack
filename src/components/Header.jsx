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

export default function Header({ phase, week, syncStatus = 'idle', lastSync = null, onSettingsOpen, goal, onGoalOpen, onRefresh, isRefreshing }) {
  const colors = PHASE_COLORS[phase] || PHASE_COLORS['Ramp Up'];
  const sync = SYNC_META[syncStatus] || SYNC_META.idle;

  function formatSync(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  return (
    <header style={{
      background: 'rgba(10, 10, 15, 0.94)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid #1e1e2a',
      padding: 'max(12px, env(safe-area-inset-top, 12px)) 16px 12px',
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e8e8ed', letterSpacing: '-0.3px' }}>
            Fitrack
          </div>
          <span style={{ fontSize: 11, color: '#7a7a8a' }}>Week {week}</span>
        </div>

        {/* Goal Pill */}
        <button
          onClick={onGoalOpen}
          title="Click to customize goal"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#13131c', border: '1px solid #2a2a3e',
            borderRadius: 7, padding: '3px 8px', marginTop: 4,
            cursor: 'pointer', maxWidth: 280, textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 11 }}>🎯</span>
          <span style={{
            fontSize: 11, color: '#b388ff', fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {goal?.text ? (goal.text.length > 34 ? goal.text.slice(0, 34) + '…' : goal.text) : 'Set Goal'}
          </span>
          <span style={{ fontSize: 10, color: '#5a5a7a' }}>✎</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh & sync data"
          style={{
            background: 'none', border: 'none', cursor: isRefreshing ? 'default' : 'pointer',
            color: isRefreshing ? '#00e676' : '#7a7a8a', fontSize: 18, padding: '4px', lineHeight: 1,
            transition: 'color 0.2s',
          }}
        >
          <span style={{
            display: 'inline-block',
            transformOrigin: 'center',
            transform: isRefreshing ? 'rotate(360deg)' : 'none',
            transition: isRefreshing ? 'transform 0.8s ease' : 'none',
          }}>↻</span>
        </button>
        <button
          onClick={onSettingsOpen}
          title="Sync & API settings"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#4a4a5a', fontSize: 16, padding: '4px', lineHeight: 1,
          }}
        >⚙</button>
      </div>
    </header>
  );
}
