import { useState } from 'react';
import { saveGoal } from '../engine/storage.js';

const GOAL_TYPES = [
  { id: 'cut', label: 'Cut (Fat Loss)', desc: 'Caloric deficit, high protein retention' },
  { id: 'recomp', label: 'Recomposition', desc: 'Maintenance calories, build muscle & drop fat' },
  { id: 'bulk', label: 'Lean Bulk', desc: 'Controlled surplus for muscle growth' },
  { id: 'strength', label: 'Strength & Athletics', desc: 'Performance & recovery focused' },
];

export default function GoalModal({ goal, setGoal, onClose }) {
  const [text, setText] = useState(goal.text || '');
  const [goalType, setGoalType] = useState(goal.goalType || 'cut');
  const [targetWeight, setTargetWeight] = useState(goal.targetWeight_kg || 71);
  const [startWeight, setStartWeight] = useState(goal.startWeight_kg || 78);

  function handleSave() {
    if (!text.trim()) return;
    const updated = {
      ...goal,
      text: text.trim(),
      goalType,
      targetWeight_kg: Number(targetWeight) || 71,
      startWeight_kg: Number(startWeight) || 78,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setGoal(updated);
    saveGoal(updated);
    onClose();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: '#13131a', border: '1px solid #1e1e2a', borderRadius: 16,
        padding: 20, width: '100%', maxWidth: 440, color: '#e8e8ed',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>🎯 Your Fitness Goal</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#7a7a8a', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: '#7a7a8a', marginBottom: 16, lineHeight: 1.5 }}>
          Explain your goal in plain words. All nutrition coaching, adaptive targets, and workout overload recommendations will revolve around this.
        </div>

        {/* Goal Type Chips */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: '#4a4a5a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
            Goal Category
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {GOAL_TYPES.map(gt => (
              <button
                key={gt.id}
                onClick={() => setGoalType(gt.id)}
                style={{
                  background: goalType === gt.id ? '#1a1a2e' : '#0d0d14',
                  border: `1px solid ${goalType === gt.id ? '#b388ff' : '#1e1e2a'}`,
                  borderRadius: 8, padding: '8px 10px', textAlign: 'left',
                  cursor: 'pointer', color: goalType === gt.id ? '#b388ff' : '#7a7a8a',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{gt.label}</div>
                <div style={{ fontSize: 10, color: '#4a4a5a', marginTop: 2 }}>{gt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Goal Description Text */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: '#4a4a5a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
            Goal Description
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            placeholder="e.g. Cut to ~71 kg over 12 weeks with visible muscle definition while maintaining volleyball stamina and pull-up strength"
            style={{
              width: '100%', background: '#0d0d14', border: '1px solid #1e1e2a',
              borderRadius: 8, padding: '10px 12px', color: '#e8e8ed', fontSize: 13,
              lineHeight: 1.5, resize: 'none', outline: 'none',
            }}
          />
        </div>

        {/* Weight Targets */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: '#4a4a5a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
              Current Weight (kg)
            </label>
            <input
              type="number"
              step="0.5"
              value={startWeight}
              onChange={e => setStartWeight(e.target.value)}
              style={{
                width: '100%', background: '#0d0d14', border: '1px solid #1e1e2a',
                borderRadius: 8, padding: '8px 10px', color: '#e8e8ed', fontSize: 13,
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: '#4a4a5a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
              Target Weight (kg)
            </label>
            <input
              type="number"
              step="0.5"
              value={targetWeight}
              onChange={e => setTargetWeight(e.target.value)}
              style={{
                width: '100%', background: '#0d0d14', border: '1px solid #1e1e2a',
                borderRadius: 8, padding: '8px 10px', color: '#e8e8ed', fontSize: 13,
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            style={{
              flex: 1, background: '#b388ff', color: '#0a0a0f', border: 'none',
              borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700,
              cursor: text.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Save Goal
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid #2a2a3a', borderRadius: 10,
              padding: '10px 16px', color: '#7a7a8a', fontSize: 13, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
