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
      background: '#0d0d14',
      borderTop: '1px solid #1e1e2a',
      display: 'flex',
      zIndex: 40,
      maxWidth: 520,
      margin: '0 auto',
      width: '100%',
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1,
            padding: '10px 4px 8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            color: active === tab.id ? '#b388ff' : '#4a4a5a',
            transition: 'color 0.15s',
            borderTop: active === tab.id ? '2px solid #b388ff' : '2px solid transparent',
            marginTop: -1,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
          <span style={{ fontSize: 10, fontWeight: active === tab.id ? 600 : 400, letterSpacing: '0.3px' }}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
