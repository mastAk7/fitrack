export default function TargetBar({ label, value, target, unit = '', color = '#00e676' }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const displayColor = pct >= 110 ? '#ff5252' : pct >= 85 ? color : '#ffab40';

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, color: '#7a7a8a' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: displayColor }}>
          {value}{unit}
          <span style={{ color: '#4a4a5a', fontWeight: 400 }}> / {target}{unit}</span>
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
