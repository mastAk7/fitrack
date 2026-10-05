export default function TargetBar({ label, value, target, unit = '', color = '#00e676', activeBurn = 0, baseTarget = null }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const displayColor = pct >= 110 ? '#ff5252' : pct >= 85 ? color : '#ffab40';

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'baseline' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#7a7a8a' }}>{label}</span>
          {activeBurn > 0 && (
            <span style={{ fontSize: 10, color: '#ff8a65', background: '#ff8a6515', border: '1px solid #ff8a6530', padding: '1px 6px', borderRadius: 4 }}>
              🔥 +{activeBurn} burned
            </span>
          )}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: displayColor }}>
          {value}{unit}
          <span style={{ color: '#4a4a5a', fontWeight: 400 }}>
            {' / '}{target}{unit}
            {activeBurn > 0 && baseTarget && (
              <span style={{ fontSize: 10, color: '#6a6a7a', marginLeft: 4 }}>
                ({baseTarget} base + {activeBurn})
              </span>
            )}
          </span>
        </span>
      </div>
      <div style={{
        height: 6,
        background: '#1e1e2a',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: displayColor,
          borderRadius: 3,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}
