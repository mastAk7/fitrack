import { useState, useMemo } from 'react';
import ExerciseRow from './ExerciseRow.jsx';
import { TRAINING_PLAN, dateToplanIndex } from '../data/trainingPlan.js';
import { loadPlanMods, savePlanMods, saveWork } from '../engine/storage.js';

function todayStr() { return new Date().toISOString().split('T')[0]; }
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}
function formatDate(str) {
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
function dayLabel(planIdx, dateStr) {
  const p = TRAINING_PLAN[planIdx];
  const d = new Date(dateStr + 'T12:00:00');
  const dayName = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${p.label} — ${dayName}`;
}

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function WorkoutTab({ workMap, setWorkMap, planMods, setPlanMods }) {
  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [checked, setChecked] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Plan index based on date
  const planIdx = useMemo(() => dateToplanIndex(selectedDate), [selectedDate]);
  const plan = TRAINING_PLAN[planIdx];
  const mod = planMods[planIdx];
  const exercises = mod ? mod : plan.exercises;
  const isModified = !!mod;

  // Workouts for selected date
  const dayWorkouts = useMemo(() => {
    return [...workMap.values()]
      .filter(e => e.date === selectedDate)
      .sort((a, b) => a.id - b.id);
  }, [workMap, selectedDate]);

  function handleDateChange(dateStr) {
    setSelectedDate(dateStr);
    setChecked({});
    setNotes('');
    setSaved(false);
  }

  function handleResetMod() {
    const newMods = { ...planMods };
    delete newMods[planIdx];
    setPlanMods(newMods);
    savePlanMods(newMods);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const completedExercises = exercises.filter((_, i) => checked[i]);
      const entry = {
        id: Date.now(),
        date: selectedDate,
        dayLabel: dayLabel(planIdx, selectedDate),
        exercises: completedExercises.length > 0 ? completedExercises : exercises,
        completed: Object.values(checked).filter(Boolean).length,
        total: exercises.length,
        notes: notes.trim(),
      };
      const newMap = new Map(workMap);
      newMap.set(entry.id, entry);
      setWorkMap(newMap);
      saveWork(newMap);
      setChecked({});
      setNotes('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const completedCount = Object.values(checked).filter(Boolean).length;

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
        </div>
      </div>

      {/* Day selector */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2a' }}>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
          {DAY_LABELS.map((d, i) => (
            <button
              key={i}
              onClick={() => {
                // Set the selected date to the nearest occurrence of this weekday
                const base = new Date(selectedDate + 'T12:00:00');
                // planIdx 0=Mon, 6=Sun; getDay() 0=Sun
                const targetJsDay = i === 6 ? 0 : i + 1;
                const diff = (targetJsDay - base.getDay() + 7) % 7;
                const newD = new Date(base);
                newD.setDate(newD.getDate() - ((7 - diff) % 7 === 0 ? 0 : (7 - diff) % 7));
                // Actually just pick the day within the same week
                const weekStart = new Date(base);
                const dayOfWeek = base.getDay() === 0 ? 6 : base.getDay() - 1; // Mon=0
                weekStart.setDate(base.getDate() - dayOfWeek);
                weekStart.setDate(weekStart.getDate() + i);
                const ds = weekStart.toISOString().split('T')[0];
                handleDateChange(ds);
              }}
              style={{
                background: planIdx === i ? '#1a1a2e' : '#13131a',
                border: `1px solid ${planIdx === i ? '#3a3a5a' : '#1e1e2a'}`,
                borderRadius: 8,
                padding: '6px 10px',
                color: planIdx === i ? '#b388ff' : '#7a7a8a',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: planIdx === i ? 600 : 400,
                flexShrink: 0,
              }}
            >{d}</button>
          ))}
        </div>
      </div>

      {/* Plan header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e1e2a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#e8e8ed' }}>{plan.day}</div>
            <div style={{ fontSize: 12, color: '#7a7a8a', marginTop: 2 }}>{plan.label}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {isModified && (
              <>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: '#b388ff',
                  background: '#b388ff15', border: '1px solid #b388ff30',
                  borderRadius: 6, padding: '2px 8px',
                }}>Modified</span>
                <button
                  onClick={handleResetMod}
                  style={{
                    background: '#1a1a2a', border: '1px solid #2a2a3a', borderRadius: 6,
                    padding: '3px 8px', color: '#7a7a8a', fontSize: 11, cursor: 'pointer',
                  }}
                >Reset</button>
              </>
            )}
            <span style={{ fontSize: 12, color: '#7a7a8a' }}>
              {completedCount}/{exercises.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: '#1e1e2a', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0}%`,
            background: '#b388ff',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Exercise list */}
      <div style={{ padding: '0 16px' }}>
        {exercises.map((ex, i) => (
          <ExerciseRow
            key={i}
            exercise={ex}
            checked={!!checked[i]}
            onChange={val => setChecked(prev => ({ ...prev, [i]: val }))}
          />
        ))}
      </div>

      {/* Notes + save */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid #1e1e2a', marginTop: 8 }}>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Workout notes (optional) — e.g. increased DB to 10kg, felt strong"
          rows={3}
          style={{
            width: '100%', background: '#0d0d14', border: '1px solid #1e1e2a',
            borderRadius: 10, padding: '10px 12px', color: '#e8e8ed',
            fontSize: 13, resize: 'vertical', outline: 'none', lineHeight: 1.5,
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            marginTop: 10,
            background: saved ? '#00e67620' : '#b388ff',
            color: saved ? '#00e676' : '#0a0a0f',
            border: saved ? '1px solid #00e67640' : 'none',
            borderRadius: 10, padding: '10px 20px',
            fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
            width: '100%', transition: 'all 0.2s',
          }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Workout'}
        </button>
      </div>

      {/* Previous logs for this date */}
      {dayWorkouts.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontSize: 11, color: '#4a4a5a', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
            Logged Today
          </div>
          {dayWorkouts.map(w => (
            <div key={w.id} style={{
              background: '#13131a', border: '1px solid #1e1e2a',
              borderRadius: 14, padding: '12px 14px', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#e8e8ed', fontWeight: 500 }}>{w.dayLabel}</span>
                <span style={{ fontSize: 12, color: '#b388ff' }}>{w.completed}/{w.total}</span>
              </div>
              {w.notes && (
                <div style={{ fontSize: 12, color: '#7a7a8a' }}>{w.notes}</div>
              )}
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
