import { useMemo, useState } from 'react';

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

// ── Silhouette ────────────────────────────────────────────────────────────────
// Smooth bezier body outline. ViewBox 0 0 100 235.
// Key bounds:
//   shoulders outer: x≈8 (L) / x≈92 (R), y≈52
//   armpit junction: x≈26 (L) / x≈74 (R), y≈50
//   chest side:      x≈27 (L) / x≈73 (R), y≈50–82
//   waist:           x≈25 (L) / x≈75 (R), y≈94–118
//   hip:             x≈22 (L) / x≈78 (R), y≈118–140
//   arm outer:       x≈8–12,  y≈52–130
//   arm inner:       x≈18–21, y≈52–130
//   legs outer:      x≈20 (L) / x≈80 (R)
//   legs inner:      x≈47 (L) / x≈53 (R)
const SILHOUETTE = `
  M 44,23
  C 40,25 32,29 22,36
  C 16,40 10,44 8,52
  C 6,60 7,72 8,83
  C 9,94 10,106 11,114
  C 11,121 12,126 12,129
  L 13,131
  C 14,132 17,132 18,130
  C 18,123 19,114 19,104
  C 20,92 20,80 21,70
  C 22,61 23,54 24,51
  C 25,50 25,50 26,50
  C 27,56 27,68 27,82
  C 26,94 25,106 25,118
  C 25,126 24,132 22,140
  C 21,152 20,165 20,178
  C 20,188 21,198 22,208
  C 23,218 24,226 25,232
  L 36,233
  C 41,234 45,233 46,229
  C 46,221 47,211 47,200
  C 47,188 48,175 49,162
  C 49,148 50,136 50,132
  C 50,136 51,148 51,162
  C 52,175 53,188 53,200
  C 53,211 54,221 54,229
  C 55,233 59,234 64,233
  L 75,232
  C 76,226 77,218 78,208
  C 79,198 80,188 80,178
  C 80,165 79,152 78,140
  C 76,132 75,126 75,118
  C 75,106 74,94 73,82
  C 73,68 73,56 74,50
  C 75,50 75,50 76,51
  C 77,54 78,61 79,70
  C 80,80 80,92 81,104
  C 82,114 82,123 82,130
  C 83,132 86,132 87,131
  L 88,129
  C 88,126 89,121 89,114
  C 90,106 91,94 92,83
  C 93,72 94,60 92,52
  C 90,44 84,40 78,36
  C 68,29 60,25 56,23
  Z
`;

// ── Anatomy definition lines ──────────────────────────────────────────────────
const FRONT_ANATOMY_LINES = [
  // Clavicles
  { d: 'M 27,44 C 36,42 45,43 50,45', stroke: '#3a3a5a', w: 0.7 },
  { d: 'M 73,44 C 64,42 55,43 50,45', stroke: '#3a3a5a', w: 0.7 },
  // Sternum
  { d: 'M 50,45 L 50,80', stroke: '#3a3a5a', w: 0.5 },
  // Linea alba (abs center)
  { d: 'M 50,76 L 50,123', stroke: '#2a2a4a', w: 0.6 },
  // Abs tendinous inscriptions
  { d: 'M 37,91 C 43,93 57,93 64,91', stroke: '#2a2a4a', w: 0.55 },
  { d: 'M 37,107 C 43,109 57,109 64,107', stroke: '#2a2a4a', w: 0.55 },
  // Inguinal / V-lines
  { d: 'M 36,122 C 41,127 46,130 49,132', stroke: '#2a2a4a', w: 0.55 },
  { d: 'M 64,122 C 59,127 54,130 51,132', stroke: '#2a2a4a', w: 0.55 },
  // Pec separation (sub-clavicular groove)
  { d: 'M 28,52 C 36,52 44,51 50,52', stroke: '#3a3a5a', w: 0.4 },
  { d: 'M 72,52 C 64,52 56,51 50,52', stroke: '#3a3a5a', w: 0.4 },
  // Deltoid-bicep groove (bicipital groove)
  { d: 'M 22,56 C 21,64 20,74 20,84', stroke: '#3a3a5a', w: 0.4 },
  { d: 'M 78,56 C 79,64 80,74 80,84', stroke: '#3a3a5a', w: 0.4 },
  // Quad line (rectus femoris center)
  { d: 'M 35,140 C 36,158 37,174 38,182', stroke: '#2a2a4a', w: 0.45 },
  { d: 'M 65,140 C 64,158 63,174 62,182', stroke: '#2a2a4a', w: 0.45 },
  // VMO teardrop (vastus medialis)
  { d: 'M 40,176 C 43,179 44,183 42,186', stroke: '#2a2a4a', w: 0.4 },
  { d: 'M 60,176 C 57,179 56,183 58,186', stroke: '#2a2a4a', w: 0.4 },
  // Neck SCM
  { d: 'M 46,24 C 45,27 44,30 43,34', stroke: '#3a3a5a', w: 0.4 },
  { d: 'M 54,24 C 55,27 56,30 57,34', stroke: '#3a3a5a', w: 0.4 },
];

const BACK_ANATOMY_LINES = [
  // Spine
  { d: 'M 50,32 C 50,70 50,110 50,132', stroke: '#3a3a5a', w: 0.65 },
  // Erector columns
  { d: 'M 47,86 L 47,130', stroke: '#2a2a4a', w: 0.45 },
  { d: 'M 53,86 L 53,130', stroke: '#2a2a4a', w: 0.45 },
  // Left scapula border
  { d: 'M 32,50 C 38,47 44,50 44,62 C 44,72 38,76 32,72 C 28,68 28,58 32,50', stroke: '#3a3a5a', w: 0.55 },
  // Right scapula border
  { d: 'M 68,50 C 62,47 56,50 56,62 C 56,72 62,76 68,72 C 72,68 72,58 68,50', stroke: '#3a3a5a', w: 0.55 },
  // Infraspinatus / scapula spine
  { d: 'M 30,58 C 37,60 44,60 44,60', stroke: '#3a3a5a', w: 0.4 },
  { d: 'M 70,58 C 63,60 56,60 56,60', stroke: '#3a3a5a', w: 0.4 },
  // Trap / rhomboid boundary
  { d: 'M 34,56 C 40,59 50,60 60,59 C 64,58 66,56 66,56', stroke: '#2a2a4a', w: 0.4 },
  // Glute crease
  { d: 'M 50,130 C 50,145 50,158 50,162', stroke: '#3a3a5a', w: 0.55 },
  // Gluteal fold (sub-glute crease)
  { d: 'M 23,162 C 32,164 44,164 50,163', stroke: '#2a2a4a', w: 0.4 },
  { d: 'M 77,162 C 68,164 56,164 50,163', stroke: '#2a2a4a', w: 0.4 },
  // Hamstring biceps / semitendinosus split
  { d: 'M 33,166 C 34,182 35,194 36,202', stroke: '#2a2a4a', w: 0.4 },
  { d: 'M 67,166 C 66,182 65,194 64,202', stroke: '#2a2a4a', w: 0.4 },
  // Calf head split
  { d: 'M 31,208 C 31,218 31,226 32,230', stroke: '#2a2a4a', w: 0.4 },
  { d: 'M 69,208 C 69,218 69,226 68,230', stroke: '#2a2a4a', w: 0.4 },
  // Neck trap lines
  { d: 'M 46,24 C 47,27 48,30 50,32', stroke: '#3a3a5a', w: 0.4 },
  { d: 'M 54,24 C 53,27 52,30 50,32', stroke: '#3a3a5a', w: 0.4 },
];

// ── Front muscles ─────────────────────────────────────────────────────────────
const FRONT_MUSCLES = [
  {
    name: 'Chest',
    paths: [
      // Left pec: fan from sternum (50,46) sweeping left to humerus (~26,52), lower border ~y=78
      'M 50,46 C 44,45 34,47 26,53 C 23,58 23,66 25,73 C 28,78 40,80 48,79 C 50,75 50,59 50,46 Z',
      // Right pec (mirror)
      'M 50,46 C 56,45 66,47 74,53 C 77,58 77,66 75,73 C 72,78 60,80 52,79 C 50,75 50,59 50,46 Z',
    ],
  },
  {
    name: 'Front Delts',
    paths: [
      // Anterior delt: from trap slope (~22,40) to outer cap (~11,52), lower edge ~y=66
      'M 22,40 C 17,40 12,44 10,52 C 10,58 13,64 17,67 C 21,65 25,59 25,52 C 24,47 23,43 22,40 Z',
      'M 78,40 C 83,40 88,44 90,52 C 90,58 87,64 83,67 C 79,65 75,59 75,52 C 76,47 77,43 78,40 Z',
    ],
  },
  {
    name: 'Side Delts',
    paths: [
      // Lateral (medial) delt: outermost cap, x≈7–17, y≈50–68
      'M 8,53 C 8,47 13,45 17,49 C 18,55 17,63 14,67 C 10,66 7,61 8,53 Z',
      'M 92,53 C 92,47 87,45 83,49 C 82,55 83,63 86,67 C 90,66 93,61 92,53 Z',
    ],
  },
  {
    name: 'Biceps',
    paths: [
      // Bicep: front of upper arm. Outer edge ≈x9, inner edge ≈x21, y≈68–98
      'M 10,68 C 14,65 21,67 22,78 C 22,88 21,97 18,99 C 14,98 9,91 9,81 C 9,73 9,68 10,68 Z',
      'M 90,68 C 86,65 79,67 78,78 C 78,88 79,97 82,99 C 86,98 91,91 91,81 C 91,73 91,68 90,68 Z',
    ],
  },
  {
    name: 'Forearms',
    paths: [
      // Forearm: outer ≈x10–12, inner ≈x18–20, y≈100–130
      'M 11,100 C 14,98 19,99 20,110 C 20,120 19,128 17,130 C 13,128 11,120 10,110 Z',
      'M 89,100 C 86,98 81,99 80,110 C 80,120 81,128 83,130 C 87,128 89,120 90,110 Z',
    ],
  },
  {
    name: 'Abs',
    paths: [
      // Six rectus abdominis segments split by linea alba (x=50) and two tendinous inscriptions (y≈91,107)
      // Upper-left
      'M 37,77 C 40,75 47,76 47,83 L 47,91 C 43,92 37,92 36,85 Z',
      // Upper-right
      'M 53,76 C 57,75 63,77 64,85 C 63,92 57,92 53,91 L 53,83 Z',
      // Mid-left
      'M 37,93 C 40,91 47,92 47,99 L 47,107 C 43,108 37,108 36,102 Z',
      // Mid-right
      'M 53,92 C 57,91 63,93 64,102 C 63,108 57,108 53,107 L 53,99 Z',
      // Lower-left
      'M 37,109 C 40,108 47,109 47,116 L 47,122 C 43,123 37,123 36,117 Z',
      // Lower-right
      'M 53,109 C 57,108 63,109 64,117 C 63,123 57,123 53,122 L 53,116 Z',
    ],
  },
  {
    name: 'Obliques',
    paths: [
      // External oblique: side wall from pec lower border (~y=70) to hip crest (~y=118)
      // Bounded by torso wall (x≈25) and abs edge (x≈37)
      'M 25,70 C 28,68 37,70 37,77 L 36,118 C 31,120 25,117 24,109 C 23,97 23,83 25,70 Z',
      'M 75,70 C 72,68 63,70 63,77 L 64,118 C 69,120 75,117 76,109 C 77,97 77,83 75,70 Z',
    ],
  },
  {
    name: 'Quads',
    paths: [
      // Front thigh from hip crease (~y=138) to knee (~y=182)
      // Outer wall ≈x20, inner wall ≈x47
      'M 22,138 C 26,134 44,134 47,141 C 48,156 47,172 43,181 C 37,184 23,182 21,174 C 20,163 20,148 22,138 Z',
      'M 78,138 C 74,134 56,134 53,141 C 52,156 53,172 57,181 C 63,184 77,182 79,174 C 80,163 80,148 78,138 Z',
    ],
  },
];

// ── Back muscles ──────────────────────────────────────────────────────────────
const BACK_MUSCLES = [
  {
    name: 'Traps',
    paths: [
      // Upper traps: diamond from neck (50,32) → shoulder tips (~26,42 / ~74,42) → mid-back (~50,58)
      'M 50,32 C 44,30 32,34 26,42 C 30,51 42,56 50,59 C 58,56 70,51 74,42 C 68,34 56,30 50,32 Z',
    ],
  },
  {
    name: 'Upper Back',
    paths: [
      // Rhomboids + mid-trap: between scapulae, x≈34–66, y≈58–84
      'M 34,59 C 40,57 50,59 60,57 C 66,59 66,70 63,79 C 57,83 50,85 43,83 C 38,79 34,70 34,59 Z',
    ],
  },
  {
    name: 'Rear Delts',
    paths: [
      // Posterior delt: rear shoulder cap, x≈10–24, y≈48–68
      'M 12,48 C 16,44 23,47 24,56 C 24,64 21,69 17,69 C 12,67 10,61 12,48 Z',
      'M 88,48 C 84,44 77,47 76,56 C 76,64 79,69 83,69 C 88,67 90,61 88,48 Z',
    ],
  },
  {
    name: 'Lats',
    paths: [
      // Latissimus dorsi: wide under arm, sweeps inward to hip insertion
      // Outer edge follows torso wall; inner edge = lat belly boundary
      'M 24,54 C 26,60 27,74 26,91 C 25,103 24,115 25,123 C 27,129 33,129 37,124 C 34,110 32,96 32,82 C 31,68 27,60 25,54 Z',
      'M 76,54 C 74,60 73,74 74,91 C 75,103 76,115 75,123 C 73,129 67,129 63,124 C 66,110 68,96 68,82 C 69,68 73,60 75,54 Z',
    ],
  },
  {
    name: 'Lower Back',
    paths: [
      // Erector spinae columns flanking spine: x≈36–47 (left) and x≈53–64 (right), y≈108–130
      'M 38,109 C 41,107 47,108 47,116 L 47,130 C 43,132 38,130 36,122 C 35,115 37,111 38,109 Z',
      'M 62,109 C 59,107 53,108 53,116 L 53,130 C 57,132 62,130 64,122 C 65,115 63,111 62,109 Z',
    ],
  },
  {
    name: 'Glutes',
    paths: [
      // Left glute: from hip (25,128) to outer thigh, rounded teardrop
      'M 25,128 C 28,122 42,120 48,128 C 51,137 51,151 47,161 C 41,165 26,163 22,153 C 20,143 22,134 25,128 Z',
      // Right glute
      'M 75,128 C 72,122 58,120 52,128 C 49,137 49,151 53,161 C 59,165 74,163 78,153 C 80,143 78,134 75,128 Z',
    ],
  },
  {
    name: 'Hamstrings',
    paths: [
      // Back of thigh: outer ≈x20, inner ≈x44, y≈163–202
      'M 21,163 C 24,160 41,160 45,167 C 47,179 46,193 44,203 C 38,207 23,204 20,196 C 19,185 20,171 21,163 Z',
      'M 79,163 C 76,160 59,160 55,167 C 53,179 54,193 56,203 C 62,207 77,204 80,196 C 81,185 80,171 79,163 Z',
    ],
  },
  {
    name: 'Calves',
    paths: [
      // Gastrocnemius: widest ~y=214, two-headed diamond; outer ≈x21, inner ≈x38
      'M 22,206 C 25,203 37,203 39,210 C 41,219 40,227 37,231 C 30,233 22,229 21,221 C 20,215 21,209 22,206 Z',
      'M 78,206 C 75,203 63,203 61,210 C 59,219 60,227 63,231 C 70,233 78,229 79,221 C 80,215 79,209 78,206 Z',
    ],
  },
  {
    name: 'Triceps',
    paths: [
      // Long head of tricep: back of upper arm, outer ≈x8, inner ≈x22, y≈58–98
      'M 10,58 C 14,54 22,57 22,69 C 22,81 21,93 19,99 C 15,98 9,91 8,78 C 7,68 9,62 10,58 Z',
      'M 90,58 C 86,54 78,57 78,69 C 78,81 79,93 81,99 C 85,98 91,91 92,78 C 93,68 91,62 90,58 Z',
    ],
  },
];

// ── BodySVG component ─────────────────────────────────────────────────────────
function BodySVG({ muscles, label }) {
  const [hover, setHover] = useState(null);
  const isFront = label === 'Front';
  const muscleList = isFront ? FRONT_MUSCLES : BACK_MUSCLES;
  const anatomyLines = isFront ? FRONT_ANATOMY_LINES : BACK_ANATOMY_LINES;

  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#7a7a8a', marginBottom: 6, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <svg viewBox="0 0 100 235" style={{ width: '100%', maxWidth: 140, display: 'block', margin: '0 auto' }}>
        {/* Head */}
        <circle cx="50" cy="12" r="11" fill="#1e1e2e" stroke="#3a3a5a" strokeWidth="0.6" />
        {/* Ear lobes */}
        <ellipse cx="38.5" cy="12.5" rx="1.8" ry="2.4" fill="#1e1e2e" stroke="#3a3a5a" strokeWidth="0.5" />
        <ellipse cx="61.5" cy="12.5" rx="1.8" ry="2.4" fill="#1e1e2e" stroke="#3a3a5a" strokeWidth="0.5" />

        {/* Body silhouette */}
        <path d={SILHOUETTE} fill="#1e1e2e" stroke="#3a3a5a" strokeWidth="0.6" />

        {/* Anatomy lines (always visible, subtle) */}
        {anatomyLines.map((l, i) => (
          <path key={`al-${i}`} d={l.d} fill="none" stroke={l.stroke} strokeWidth={l.w} strokeOpacity={0.65} />
        ))}

        {/* Muscle overlays */}
        {muscleList.map(({ name, paths }) => {
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
          <text x="50" y="12" textAnchor="middle" fill="#e8e8ed" fontSize="5" fontWeight="600">{hover}</text>
        )}
      </svg>

      {Object.entries(muscles).length > 0 && (
        <div style={{ marginTop: 6 }}>
          {muscleList
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

// ── MuscleAnatomy ─────────────────────────────────────────────────────────────
export default function MuscleAnatomy({ workMap }) {
  const [filter, setFilter] = useState('week');

  const filteredWorkouts = useMemo(() => {
    const now = new Date();
    let cutoff;
    const lds = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (filter === 'day') {
      cutoff = lds(now);
    } else if (filter === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      cutoff = lds(d);
    } else if (filter === 'month') {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      cutoff = lds(d);
    } else {
      cutoff = '2000-01-01';
    }
    return [...workMap.values()].filter(w => w.date >= cutoff);
  }, [workMap, filter]);

  const muscles = useMemo(() => aggregateMuscles(filteredWorkouts), [filteredWorkouts]);
  const hasAny = Object.keys(muscles).length > 0;
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
                borderRadius: 6, padding: '3px 8px',
                color: filter === f ? '#b388ff' : '#7a7a8a',
                fontSize: 11, cursor: 'pointer',
                fontWeight: filter === f ? 600 : 400,
              }}
            >{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>

      {!hasAny ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#4a4a5a', fontSize: 12 }}>
          No workout data for this period.{'\n'}Log a workout to see muscle highlights.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <BodySVG muscles={muscles} label="Front" />
            <BodySVG muscles={muscles} label="Back" />
          </div>
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
