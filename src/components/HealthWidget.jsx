import { saveHealth } from '../engine/storage.js';
import { isGoogleFitConnected } from '../engine/googleFit.js';

const SLEEP_TARGET = 8;
const WATER_TARGET = 8;
const STEPS_TARGET = 10000;
const HEART_POINTS_TARGET = 30;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export default function HealthWidget({ date, healthMap, setHealthMap }) {
  const entry = healthMap[date] || { sleep_h: 0, water: 0, steps: 0, active_cals: 0, heart_points: 0, distance_km: 0 };
  const fitConnected = isGoogleFitConnected();

  function update(field, delta) {
    let limits = [0, 20];
    if (field === 'sleep_h') limits = [0, 14];

    const currentVal = entry[field] || 0;
    const next = clamp(currentVal + delta, limits[0], limits[1]);
    const updatedEntry = { ...entry, [field]: next };

    const newMap = { ...healthMap, [date]: updatedEntry };
    setHealthMap(newMap);
    saveHealth(newMap);
  }

  const sleepPct = Math.min(100, ((entry.sleep_h || 0) / SLEEP_TARGET) * 100);
  const waterPct = Math.min(100, ((entry.water || 0) / WATER_TARGET) * 100);
  const stepsVal = entry.steps || 0;
  const stepsPct = Math.min(100, (stepsVal / STEPS_TARGET) * 100);
  const heartPoints = entry.heart_points || 0;
  const distanceKm = entry.distance_km || 0;
  const activeCals = entry.active_cals || 0;

  const sleepColor = entry.sleep_h >= SLEEP_TARGET ? '#b388ff' : entry.sleep_h >= 6 ? '#ffab40' : '#ff5252';
  const waterColor = entry.water >= WATER_TARGET ? '#00bcd4' : entry.water >= 5 ? '#ffab40' : '#ff5252';
  const stepsColor = stepsVal >= STEPS_TARGET ? '#00e676' : stepsVal >= 6000 ? '#ffab40' : '#b388ff';
  const heartColor = heartPoints >= HEART_POINTS_TARGET ? '#00e676' : '#b388ff';

  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: '1px solid #1e1e2a',
    }}>
      {/* Top 3 Metric Cards: Sleep, Water, Google Fit Steps */}
      <div style={{
        display: 'flex', gap: 8,
        overflowX: 'auto',
        marginBottom: 8,
      }}>
        {/* Sleep */}
        <div style={{ flex: 1, minWidth: 105, background: '#0d0d14', border: '1px solid #1e1e2a', borderRadius: 12, padding: '10px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#7a7a8a', fontWeight: 600 }}>Sleep</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: sleepColor }}>
              {entry.sleep_h}h
              <span style={{ fontSize: 10, color: '#4a4a5a', fontWeight: 400 }}>/{SLEEP_TARGET}</span>
            </span>
          </div>
          <div style={{ height: 4, background: '#1e1e2a', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${sleepPct}%`, background: sleepColor, borderRadius: 2, transition: 'width 0.2s' }} />
          </div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            <StepBtn onClick={() => update('sleep_h', -0.5)}>−</StepBtn>
            <StepBtn onClick={() => update('sleep_h', 0.5)}>+</StepBtn>
          </div>
        </div>

        {/* Water */}
        <div style={{ flex: 1, minWidth: 105, background: '#0d0d14', border: '1px solid #1e1e2a', borderRadius: 12, padding: '10px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#7a7a8a', fontWeight: 600 }}>Water</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: waterColor }}>
              {entry.water}
              <span style={{ fontSize: 10, color: '#4a4a5a', fontWeight: 400 }}>/{WATER_TARGET}</span>
            </span>
          </div>
          <div style={{ height: 4, background: '#1e1e2a', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${waterPct}%`, background: waterColor, borderRadius: 2, transition: 'width 0.2s' }} />
          </div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            <StepBtn onClick={() => update('water', -1)}>−</StepBtn>
            <StepBtn onClick={() => update('water', 1)}>+</StepBtn>
          </div>
        </div>

        {/* Steps (Strictly Google Fit) */}
        <div style={{ flex: 1.3, minWidth: 130, background: '#0d0d14', border: '1px solid #1e1e2a', borderRadius: 12, padding: '10px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#7a7a8a', fontWeight: 600 }}>Steps</span>
              <span style={{
                fontSize: 9,
                fontWeight: 600,
                color: fitConnected ? '#00e676' : '#7a7a8a',
                background: fitConnected ? '#00e67615' : '#1e1e2a',
                padding: '1px 5px',
                borderRadius: 4,
              }}>
                {fitConnected ? 'Fit' : 'Manual off'}
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: stepsColor }}>
              {stepsVal.toLocaleString()}
              <span style={{ fontSize: 10, color: '#4a4a5a', fontWeight: 400 }}>/10k</span>
            </span>
          </div>
          <div style={{ height: 4, background: '#1e1e2a', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${stepsPct}%`, background: stepsColor, borderRadius: 2, transition: 'width 0.2s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#7a7a8a' }}>
            <span>{distanceKm > 0 ? `${distanceKm} km` : '0 km'}</span>
            <span style={{ color: '#00e676', fontWeight: 600 }}>{activeCals > 0 ? `+${activeCals} kcal` : ''}</span>
          </div>
        </div>
      </div>

      {/* Google Fit Health Metrics Strip: Heart Points, Distance, Active Burn */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#0a0a12',
        border: '1px solid #191924',
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 11,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12 }}>❤️</span>
          <span style={{ color: '#7a7a8a' }}>Heart Points:</span>
          <span style={{ color: heartColor, fontWeight: 700 }}>
            {heartPoints} pts
          </span>
        </div>
        <div style={{ width: 1, height: 12, background: '#1e1e2a' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12 }}>📍</span>
          <span style={{ color: '#7a7a8a' }}>Distance:</span>
          <span style={{ color: '#e8e8ed', fontWeight: 600 }}>
            {distanceKm} km
          </span>
        </div>
        <div style={{ width: 1, height: 12, background: '#1e1e2a' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12 }}>🔥</span>
          <span style={{ color: '#7a7a8a' }}>Active:</span>
          <span style={{ color: '#ffab40', fontWeight: 700 }}>
            {activeCals} kcal
          </span>
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
        borderRadius: 6, color: '#e8e8ed', fontSize: 11, fontWeight: 700,
        padding: '3px 0', cursor: 'pointer', lineHeight: 1.2,
      }}
    >{children}</button>
  );
}
