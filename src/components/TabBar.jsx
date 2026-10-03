const TABS = [
  { id: 'diet',     label: 'Diet',     icon: '🥗' },
  { id: 'workout',  label: 'Workout',  icon: '💪' },
  { id: 'analytics',label: 'Analytics',icon: '📊' },
  { id: 'coach',    label: 'Coach',    icon: '🤖' },
];

export default function TabBar({ active, onChange }) {
  return (
    <nav style={{
      position: 'sticky',
      bottom: 0,
      background: 'rgba(13, 13, 20, 0.94)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderTop: '1px solid #1e1e2a',
      display: 'flex',
      zIndex: 40,
      maxWidth: 520,
      margin: '0 auto',
      width: '100%',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1,
            padding: '10px 4px 6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            color: active === tab.id ? '#b388ff' : '#6a6a7a',
            transition: 'all 0.15s ease',
            borderTop: active === tab.id ? '2px solid #b388ff' : '2px solid transparent',
            marginTop: -1,
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
          <span style={{
            fontSize: 10,
            fontWeight: active === tab.id ? 700 : 500,
            letterSpacing: '0.3px',
            color: active === tab.id ? '#e8e8ed' : '#6a6a7a',
          }}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
