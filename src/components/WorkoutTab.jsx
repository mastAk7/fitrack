import { useState, useMemo } from 'react';
import { TRAINING_PLAN, dateToplanIndex } from '../data/trainingPlan.js';
import { savePlanMods, saveWork } from '../engine/storage.js';

function todayStr() { return new Date().toISOString().split('T')[0]; }
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
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

export default function WorkoutTab({ workMap, setWorkMap, planMods, setPlanMods }) {
  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [log, setLog] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPlan, setShowPlan] = useState(false);

  const planIdx = useMemo(() => dateToplanIndex(selectedDate), [selectedDate]);
  const plan = TRAINING_PLAN[planIdx];
  const mod = planMods[planIdx];
  const refExercises = mod || plan.exercises;
  const isModified = !!mod;

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
    const newMap = new Map(workMap);
    newMap.delete(id);
    setWorkMap(newMap);
    saveWork(newMap);
  }

  async function handleSave() {
    if (!log.trim()) return;
    setSaving(true);
    try {
      const lines = log.split('\n').map(l => l.trim()).filter(Boolean);
      const entry = {
        id: Date.now(),
        date: selectedDate,
        dayLabel: buildDayLabel(planIdx, selectedDate),
        exercises: lines,
        completed: countLogLines(log),
        total: countLogLines(log),
        notes: '',
      };
      const newMap = new Map(workMap);
      newMap.set(entry.id, entry);
      setWorkMap(newMap);
      saveWork(newMap);
      setLog('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
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
                  <button
                    onClick={() => handleDelete(w.id)}
                    style={{
                      background: 'none', border: 'none', color: '#3a3a4a',
                      cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0,
                    }}
                    title="Delete"
                  >×</button>
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
