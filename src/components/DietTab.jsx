import { useState, useMemo } from 'react';
import MealCard from './MealCard.jsx';
import TargetBar from './TargetBar.jsx';
import ImageUpload from './ImageUpload.jsx';
import { analyzeMealImage, analyzeMealsBatch } from '../engine/analyzer.js';
import { saveDiet } from '../engine/storage.js';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}
function formatDate(str) {
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
function nowTimeStr() {
  const d = new Date();
  let h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function DietTab({ dietMap, setDietMap, targets }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [text, setText] = useState('');
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // All unique dates with meals, sorted descending
  const loggedDates = useMemo(() => {
    const dates = [...new Set([...dietMap.values()].map(e => e.date))].sort().reverse();
    return dates;
  }, [dietMap]);

  // Meals for selected date
  const dayMeals = useMemo(() => {
    return [...dietMap.values()]
      .filter(e => e.date === selectedDate)
      .sort((a, b) => a.id - b.id);
  }, [dietMap, selectedDate]);

  const dayProtein = Math.round(dayMeals.reduce((s, e) => s + (e.protein_g || 0), 0) * 10) / 10;
  const dayCal = Math.round(dayMeals.reduce((s, e) => s + (e.calories || 0), 0));

  // Pending = saved but not yet analyzed
  const pendingMeals = useMemo(() =>
    [...dietMap.values()].filter(e => e.analyzed === false), [dietMap]);

  function handleLog() {
    if (!text.trim() && !imageData) return;
    setError('');
    const entry = {
      id: Date.now(),
      date: selectedDate,
      time: nowTimeStr(),
      summary: text.trim() || 'Photo meal',
      protein_g: 0,
      calories: 0,
      rating: 'ok',
      feedback: '',
      items: [],
      analyzed: false,
      ...(imageData ? { imageData } : {}),
    };
    const newMap = new Map(dietMap);
    newMap.set(entry.id, entry);
    setDietMap(newMap);
    saveDiet(newMap);
    setText('');
    setImageData(null);
  }

  async function handleAnalyze() {
    if (!pendingMeals.length || analyzing) return;
    setAnalyzing(true);
    setError('');
    try {
      const newMap = new Map(dietMap);
      const textMeals = pendingMeals.filter(e => !e.imageData);
      const imageMeals = pendingMeals.filter(e => !!e.imageData);

      if (textMeals.length > 0) {
        const results = await analyzeMealsBatch(textMeals, targets.cal);
        for (const r of results) {
          const existing = newMap.get(r.id);
          if (existing) newMap.set(r.id, { ...existing, ...r, analyzed: true });
        }
      }
      for (const e of imageMeals) {
        const result = await analyzeMealImage(e.imageData, e.summary, targets.cal);
        newMap.set(e.id, { ...e, ...result, analyzed: true });
      }
      setDietMap(newMap);
      saveDiet(newMap);
    } catch (err) {
      setError(err.message || 'Analysis failed — check API key');
    } finally {
      setAnalyzing(false);
    }
  }

  function handleDelete(id) {
    const newMap = new Map(dietMap);
    newMap.delete(id);
    setDietMap(newMap);
    saveDiet(newMap);
  }

  // Per-day stats for history list
  const dateStats = useMemo(() => {
    const stats = {};
    for (const entry of dietMap.values()) {
      if (!stats[entry.date]) stats[entry.date] = { pro: 0, cal: 0, meals: 0 };
      stats[entry.date].pro += entry.protein_g || 0;
      stats[entry.date].cal += entry.calories || 0;
      stats[entry.date].meals++;
    }
    return stats;
  }, [dietMap]);

  return (
    <div style={{ padding: '0 0 80px' }}>
      {/* Date selector */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2a' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedDate(todayStr())}
            style={quickBtnStyle(selectedDate === todayStr())}
          >Today</button>
          <button
            onClick={() => setSelectedDate(yesterdayStr())}
            style={quickBtnStyle(selectedDate === yesterdayStr())}
          >Yesterday</button>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            max={todayStr()}
            style={{
              background: '#13131a',
              border: '1px solid #1e1e2a',
              borderRadius: 8,
              padding: '5px 10px',
              color: '#e8e8ed',
              fontSize: 12,
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: 12, color: '#7a7a8a', marginLeft: 4 }}>
            {formatDate(selectedDate)}
          </span>
        </div>
      </div>

      {/* Daily progress */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e1e2a' }}>
        <TargetBar label="Protein" value={dayProtein} target={targets.pro} unit="g" color="#00e676" />
        <TargetBar label="Calories" value={dayCal} target={targets.cal} unit=" kcal" color="#ffab40" />
      </div>

      {/* Log input */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e1e2a' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What did you eat? e.g. 2 roti, big bowl moong dal, medium curd"
          rows={3}
          style={{
            width: '100%',
            background: '#0d0d14',
            border: '1px solid #1e1e2a',
            borderRadius: 10,
            padding: '10px 12px',
            color: '#e8e8ed',
            fontSize: 13,
            resize: 'vertical',
            outline: 'none',
            lineHeight: 1.5,
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && e.ctrlKey) handleLog();
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <ImageUpload
            label="Add Photo"
            onImage={(b64) => setImageData(b64)}
            compact={!!imageData}
          />
          <button
            onClick={handleLog}
            disabled={!text.trim() && !imageData}
            style={logBtnStyle(!text.trim() && !imageData)}
          >
            {imageData ? 'Log Photo' : 'Log Meal'}
          </button>
        </div>
        {error && (
          <div style={{ fontSize: 12, color: '#ff5252', marginTop: 8 }}>{error}</div>
        )}
      </div>

      {/* Analyze banner */}
      {pendingMeals.length > 0 && (
        <div style={{ padding: '0 16px 4px', display: 'flex', alignItems: 'center', gap: 10, background: '#0f0f1a', borderBottom: '1px solid #1e1e2a', paddingTop: 10, paddingBottom: 10 }}>
          <span style={{ fontSize: 12, color: '#7a7a8a', flex: 1 }}>
            {analyzing ? 'Analyzing…' : `${pendingMeals.length} meal${pendingMeals.length > 1 ? 's' : ''} pending analysis`}
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

      {/* Meal list */}
      <div style={{ padding: '14px 16px' }}>
        {dayMeals.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#4a4a5a', fontSize: 13, padding: '24px 0' }}>
            No meals logged for {formatDate(selectedDate)}
          </div>
        ) : (
          dayMeals.map(entry => (
            <MealCard key={entry.id} entry={entry} onDelete={handleDelete} />
          ))
        )}
      </div>

      {/* History */}
      {loggedDates.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontSize: 11, color: '#4a4a5a', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
            History
          </div>
          {loggedDates.map(date => {
            const s = dateStats[date] || {};
            const isSelected = date === selectedDate;
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                style={{
                  width: '100%',
                  background: isSelected ? '#1a1a2e' : '#13131a',
                  border: `1px solid ${isSelected ? '#3a3a5a' : '#1e1e2a'}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 13, color: isSelected ? '#b388ff' : '#e8e8ed' }}>
                  {formatDate(date)}
                </span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#00e676' }}>{s.pro || 0}g</span>
                  <span style={{ fontSize: 12, color: '#ffab40' }}>{s.cal || 0} kcal</span>
                  <span style={{ fontSize: 11, color: '#4a4a5a' }}>{s.meals || 0} meals</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function quickBtnStyle(active) {
  return {
    background: active ? '#1a1a2e' : '#13131a',
    border: `1px solid ${active ? '#3a3a5a' : '#1e1e2a'}`,
    borderRadius: 8,
    padding: '5px 12px',
    color: active ? '#b388ff' : '#7a7a8a',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
  };
}

function logBtnStyle(disabled) {
  return {
    background: disabled ? '#1a1a2a' : '#b388ff',
    color: disabled ? '#4a4a5a' : '#0a0a0f',
    border: 'none',
    borderRadius: 10,
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  };
}
