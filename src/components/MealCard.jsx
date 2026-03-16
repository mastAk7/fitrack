import { useState } from 'react';

const RATING_META = {
  good:             { label: '✓ Good',        color: '#00e676', bg: '#00e67615' },
  ok:               { label: '~ OK',           color: '#ffab40', bg: '#ffab4015' },
  low_protein:      { label: '↓ Low Protein',  color: '#ff5252', bg: '#ff525215' },
  too_many_calories:{ label: '↑ High Cals',    color: '#ff5252', bg: '#ff525215' },
};

const MICRO_LABELS = [
  { key: 'carbs_g',    label: 'Carbs',    unit: 'g',   color: '#ffab40' },
  { key: 'fat_g',      label: 'Fat',      unit: 'g',   color: '#ff8a65' },
  { key: 'fiber_g',    label: 'Fiber',    unit: 'g',   color: '#69f0ae' },
  { key: 'iron_mg',    label: 'Iron',     unit: 'mg',  color: '#ef9a9a' },
  { key: 'calcium_mg', label: 'Calcium',  unit: 'mg',  color: '#b0bec5' },
];

function ItemRow({ item }) {
  const [open, setOpen] = useState(false);
  // item can be a string (legacy) or an object
  const isObj = item && typeof item === 'object';

  if (!isObj) {
    return (
      <div style={{ fontSize: 12, color: '#9a9aaa', padding: '4px 0', borderBottom: '1px solid #1e1e2a' }}>
        {item}
      </div>
    );
  }

  const hasMicros = MICRO_LABELS.some(m => item[m.key] != null);

  return (
    <div style={{ borderBottom: '1px solid #1a1a2a' }}>
      {/* Item header row */}
      <div
        onClick={() => hasMicros && setOpen(o => !o)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 0',
          cursor: hasMicros ? 'pointer' : 'default',
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12, color: '#c8c8d8', fontWeight: 500 }}>{item.name}</span>
          {item.qty && (
            <span style={{ fontSize: 11, color: '#5a5a6a', marginLeft: 6 }}>{item.qty}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {item.protein_g != null && (
            <span style={{ fontSize: 11, color: '#00e676', fontWeight: 600 }}>{item.protein_g}g P</span>
          )}
          {item.calories != null && (
            <span style={{ fontSize: 11, color: '#ffab40' }}>{item.calories} kcal</span>
          )}
          {hasMicros && (
            <span style={{ fontSize: 10, color: '#4a4a5a', width: 10, textAlign: 'center' }}>
              {open ? '▲' : '▼'}
            </span>
          )}
        </div>
      </div>

      {/* Expanded micros */}
      {open && hasMicros && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '4px 0 8px 0',
        }}>
          {item.weight_g != null && (
            <Chip label="Weight" value={item.weight_g} unit="g" color="#7a7a9a" />
          )}
          {MICRO_LABELS.map(m =>
            item[m.key] != null ? (
              <Chip key={m.key} label={m.label} value={item[m.key]} unit={m.unit} color={m.color} />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, value, unit, color }) {
  return (
    <div style={{
      background: '#0d0d14',
      border: '1px solid #1e1e2a',
      borderRadius: 6,
      padding: '3px 8px',
      display: 'flex',
      gap: 4,
      alignItems: 'baseline',
    }}>
      <span style={{ fontSize: 10, color: '#5a5a6a' }}>{label}</span>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{value}{unit}</span>
    </div>
  );
}

export default function MealCard({ entry, onDelete }) {
  const meta = RATING_META[entry.rating] || RATING_META.ok;
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isPending = entry.analyzed === false || entry.analyzed === 'analyzing';
  const hasItems = Array.isArray(entry.items) && entry.items.length > 0;

  return (
    <div style={{
      background: '#13131a',
      border: `1px solid ${isPending ? '#3a3a1a' : '#1e1e2a'}`,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
      opacity: isPending ? 0.75 : 1,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {entry.imageData && (
          <img
            src={entry.imageData}
            alt="meal"
            style={{
              width: 60,
              height: 60,
              objectFit: 'cover',
              borderRadius: 8,
              flexShrink: 0,
              border: '1px solid #1e1e2a',
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
            <div style={{ fontSize: 13, color: '#e8e8ed', lineHeight: 1.4, flex: 1 }}>
              {entry.summary}
            </div>
            {confirming ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => onDelete?.(entry.id)} style={{ background: '#ff525215', border: '1px solid #ff525240', borderRadius: 6, color: '#ff5252', fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>Delete</button>
                <button onClick={() => setConfirming(false)} style={{ background: 'none', border: '1px solid #2a2a3a', borderRadius: 6, color: '#7a7a8a', fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                style={{ background: 'none', border: 'none', color: '#4a4a5a', cursor: 'pointer', fontSize: 16, padding: '0 0 0 4px', lineHeight: 1, flexShrink: 0 }}
                title="Delete"
              >×</button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#7a7a8a' }}>{entry.time}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#00e676' }}>{entry.protein_g}g</span>
            <span style={{ fontSize: 11, color: '#7a7a8a' }}>protein</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ffab40' }}>{entry.calories}</span>
            <span style={{ fontSize: 11, color: '#7a7a8a' }}>kcal</span>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {isPending ? (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#7a7a5a', background: '#2a2a1a', padding: '2px 8px', borderRadius: 6, border: '1px solid #3a3a2a', letterSpacing: '0.3px' }}>
                Pending
              </span>
            ) : (
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: meta.color,
                background: meta.bg,
                padding: '2px 8px',
                borderRadius: 6,
                border: `1px solid ${meta.color}30`,
                letterSpacing: '0.3px',
              }}>
                {meta.label}
              </span>
            )}
            {entry.feedback && (
              <span style={{ fontSize: 11, color: '#7a7a8a', flex: 1 }}>{entry.feedback}</span>
            )}
          </div>

          {/* Read more */}
          {hasItems && !isPending && (
            <button
              onClick={() => setExpanded(o => !o)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6a6aaa',
                fontSize: 11,
                cursor: 'pointer',
                padding: '6px 0 0 0',
                textDecoration: 'underline',
                textDecorationColor: '#3a3a5a',
                textUnderlineOffset: 2,
              }}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded item breakdown */}
      {expanded && hasItems && (
        <div style={{ marginTop: 10, borderTop: '1px solid #1e1e2a', paddingTop: 8 }}>
          <div style={{ fontSize: 10, color: '#4a4a5a', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 4 }}>
            Breakdown — tap item for micros
          </div>
          {entry.items.map((item, i) => (
            <ItemRow key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
