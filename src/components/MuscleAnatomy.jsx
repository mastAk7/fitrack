import { useMemo, useState } from 'react';

// 5 intensity shades (index 0 = worked but very light, 4 = max)
const SHADES = ['#3a1558', '#5a2292', '#7a34be', '#9a4ad4', '#b388ff'];

function intensityColor(level) {
  if (!level || level < 1) return null;
  return SHADES[Math.min(level - 1, 4)];
}

function aggregateMuscles(workouts) {
  const map = {};
  for (const w of workouts) {
    if (!w.muscles?.length) continue;
    for (const { name, intensity } of w.muscles) {
      if (!map[name]) map[name] = { sum: 0, count: 0 };
      map[name].sum += intensity;
      map[name].count++;
    }
  }
  const result = {};
  for (const [name, { sum, count }] of Object.entries(map)) {
    result[name] = Math.round(sum / count);
  }
  return result;
}

// Front view muscle regions
const FRONT_MUSCLES = [
  { name: 'Chest',       paths: ['M23,47 L45,44 L45,68 L23,70 Z', 'M55,44 L77,47 L77,70 L55,68 Z'] },
  { name: 'Front Delts', paths: ['M13,38 L27,35 L24,54 L11,52 Z', 'M73,35 L87,38 L89,52 L76,54 Z'] },
  { name: 'Side Delts',  paths: ['M7,44 L15,38 L14,57 L6,56 Z',   'M85,38 L93,44 L94,56 L86,57 Z'] },
  { name: 'Biceps',      paths: ['M7,59 L21,57 L19,94 L6,93 Z',   'M79,57 L93,59 L94,93 L81,94 Z'] },
  { name: 'Forearms',    paths: ['M6,96 L19,96 L17,130 L5,128 Z', 'M81,96 L94,96 L95,128 L83,130 Z'] },
  { name: 'Abs',         paths: [
    'M36,70 L47,69 L47,82 L36,83 Z', 'M53,69 L64,70 L64,83 L53,82 Z',
    'M36,85 L47,84 L47,97 L36,98 Z', 'M53,84 L64,85 L64,98 L53,97 Z',
    'M36,100 L47,99 L47,113 L36,114 Z', 'M53,99 L64,100 L64,114 L53,113 Z',
  ]},
  { name: 'Obliques',    paths: ['M24,72 L36,70 L36,114 L24,116 Z', 'M64,70 L76,72 L76,116 L64,114 Z'] },
  { name: 'Quads',       paths: ['M28,133 L47,131 L45,180 L27,178 Z', 'M53,131 L72,133 L73,178 L55,180 Z'] },
];

// Back view muscle regions
const BACK_MUSCLES = [
  { name: 'Traps',       paths: ['M26,35 L74,35 L70,56 L50,60 L30,56 Z'] },
  { name: 'Upper Back',  paths: ['M32,58 L68,58 L66,80 L50,84 L34,80 Z'] },
  { name: 'Rear Delts',  paths: ['M10,38 L26,35 L24,54 L8,52 Z', 'M74,35 L90,38 L92,52 L76,54 Z'] },
  { name: 'Lats',        paths: ['M14,60 L32,58 L34,106 L14,114 Z', 'M68,58 L86,60 L86,114 L66,106 Z'] },
  { name: 'Lower Back',  paths: ['M34,108 L66,108 L64,130 L36,130 Z'] },
  { name: 'Glutes',      paths: ['M27,133 L50,131 L50,164 L26,162 Z', 'M50,131 L73,133 L74,162 L50,164 Z'] },
  { name: 'Hamstrings',  paths: ['M26,166 L47,166 L45,198 L25,195 Z', 'M53,166 L74,166 L75,195 L55,198 Z'] },
  { name: 'Calves',      paths: ['M25,200 L43,200 L41,228 L23,225 Z', 'M57,200 L75,200 L77,225 L59,228 Z'] },
  { name: 'Triceps',     paths: ['M6,59 L20,57 L18,94 L5,93 Z',   'M80,57 L94,59 L95,93 L82,94 Z'] },
];

// Body silhouette paths (front and back share same outline)
const SILHOUETTE = `
  M44,24 L56,24 L58,31 L68,33 L80,35 L86,39 L92,44 L95,56 L95,93 L94,130 L90,134
  L85,130 L85,96 L82,70 L80,131 L73,133 L73,178 L75,200 L77,228 L57,228
  L55,200 L53,181 L50,142 L47,181 L45,200 L43,228 L23,228
  L25,200 L27,178 L27,133 L20,131 L18,70 L15,96 L15,130 L10,134
  L5,130 L5,93 L5,56 L8,44 L14,39 L20,35 L32,33 L42,31 Z
`;

function BodySVG({ muscles, label }) {
  const [hover, setHover] = useState(null);
  const allMuscles = [...FRONT_MUSCLES, ...BACK_MUSCLES];

  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#7a7a8a', marginBottom: 6, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <svg viewBox="0 0 100 235" style={{ width: '100%', maxWidth: 140, display: 'block', margin: '0 auto' }}>
        {/* Body silhouette */}
        <circle cx="50" cy="13" r="10" fill="#1e1e2e" stroke="#3a3a5a" strokeWidth="0.5" />
        <path d={SILHOUETTE} fill="#1e1e2e" stroke="#3a3a5a" strokeWidth="0.5" />

        {/* Muscle overlays */}
        {(label === 'Front' ? FRONT_MUSCLES : BACK_MUSCLES).map(({ name, paths }) => {
          const intensity = muscles[name];
          const fill = intensityColor(intensity);
          if (!fill) return null;
          return paths.map((d, i) => (
            <path
              key={`${name}-${i}`}
              d={d}
              fill={fill}
              opacity={0.85}
              onMouseEnter={() => setHover(name)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'default' }}
            />
          ));
        })}

        {/* Hover label */}
        {hover && (
          <text x="50" y="12" textAnchor="middle" fill="#e8e8ed" fontSize="5" fontWeight="600">
            {hover}
          </text>
        )}
      </svg>

      {/* Intensity legend */}
      {Object.entries(muscles).length > 0 && (
        <div style={{ marginTop: 6 }}>
          {(label === 'Front' ? FRONT_MUSCLES : BACK_MUSCLES)
            .filter(({ name }) => muscles[name])
            .map(({ name }) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, justifyContent: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: intensityColor(muscles[name]), flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: '#9a9aaa' }}>{name}</span>
                <span style={{ fontSize: 9, color: '#5a5a6a' }}>{'▪'.repeat(muscles[name])}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default function MuscleAnatomy({ workMap }) {
  const [filter, setFilter] = useState('week');

  const filteredWorkouts = useMemo(() => {
    const now = new Date();
    let cutoff;
    if (filter === 'day') {
      cutoff = now.toISOString().split('T')[0];
    } else if (filter === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      cutoff = d.toISOString().split('T')[0];
    } else if (filter === 'month') {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      cutoff = d.toISOString().split('T')[0];
    } else {
      cutoff = '2000-01-01';
    }
    return [...workMap.values()].filter(w => w.date >= cutoff);
  }, [workMap, filter]);

  const muscles = useMemo(() => aggregateMuscles(filteredWorkouts), [filteredWorkouts]);

  const hasAny = Object.keys(muscles).length > 0;

  // Count muscles with data per view
  const frontWorked = FRONT_MUSCLES.filter(m => muscles[m.name]).length;
  const backWorked = BACK_MUSCLES.filter(m => muscles[m.name]).length;

  return (
    <div style={{ background: '#13131a', border: '1px solid #1e1e2a', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8ed' }}>Muscle Map</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['day', 'week', 'month', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? '#b388ff20' : 'none',
                border: `1px solid ${filter === f ? '#b388ff50' : '#1e1e2a'}`,
                borderRadius: 6,
                padding: '3px 8px',
                color: filter === f ? '#b388ff' : '#7a7a8a',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: filter === f ? 600 : 400,
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {!hasAny ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#4a4a5a', fontSize: 12 }}>
          No workout data for this period.{'\n'}
          Log a workout to see muscle highlights.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <BodySVG muscles={muscles} label="Front" />
            <BodySVG muscles={muscles} label="Back" />
          </div>

          {/* Intensity scale */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'center' }}>
            <span style={{ fontSize: 10, color: '#4a4a5a' }}>Low</span>
            {SHADES.map((c, i) => (
              <div key={i} style={{ width: 14, height: 8, background: c, borderRadius: 2 }} />
            ))}
            <span style={{ fontSize: 10, color: '#4a4a5a' }}>High</span>
          </div>

          <div style={{ marginTop: 8, textAlign: 'center', fontSize: 10, color: '#4a4a5a' }}>
            {frontWorked + backWorked} muscle group{frontWorked + backWorked !== 1 ? 's' : ''} worked
            {filter === 'day' ? ' today' : filter === 'week' ? ' this week' : filter === 'month' ? ' this month' : ''}
          </div>
        </>
      )}
    </div>
  );
}
