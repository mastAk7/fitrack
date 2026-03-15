import { saveHealth } from '../engine/storage.js';

const SLEEP_TARGET = 8;
const WATER_TARGET = 8;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export default function HealthWidget({ date, healthMap, setHealthMap }) {
  const entry = healthMap[date] || { sleep_h: 0, water: 0 };

  function update(field, delta) {
    const limits = field === 'sleep_h' ? [0, 14] : [0, 20];
    const next = clamp((entry[field] || 0) + delta, limits[0], limits[1]);
    const newMap = { ...healthMap, [date]: { ...entry, [field]: next } };
    setHealthMap(newMap);
    saveHealth(newMap);
  }

  const sleepPct = Math.min(100, (entry.sleep_h / SLEEP_TARGET) * 100);
  const waterPct = Math.min(100, (entry.water / WATER_TARGET) * 100);
  const sleepColor = entry.sleep_h >= SLEEP_TARGET ? '#b388ff' : entry.sleep_h >= 6 ? '#ffab40' : '#ff5252';
  const waterColor = entry.water >= WATER_TARGET ? '#00bcd4' : entry.water >= 5 ? '#ffab40' : '#ff5252';

  return (
    <div style={{
      display: 'flex', gap: 10,
      padding: '12px 16px',
      borderBottom: '1px solid #1e1e2a',
    }}>
      {/* Sleep */}
      <div style={{ flex: 1, background: '#0d0d14', border: '1px solid #1e1e2a', borderRadius: 12, padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#7a7a8a', fontWeight: 600 }}>Sleep</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: sleepColor }}>
            {entry.sleep_h}h
            <span style={{ fontSize: 10, color: '#4a4a5a', fontWeight: 400 }}>/{SLEEP_TARGET}</span>
          </span>
        </div>
        <div style={{ height: 4, background: '#1e1e2a', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${sleepPct}%`, background: sleepColor, borderRadius: 2, transition: 'width 0.2s' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          <StepBtn onClick={() => update('sleep_h', -0.5)}>−</StepBtn>
          <StepBtn onClick={() => update('sleep_h', 0.5)}>+</StepBtn>
        </div>
      </div>

      {/* Water */}
      <div style={{ flex: 1, background: '#0d0d14', border: '1px solid #1e1e2a', borderRadius: 12, padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#7a7a8a', fontWeight: 600 }}>Water</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: waterColor }}>
            {entry.water}
            <span style={{ fontSize: 10, color: '#4a4a5a', fontWeight: 400 }}>/{WATER_TARGET} glasses</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 3, marginBottom: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: WATER_TARGET }).map((_, i) => (
            <div
              key={i}
              onClick={() => {
                const next = i < entry.water ? i : i + 1;
                const newMap = { ...healthMap, [date]: { ...entry, water: next } };
                setHealthMap(newMap);
                saveHealth(newMap);
              }}
              style={{
                width: 10, height: 10, borderRadius: 2,
                background: i < entry.water ? waterColor : '#1e1e2a',
                cursor: 'pointer', transition: 'background 0.15s',
                border: i < entry.water ? `1px solid ${waterColor}60` : '1px solid #2a2a3a',
              }}
            />
          ))}
          {entry.water > WATER_TARGET && (
            <span style={{ fontSize: 10, color: waterColor, alignSelf: 'center' }}>+{entry.water - WATER_TARGET}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          <StepBtn onClick={() => update('water', -1)}>−</StepBtn>
          <StepBtn onClick={() => update('water', 1)}>+</StepBtn>
        </div>
      </div>
    </div>
  );
}

function StepBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, background: '#1a1a2a', border: '1px solid #2a2a3a',
        borderRadius: 6, color: '#e8e8ed', fontSize: 14, fontWeight: 700,
        padding: '3px 0', cursor: 'pointer', lineHeight: 1,
      }}
    >{children}</button>
  );
}
