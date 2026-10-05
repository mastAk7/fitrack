import { useState } from 'react';
import { saveHealth } from '../engine/storage.js';
import { isGoogleFitConnected, fetchGoogleFitDailySummary, mergeFitDataIntoHealthMap } from '../engine/googleFit.js';
import { calculateStepCalories } from '../engine/activity.js';

const SLEEP_TARGET = 8;
const WATER_TARGET = 8;
const STEPS_TARGET = 10000;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export default function HealthWidget({ date, healthMap, setHealthMap }) {
  const entry = healthMap[date] || { sleep_h: 0, water: 0, steps: 0, active_cals: 0 };
  const [syncingFit, setSyncingFit] = useState(false);
  const [fitMsg, setFitMsg] = useState('');
  const fitConnected = isGoogleFitConnected();

  function update(field, delta) {
    let limits = [0, 20];
    if (field === 'sleep_h') limits = [0, 14];
    if (field === 'steps') limits = [0, 50000];

    const currentVal = entry[field] || 0;
    const next = clamp(currentVal + delta, limits[0], limits[1]);
    const updatedEntry = { ...entry, [field]: next };

    // Auto-update active_cals if steps changed
    if (field === 'steps') {
      const stepCals = calculateStepCalories(next);
      const activityCals = (entry.activities || []).reduce((s, a) => s + (Number(a.calories) || 0), 0);
      updatedEntry.active_cals = stepCals + activityCals;
    }

    const newMap = { ...healthMap, [date]: updatedEntry };
    setHealthMap(newMap);
    saveHealth(newMap);
  }

  async function handleGoogleFitSync() {
    if (!fitConnected || syncingFit) return;
    setSyncingFit(true);
    setFitMsg('');
    try {
      const results = await fetchGoogleFitDailySummary(7);
      const updatedMap = mergeFitDataIntoHealthMap(healthMap, results);
      setHealthMap(updatedMap);
      saveHealth(updatedMap);
      setFitMsg('Synced ✓');
      setTimeout(() => setFitMsg(''), 2500);
    } catch (err) {
      setFitMsg('Sync error');
      setTimeout(() => setFitMsg(''), 3000);
    } finally {
      setSyncingFit(false);
    }
  }

  const sleepPct = Math.min(100, ((entry.sleep_h || 0) / SLEEP_TARGET) * 100);
  const waterPct = Math.min(100, ((entry.water || 0) / WATER_TARGET) * 100);
  const stepsVal = entry.steps || 0;
  const stepsPct = Math.min(100, (stepsVal / STEPS_TARGET) * 100);

  const sleepColor = entry.sleep_h >= SLEEP_TARGET ? '#b388ff' : entry.sleep_h >= 6 ? '#ffab40' : '#ff5252';
  const waterColor = entry.water >= WATER_TARGET ? '#00bcd4' : entry.water >= 5 ? '#ffab40' : '#ff5252';
  const stepsColor = stepsVal >= STEPS_TARGET ? '#00e676' : stepsVal >= 6000 ? '#ffab40' : '#b388ff';

  return (
    <div style={{
      display: 'flex', gap: 8,
      padding: '12px 16px',
      borderBottom: '1px solid #1e1e2a',
      overflowX: 'auto',
    }}>
      {/* Sleep */}
      <div style={{ flex: 1, minWidth: 120, background: '#0d0d14', border: '1px solid #1e1e2a', borderRadius: 12, padding: '10px 10px' }}>
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
      <div style={{ flex: 1, minWidth: 120, background: '#0d0d14', border: '1px solid #1e1e2a', borderRadius: 12, padding: '10px 10px' }}>
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

      {/* Steps & Active Burn */}
      <div style={{ flex: 1.2, minWidth: 140, background: '#0d0d14', border: '1px solid #1e1e2a', borderRadius: 12, padding: '10px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: '#7a7a8a', fontWeight: 600 }}>Steps</span>
            {fitConnected && (
              <button
                onClick={handleGoogleFitSync}
                disabled={syncingFit}
                title="Sync from Google Fit"
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 10, color: fitMsg ? '#00e676' : '#4a80f0',
                  cursor: 'pointer', fontWeight: 600,
                }}
              >
                {syncingFit ? '⟳' : fitMsg || '●Fit'}
              </button>
            )}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: stepsColor }}>
            {stepsVal >= 1000 ? `${(stepsVal / 1000).toFixed(1)}k` : stepsVal}
            <span style={{ fontSize: 10, color: '#4a4a5a', fontWeight: 400 }}>/10k</span>
          </span>
        </div>
        <div style={{ height: 4, background: '#1e1e2a', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${stepsPct}%`, background: stepsColor, borderRadius: 2, transition: 'width 0.2s' }} />
        </div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <StepBtn onClick={() => update('steps', -1000)}>-1k</StepBtn>
          <StepBtn onClick={() => update('steps', 1000)}>+1k</StepBtn>
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
