export default function StatCard({ label, value, unit = '', color = '#00e676', sub = '' }) {
  return (
    <div style={{
      background: '#13131a',
      border: '1px solid #1e1e2a',
      borderRadius: 14,
      padding: '14px 16px',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: '#7a7a8a', marginBottom: 6, letterSpacing: '0.2px' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, letterSpacing: '-0.5px' }}>
        {value}
        {unit && <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 2 }}>{unit}</span>}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: '#4a4a5a', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}
