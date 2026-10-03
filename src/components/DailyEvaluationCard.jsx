import { useMemo } from 'react';
import { calculateDailyScore, calculateAthleteProfile } from '../engine/evaluation.js';

const GRADE_COLORS = {
  S: '#00e676',
  A: '#b388ff',
  B: '#ffab40',
  C: '#ff9100',
  D: '#ff5252',
};

export default function DailyEvaluationCard({ dayAgg, targets, hasWorkout, health, dietMap, workMap, healthMap }) {
  const dayScore = useMemo(() => {
    return calculateDailyScore(dayAgg, targets, hasWorkout, health);
  }, [dayAgg, targets, hasWorkout, health]);

  const athlete = useMemo(() => {
    return calculateAthleteProfile(dietMap, workMap, targets, healthMap);
  }, [dietMap, workMap, targets, healthMap]);

  const gradeColor = GRADE_COLORS[dayScore.grade] || '#00e676';

  return (
    <div style={{
      background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 16,
      padding: '14px 16px', marginBottom: 14,
    }}>
      {/* Top row: Grade & Score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: '#7a7a8a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Daily Recomp Performance
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e8e8ed', marginTop: 2 }}>
            Score: <span style={{ color: gradeColor }}>{dayScore.score}</span> / 100
          </div>
        </div>

        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: `${gradeColor}18`, border: `2px solid ${gradeColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800, color: gradeColor,
        }}>
          {dayScore.grade}
        </div>
      </div>

      {/* 4-Pillar Itemized Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div style={{ background: '#0a0a0f', padding: '6px 10px', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: '#7a7a8a' }}>Protein (35%)</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#00e676' }}>
            {dayScore.breakdown.protein.points} <span style={{ fontSize: 10, color: '#4a4a5a' }}>/ 35</span>
          </div>
        </div>

        <div style={{ background: '#0a0a0f', padding: '6px 10px', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: '#7a7a8a' }}>Deficit Accuracy (25%)</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#ffab40' }}>
            {dayScore.breakdown.calories.points} <span style={{ fontSize: 10, color: '#4a4a5a' }}>/ 25</span>
          </div>
        </div>

        <div style={{ background: '#0a0a0f', padding: '6px 10px', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: '#7a7a8a' }}>Workout & Overload (25%)</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#b388ff' }}>
            {dayScore.breakdown.workout.points} <span style={{ fontSize: 10, color: '#4a4a5a' }}>/ 25</span>
          </div>
        </div>

        <div style={{ background: '#0a0a0f', padding: '6px 10px', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: '#7a7a8a' }}>Recovery & Sleep (15%)</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#4fc3f7' }}>
            {dayScore.breakdown.recovery.points} <span style={{ fontSize: 10, color: '#4a4a5a' }}>/ 15</span>
          </div>
        </div>
      </div>

      {/* Athlete Rank & Level */}
      <div style={{ borderTop: '1px solid #1a1a26', paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#b388ff' }}>
            Level {athlete.level} · {athlete.rankTitle}
          </span>
          <span style={{ fontSize: 10, color: '#7a7a8a' }}>
            {athlete.currentLevelProgress}/100 XP
          </span>
        </div>
        <div style={{ height: 5, background: '#1a1a26', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${athlete.currentLevelProgress}%`,
            background: 'linear-gradient(90deg, #b388ff, #00e676)',
            borderRadius: 3, transition: 'width 0.3s',
          }} />
        </div>

        {/* Badges preview */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
          {athlete.badges.map(b => (
            <div
              key={b.id}
              title={`${b.name}: ${b.desc}`}
              style={{
                background: b.unlocked ? '#1a1a28' : '#0d0d12',
                border: `1px solid ${b.unlocked ? '#b388ff40' : '#1e1e24'}`,
                opacity: b.unlocked ? 1 : 0.4,
                borderRadius: 8, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: b.unlocked ? '#e8e8ed' : '#5a5a6a', flexShrink: 0,
              }}
            >
              <span>{b.icon}</span>
              <span style={{ fontSize: 10 }}>{b.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
