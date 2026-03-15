import { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import StatCard from './StatCard.jsx';
import { getDailyAggregates, getProteinStreak } from '../engine/adaptive.js';

const RATING_COLORS = {
  good: '#00e676',
  ok: '#ffab40',
  low_protein: '#ff5252',
  too_many_calories: '#ff5252',
};

export default function AnalyticsTab({ dietMap, workMap, targets }) {
  const dailyAgg = useMemo(() => getDailyAggregates(dietMap, 14), [dietMap]);

  const avgPro = useMemo(() => {
    if (dailyAgg.length === 0) return 0;
    return Math.round(dailyAgg.reduce((s, d) => s + d.pro, 0) / dailyAgg.length);
  }, [dailyAgg]);

  const avgCal = useMemo(() => {
    if (dailyAgg.length === 0) return 0;
    return Math.round(dailyAgg.reduce((s, d) => s + d.cal, 0) / dailyAgg.length);
  }, [dailyAgg]);

  const hitRate = useMemo(() => {
    if (dailyAgg.length === 0) return 0;
    const hits = dailyAgg.filter(d => d.pro >= 130).length;
    return Math.round((hits / dailyAgg.length) * 100);
  }, [dailyAgg]);

  // Workout sessions last 14 days
  const workSessions = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return [...workMap.values()].filter(w => w.date >= cutoffStr).length;
  }, [workMap]);

  // Protein streak
  const proStreak = useMemo(() => getProteinStreak(dietMap), [dietMap]);

  // Chart data
  const chartData = useMemo(() => {
    return dailyAgg.map(d => ({
      date: d.date.slice(5), // MM-DD
      pro: d.pro,
      cal: d.cal,
      proColor: d.pro >= targets.pro ? '#00e676' : '#b388ff',
    }));
  }, [dailyAgg, targets]);

  // Heatmap: last 28 days
  const heatmap = useMemo(() => {
    const workDates = new Set([...workMap.values()].map(w => w.date));
    const days = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      days.push({ date: ds, has: workDates.has(ds) });
    }
    return days;
  }, [workMap]);

  // Meal quality breakdown
  const qualityBreakdown = useMemo(() => {
    const counts = { good: 0, ok: 0, low_protein: 0, too_many_calories: 0 };
    let total = 0;
    for (const e of dietMap.values()) {
      if (e.rating && counts[e.rating] !== undefined) {
        counts[e.rating]++;
        total++;
      }
    }
    return { counts, total };
  }, [dietMap]);

  const tooltipStyle = {
    background: '#13131a',
    border: '1px solid #1e1e2a',
    borderRadius: 8,
    fontSize: 12,
    color: '#e8e8ed',
  };

  return (
    <div style={{ padding: '16px 16px 80px' }}>
      {/* Adaptive targets card */}
      <div style={{
        background: '#13131a', border: '1px solid #1e1e2a',
        borderRadius: 14, padding: '14px 16px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#e8e8ed' }}>Adaptive Targets</div>
          <span style={{
            fontSize: 11, color: '#b388ff', background: '#b388ff15',
            border: '1px solid #b388ff30', borderRadius: 6, padding: '2px 10px', fontWeight: 600,
          }}>
            Week {targets.week} · {targets.phase}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#00e676' }}>{targets.pro}g</div>
            <div style={{ fontSize: 11, color: '#7a7a8a' }}>Protein target</div>
          </div>
          <div style={{ width: 1, background: '#1e1e2a' }} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#ffab40' }}>{targets.cal}</div>
            <div style={{ fontSize: 11, color: '#7a7a8a' }}>Calorie target</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#4a4a5a', marginTop: 10 }}>
          Targets adapt weekly based on your logged progress.
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <StatCard
          label="Avg Protein / day"
          value={avgPro}
          unit="g"
          color={avgPro >= 130 ? '#00e676' : '#ff5252'}
          sub="last 14 logged days"
        />
        <StatCard
          label="Avg Calories / day"
          value={avgCal}
          color={avgCal <= targets.cal * 1.1 ? '#ffab40' : '#ff5252'}
          sub="last 14 logged days"
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <StatCard
          label="Protein Hit Rate"
          value={hitRate}
          unit="%"
          color="#00e676"
          sub="days ≥ 130g protein"
        />
        <StatCard
          label="Workout Sessions"
          value={workSessions}
          color="#b388ff"
          sub="last 14 days"
        />
      </div>

      {/* Protein chart */}
      {chartData.length > 0 && (
        <div style={{ background: '#13131a', border: '1px solid #1e1e2a', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8ed', marginBottom: 12 }}>Protein Trend (14 days)</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="date" tick={{ fill: '#4a4a5a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a4a5a', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: '#7a7a8a' }}
                formatter={v => [`${v}g`, 'Protein']}
              />
              <ReferenceLine y={targets.pro} stroke="#00e676" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Line
                type="monotone"
                dataKey="pro"
                stroke="#b388ff"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle
                      key={`dot-${cx}-${cy}`}
                      cx={cx} cy={cy} r={4}
                      fill={payload.proColor}
                      stroke="none"
                    />
                  );
                }}
                activeDot={{ r: 5, fill: '#e8e8ed' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Calorie chart */}
      {chartData.length > 0 && (
        <div style={{ background: '#13131a', border: '1px solid #1e1e2a', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8ed', marginBottom: 12 }}>Calorie Bars (14 days)</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="date" tick={{ fill: '#4a4a5a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a4a5a', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: '#7a7a8a' }}
                formatter={v => [`${v} kcal`, 'Calories']}
              />
              <ReferenceLine y={targets.cal} stroke="#ffab40" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Bar dataKey="cal" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.cal > targets.cal * 1.08 ? '#ff5252' : '#ffab40'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Workout heatmap */}
      <div style={{ background: '#13131a', border: '1px solid #1e1e2a', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8ed', marginBottom: 12 }}>Workout Heatmap (28 days)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {heatmap.map((d, i) => (
            <div
              key={i}
              title={d.date}
              style={{
                height: 28,
                background: d.has ? '#b388ff40' : '#1e1e2a',
                borderRadius: 4,
                border: d.has ? '1px solid #b388ff50' : '1px solid transparent',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, background: '#b388ff40', borderRadius: 3, border: '1px solid #b388ff50' }} />
            <span style={{ fontSize: 11, color: '#7a7a8a' }}>Workout</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, background: '#1e1e2a', borderRadius: 3 }} />
            <span style={{ fontSize: 11, color: '#7a7a8a' }}>Rest</span>
          </div>
        </div>
      </div>

      {/* Meal quality breakdown */}
      {qualityBreakdown.total > 0 && (
        <div style={{ background: '#13131a', border: '1px solid #1e1e2a', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8ed', marginBottom: 12 }}>Meal Quality (all time)</div>
          {[
            { key: 'good', label: 'Good' },
            { key: 'ok', label: 'OK' },
            { key: 'low_protein', label: 'Low Protein' },
            { key: 'too_many_calories', label: 'High Calories' },
          ].map(({ key, label }) => {
            const count = qualityBreakdown.counts[key];
            const pct = Math.round((count / qualityBreakdown.total) * 100);
            return (
              <div key={key} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#7a7a8a' }}>{label}</span>
                  <span style={{ fontSize: 12, color: RATING_COLORS[key] }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: 5, background: '#1e1e2a', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: RATING_COLORS[key], borderRadius: 3,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Streaks */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{
          flex: 1, background: '#13131a', border: '1px solid #1e1e2a',
          borderRadius: 14, padding: '14px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#00e676' }}>{proStreak}</div>
          <div style={{ fontSize: 11, color: '#7a7a8a', marginTop: 4 }}>Protein streak</div>
          <div style={{ fontSize: 10, color: '#4a4a5a' }}>days ≥ 130g</div>
        </div>
        <div style={{
          flex: 1, background: '#13131a', border: '1px solid #1e1e2a',
          borderRadius: 14, padding: '14px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#b388ff' }}>{workSessions}</div>
          <div style={{ fontSize: 11, color: '#7a7a8a', marginTop: 4 }}>Workout sessions</div>
          <div style={{ fontSize: 10, color: '#4a4a5a' }}>last 14 days</div>
        </div>
      </div>
    </div>
  );
}
