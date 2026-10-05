import { useState, useMemo } from 'react';
import { TRAINING_PLAN, dateToplanIndex } from '../data/trainingPlan.js';
import { savePlanMods, saveWork, addTombstone, saveHealth } from '../engine/storage.js';
import { extractMusclesBatch } from '../engine/analyzer.js';
import { ACTIVITY_TYPES, calculateActivityCalories } from '../engine/activity.js';
import OverloadCard from './OverloadCard.jsx';
import { getOverloadTargets, getMuscleConsistencyStreaks } from '../engine/overloadEngine.js';

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr() { return localDateStr(); }
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return localDateStr(d);
}
function formatDate(str) {
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
function buildDayLabel(planIdx, dateStr) {
  const p = TRAINING_PLAN[planIdx];
  const d = new Date(dateStr + 'T12:00:00');
  const dn = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${p.label} — ${dn}`;
}

/** Count non-empty, non-comment lines in the log as "exercises done" */
function countLogLines(text) {
  return text.split('\n').filter(l => l.trim() && !l.trim().startsWith('//')).length;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const LOG_PLACEHOLDER = `Log what you actually did, e.g.

Pull-ups 5 × 4
DB rows 4 × 12 @ 10kg
DB flies 3 × 12 @ 6→8kg
Bicep curls 3 × 10 @ 8kg, drop to 6kg
Wrist curls 3 × 20
Plank 3 × 60s`;

export default function WorkoutTab({ workMap, setWorkMap, planMods, setPlanMods, healthMap = {}, setHealthMap }) {
  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [log, setLog] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Activity / Cardio logging state
  const [activityType, setActivityType] = useState('run');
  const [activityDist, setActivityDist] = useState('');
  const [activityDur, setActivityDur] = useState('');
  const [showActivityLogger, setShowActivityLogger] = useState(false);

  const dayActivities = useMemo(() => {
    return healthMap[selectedDate]?.activities || [];
  }, [healthMap, selectedDate]);

  const estimatedActCals = useMemo(() => {
    return calculateActivityCalories(activityType, {
      distance_km: activityDist,
      duration_min: activityDur,
      weight_kg: 78,
    });
  }, [activityType, activityDist, activityDur]);

  function handleSaveActivity() {
    if (!estimatedActCals && !activityDist && !activityDur) return;
    const actTypeObj = ACTIVITY_TYPES.find(a => a.id === activityType) || ACTIVITY_TYPES[0];
    const newAct = {
      id: Date.now(),
      type: activityType,
      name: actTypeObj.name,
      icon: actTypeObj.icon,
      distance_km: parseFloat(activityDist) || 0,
      duration_min: parseFloat(activityDur) || 0,
      calories: estimatedActCals,
      time: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };

    const currentHealth = healthMap[selectedDate] || { sleep_h: 0, water: 0, steps: 0, activities: [] };
    const currentActs = currentHealth.activities || [];
    const updatedActs = [...currentActs, newAct];
    const stepCals = Math.round((currentHealth.steps || 0) * 0.04);
    const totalActCals = updatedActs.reduce((s, a) => s + (a.calories || 0), 0) + stepCals;

    const newHealthMap = {
      ...healthMap,
      [selectedDate]: {
        ...currentHealth,
        activities: updatedActs,
        active_cals: totalActCals,
      },
    };

    setHealthMap?.(newHealthMap);
    saveHealth(newHealthMap);

    setActivityDist('');
    setActivityDur('');
  }

  function handleDeleteActivity(actId) {
    const currentHealth = healthMap[selectedDate] || { activities: [] };
    const updatedActs = (currentHealth.activities || []).filter(a => a.id !== actId);
    const stepCals = Math.round((currentHealth.steps || 0) * 0.04);
    const totalActCals = updatedActs.reduce((s, a) => s + (a.calories || 0), 0) + stepCals;

    const newHealthMap = {
      ...healthMap,
      [selectedDate]: {
        ...currentHealth,
        activities: updatedActs,
        active_cals: totalActCals,
      },
    };

    setHealthMap?.(newHealthMap);
    saveHealth(newHealthMap);
  }

  const planIdx = useMemo(() => dateToplanIndex(selectedDate), [selectedDate]);
  const plan = TRAINING_PLAN[planIdx];
  const mod = planMods[planIdx];
  const refExercises = mod || plan.exercises;
  const isModified = !!mod;

  const sleep_h = healthMap[selectedDate]?.sleep_h || 7;
  const overloadTargets = useMemo(() => {
    return getOverloadTargets(refExercises, workMap, sleep_h);
  }, [refExercises, workMap, sleep_h]);

  const consistency = useMemo(() => {
    return getMuscleConsistencyStreaks(workMap);
  }, [workMap]);

  const dayWorkouts = useMemo(() => {
    return [...workMap.values()]
      .filter(e => e.date === selectedDate)
      .sort((a, b) => a.id - b.id);
  }, [workMap, selectedDate]);

  function handleDateChange(dateStr) {
    setSelectedDate(dateStr);
    setLog('');
    setSaved(false);
  }

  function handleResetMod() {
    const newMods = { ...planMods };
    delete newMods[planIdx];
    setPlanMods(newMods);
    savePlanMods(newMods);
  }

  function handleDelete(id) {
    addTombstone(id);
    const newMap = new Map(workMap);
    newMap.delete(id);
    setWorkMap(newMap);
    saveWork(newMap);
    setConfirmDeleteId(null);
  }

  // All workouts with no muscle data (new pending + legacy unanalyzed)
  const pendingWorkouts = useMemo(() =>
    [...workMap.values()].filter(w => !w.muscles?.length), [workMap]);

  function handleSave() {
    if (!log.trim()) return;
    setSaving(true);
    const lines = log.split('\n').map(l => l.trim()).filter(Boolean);
    const entry = {
      id: Date.now(),
      date: selectedDate,
      dayLabel: buildDayLabel(planIdx, selectedDate),
      exercises: lines,
      completed: countLogLines(log),
      total: countLogLines(log),
      notes: '',
      muscles: [],
    };
    const newMap = new Map(workMap);
    newMap.set(entry.id, entry);
    setWorkMap(newMap);
    saveWork(newMap);
    setLog('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  }

  async function handleAnalyze() {
    if (!pendingWorkouts.length || analyzing) return;
    setAnalyzing(true);
    try {
      const results = await extractMusclesBatch(pendingWorkouts);
      const newMap = new Map(workMap);
      for (const r of results) {
        const existing = newMap.get(r.id);
        if (existing) newMap.set(r.id, { ...existing, muscles: r.muscles || [] });
      }
      setWorkMap(newMap);
      saveWork(newMap);
    } catch (err) {
      console.error('Batch muscle extraction error:', err);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div style={{ padding: '0 0 80px' }}>

      {/* Date selector */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2a' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => handleDateChange(today)} style={quickBtnStyle(selectedDate === today)}>Today</button>
          <button onClick={() => handleDateChange(yesterdayStr())} style={quickBtnStyle(selectedDate === yesterdayStr())}>Yesterday</button>
          <input
            type="date"
            value={selectedDate}
            onChange={e => handleDateChange(e.target.value)}
            max={today}
            style={{
              background: '#13131a', border: '1px solid #1e1e2a', borderRadius: 8,
              padding: '5px 10px', color: '#e8e8ed', fontSize: 12, cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: 12, color: '#7a7a8a' }}>{formatDate(selectedDate)}</span>
        </div>
      </div>

      {/* Day selector */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e1e2a' }}>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
          {DAY_LABELS.map((d, i) => (
            <button
              key={i}
              onClick={() => {
                const base = new Date(selectedDate + 'T12:00:00');
                const dayOfWeek = base.getDay() === 0 ? 6 : base.getDay() - 1;
                const weekStart = new Date(base);
                weekStart.setDate(base.getDate() - dayOfWeek);
                weekStart.setDate(weekStart.getDate() + i);
                handleDateChange(weekStart.toISOString().split('T')[0]);
              }}
              style={{
                background: planIdx === i ? '#1a1a2e' : '#13131a',
                border: `1px solid ${planIdx === i ? '#3a3a5a' : '#1e1e2a'}`,
                borderRadius: 8, padding: '6px 10px',
                color: planIdx === i ? '#b388ff' : '#7a7a8a',
                fontSize: 12, cursor: 'pointer',
                fontWeight: planIdx === i ? 600 : 400, flexShrink: 0,
              }}
            >{d}</button>
          ))}
        </div>
      </div>

      {/* Plan header + collapsible reference */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#e8e8ed' }}>{plan.day} — {plan.label}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {isModified && (
              <>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: '#b388ff',
                  background: '#b388ff15', border: '1px solid #b388ff30',
                  borderRadius: 6, padding: '2px 8px',
                }}>Modified</span>
                <button onClick={handleResetMod} style={{
                  background: '#1a1a2a', border: '1px solid #2a2a3a', borderRadius: 6,
                  padding: '3px 8px', color: '#7a7a8a', fontSize: 11, cursor: 'pointer',
                }}>Reset</button>
              </>
            )}
            <button
              onClick={() => setShowPlan(p => !p)}
              style={{
                background: '#13131a', border: '1px solid #1e1e2a', borderRadius: 6,
                padding: '4px 10px', color: '#7a7a8a', fontSize: 11, cursor: 'pointer',
              }}
            >{showPlan ? 'Hide plan' : 'View plan'}</button>
          </div>
        </div>

        {/* Collapsible reference list */}
        {showPlan && (
          <div style={{ marginTop: 10 }}>
            {refExercises.map((ex, i) => (
              <div key={i} style={{
                fontSize: 12, color: '#7a7a8a', padding: '5px 0',
                borderBottom: i < refExercises.length - 1 ? '1px solid #1a1a24' : 'none',
              }}>
                {ex}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workout log input */}
      <div style={{ padding: '14px 16px' }}>
        {/* Dynamic Progressive Overload Target Card */}
        <OverloadCard
          targets={overloadTargets}
          consistency={consistency}
          sleep_h={sleep_h}
        />

        <div style={{ fontSize: 11, color: '#4a4a5a', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>
          Workout Log
        </div>
        <textarea
          value={log}
          onChange={e => setLog(e.target.value)}
          placeholder={LOG_PLACEHOLDER}
          rows={10}
          style={{
            width: '100%',
            background: '#0d0d14',
            border: '1px solid #1e1e2a',
            borderRadius: 10,
            padding: '12px 14px',
            color: '#e8e8ed',
            fontSize: 13,
            resize: 'vertical',
            outline: 'none',
            lineHeight: 1.7,
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        {log.trim() && (
          <div style={{ fontSize: 11, color: '#4a4a5a', marginTop: 6 }}>
            {countLogLines(log)} exercise{countLogLines(log) !== 1 ? 's' : ''} logged
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !log.trim()}
          style={{
            marginTop: 10,
            background: saved ? '#00e67620' : !log.trim() ? '#1a1a2a' : '#b388ff',
            color: saved ? '#00e676' : !log.trim() ? '#4a4a5a' : '#0a0a0f',
            border: saved ? '1px solid #00e67640' : 'none',
            borderRadius: 10, padding: '10px 20px',
            fontSize: 13, fontWeight: 600,
            cursor: saving || !log.trim() ? 'not-allowed' : 'pointer',
            width: '100%', transition: 'all 0.2s',
          }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Workout'}
        </button>

        {/* Analyze banner */}
        {pendingWorkouts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, background: '#1a1a2a', borderRadius: 10, padding: '10px 14px' }}>
            <span style={{ fontSize: 12, color: '#7a7a8a', flex: 1 }}>
              {analyzing ? 'Extracting muscles…' : `${pendingWorkouts.length} workout${pendingWorkouts.length > 1 ? 's' : ''} need muscle analysis`}
            </span>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{
                background: analyzing ? '#1e1e2a' : '#b388ff',
                border: 'none',
                borderRadius: 8,
                color: analyzing ? '#4a4a5a' : '#0a0a0f',
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 14px',
                cursor: analyzing ? 'not-allowed' : 'pointer',
              }}
            >
              {analyzing ? 'Analyzing…' : 'Analyze'}
            </button>
          </div>
        )}
      </div>

      {/* Activity & Cardio Logging (Runs, Walks, Sports) */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{
          background: '#13131a',
          border: '1px solid #1e1e2a',
          borderRadius: 14,
          padding: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🏃</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8ed' }}>Cardio, Runs & Activities</div>
                <div style={{ fontSize: 10, color: '#7a7a8a' }}>Boosts today's maintenance calories dynamically</div>
              </div>
            </div>
            <button
              onClick={() => setShowActivityLogger(s => !s)}
              style={{
                background: showActivityLogger ? '#1a1a2e' : '#1e1e2a',
                border: `1px solid ${showActivityLogger ? '#b388ff50' : '#2a2a3a'}`,
                borderRadius: 8, padding: '4px 10px',
                color: showActivityLogger ? '#b388ff' : '#e8e8ed',
                fontSize: 11, cursor: 'pointer', fontWeight: 600,
              }}
            >
              {showActivityLogger ? 'Close' : '+ Log Activity'}
            </button>
          </div>

          {/* Form */}
          {showActivityLogger && (
            <div style={{ marginTop: 12, borderTop: '1px solid #1e1e2a', paddingTop: 12 }}>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 10 }}>
                {ACTIVITY_TYPES.map(act => (
                  <button
                    key={act.id}
                    onClick={() => setActivityType(act.id)}
                    style={{
                      background: activityType === act.id ? '#1f1b2e' : '#0d0d14',
                      border: `1px solid ${activityType === act.id ? '#b388ff' : '#1e1e2a'}`,
                      borderRadius: 8, padding: '5px 10px',
                      color: activityType === act.id ? '#b388ff' : '#7a7a8a',
                      fontSize: 11, cursor: 'pointer', fontWeight: 500, flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <span>{act.icon}</span>
                    <span>{act.name}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {(activityType === 'run' || activityType === 'walk' || activityType === 'cycling' || activityType === 'swimming') && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#7a7a8a', marginBottom: 4 }}>Distance (km)</div>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 5.0"
                      value={activityDist}
                      onChange={e => setActivityDist(e.target.value)}
                      style={{
                        width: '100%', background: '#0d0d14', border: '1px solid #1e1e2a',
                        borderRadius: 8, padding: '7px 10px', color: '#e8e8ed', fontSize: 12, outline: 'none',
                      }}
                    />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#7a7a8a', marginBottom: 4 }}>Duration (mins)</div>
                  <input
                    type="number"
                    step="1"
                    placeholder="e.g. 30"
                    value={activityDur}
                    onChange={e => setActivityDur(e.target.value)}
                    style={{
                      width: '100%', background: '#0d0d14', border: '1px solid #1e1e2a',
                      borderRadius: 8, padding: '7px 10px', color: '#e8e8ed', fontSize: 12, outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 12, color: '#ffab40', fontWeight: 600 }}>
                  {estimatedActCals > 0 ? `🔥 ~${estimatedActCals} kcal burned` : 'Enter distance or minutes'}
                </span>
                <button
                  onClick={handleSaveActivity}
                  disabled={!estimatedActCals}
                  style={{
                    background: estimatedActCals ? '#00e676' : '#1e1e2a',
                    color: estimatedActCals ? '#0a0a0f' : '#4a4a5a',
                    border: 'none', borderRadius: 8, padding: '6px 14px',
                    fontSize: 12, fontWeight: 700, cursor: estimatedActCals ? 'pointer' : 'not-allowed',
                  }}
                >
                  Log & Boost Maintenance
                </button>
              </div>
            </div>
          )}

          {/* List of today's activities */}
          {dayActivities.length > 0 && (
            <div style={{ marginTop: 10, borderTop: '1px solid #1e1e2a', paddingTop: 10 }}>
              {dayActivities.map(act => (
                <div key={act.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#0d0d14', border: '1px solid #1e1e2a', borderRadius: 8,
                  padding: '7px 10px', marginBottom: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>{act.icon || '🔥'}</span>
                    <div>
                      <div style={{ fontSize: 12, color: '#e8e8ed', fontWeight: 500 }}>
                        {act.name}
                        {act.distance_km > 0 ? ` · ${act.distance_km} km` : ''}
                        {act.duration_min > 0 ? ` (${act.duration_min} min)` : ''}
                      </div>
                      <div style={{ fontSize: 10, color: '#7a7a8a' }}>{act.time}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#00e676', fontWeight: 700 }}>
                      +{act.calories} kcal
                    </span>
                    <button
                      onClick={() => handleDeleteActivity(act.id)}
                      style={{ background: 'none', border: 'none', color: '#4a4a5a', cursor: 'pointer', fontSize: 14 }}
                      title="Delete activity"
                    >×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logged sessions for this date */}
      {dayWorkouts.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontSize: 11, color: '#4a4a5a', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
            Logged — {formatDate(selectedDate)}
          </div>
          {dayWorkouts.map(w => (
            <div key={w.id} style={{
              background: '#13131a', border: '1px solid #1e1e2a',
              borderRadius: 14, padding: '12px 14px', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#b388ff', fontWeight: 500 }}>{w.dayLabel}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#4a4a5a' }}>{w.completed} exercises</span>
                  {confirmDeleteId === w.id ? (
                    <>
                      <button onClick={() => handleDelete(w.id)} style={{ background: '#ff525215', border: '1px solid #ff525240', borderRadius: 6, color: '#ff5252', fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>Delete</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={{ background: 'none', border: '1px solid #2a2a3a', borderRadius: 6, color: '#7a7a8a', fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(w.id)} style={{ background: 'none', border: 'none', color: '#3a3a4a', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }} title="Delete">×</button>
                  )}
                </div>
              </div>
              {w.exercises?.map((line, i) => (
                <div key={i} style={{
                  fontSize: 13, color: '#c8c8d8', lineHeight: 1.6,
                  borderBottom: i < w.exercises.length - 1 ? '1px solid #1a1a24' : 'none',
                  padding: '3px 0',
                }}>
                  {line}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function quickBtnStyle(active) {
  return {
    background: active ? '#1a1a2e' : '#13131a',
    border: `1px solid ${active ? '#3a3a5a' : '#1e1e2a'}`,
    borderRadius: 8, padding: '5px 12px',
    color: active ? '#b388ff' : '#7a7a8a',
    fontSize: 12, cursor: 'pointer', fontWeight: active ? 600 : 400,
  };
}
