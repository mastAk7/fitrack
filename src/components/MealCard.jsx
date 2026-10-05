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
  const isMapped = item.componentKey || item.source === 'mapped' || item.source === 'exact_mapping' || item.source === 'default';
  const isLearned = item.source === 'learned';

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
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#c8c8d8', fontWeight: 500 }}>{item.name}</span>
          {item.qty && (
            <span style={{ fontSize: 11, color: '#5a5a6a' }}>{item.qty}</span>
          )}
          {isMapped && (
            <span style={{
              fontSize: 9,
              color: '#00e676',
              background: '#00e67612',
              border: '1px solid #00e67630',
              borderRadius: 4,
              padding: '1px 5px',
              fontWeight: 600,
            }}>
              ✓ Exact Mapped
            </span>
          )}
          {isLearned && (
            <span style={{
              fontSize: 9,
              color: '#b388ff',
              background: '#b388ff12',
              border: '1px solid #b388ff30',
              borderRadius: 4,
              padding: '1px 5px',
              fontWeight: 600,
            }}>
              ✨ AI Learned
            </span>
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

export default function MealCard({ entry, onDelete, onRetry, onEdit }) {
  const meta = RATING_META[entry.rating] || RATING_META.ok;
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(entry.summary || '');

  const isPending = entry.analyzed === false || entry.analyzed === 'analyzing';
  const isFailed = entry.analyzed === 'failed' || entry.error || (entry.analyzed === true && entry.protein_g === 0 && (entry.feedback?.includes('Could not analyze') || entry.feedback?.includes('check API key')));
  const hasItems = Array.isArray(entry.items) && entry.items.length > 0;
  const isExactMapped = entry.source === 'exact_mapping';

  return (
    <div style={{
      background: '#13131a',
      border: `1px solid ${isFailed ? '#ff525240' : isPending ? '#3a3a1a' : '#1e1e2a'}`,
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
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              <input
                type="text"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                style={{
                  background: '#0d0d14',
                  border: '1px solid #b388ff',
                  borderRadius: 8,
                  padding: '6px 10px',
                  color: '#e8e8ed',
                  fontSize: 13,
                  outline: 'none',
                }}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (editText.trim()) {
                      onEdit?.(entry.id, editText.trim());
                      setIsEditing(false);
                    }
                  }
                }}
              />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setIsEditing(false); setEditText(entry.summary || ''); }}
                  style={{ background: 'none', border: '1px solid #2a2a3a', borderRadius: 6, color: '#7a7a8a', fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}
                >Cancel</button>
                <button
                  onClick={() => {
                    if (editText.trim()) {
                      onEdit?.(entry.id, editText.trim());
                      setIsEditing(false);
                    }
                  }}
                  style={{ background: '#b388ff', border: 'none', borderRadius: 6, color: '#0a0a0f', fontSize: 11, fontWeight: 600, padding: '3px 10px', cursor: 'pointer' }}
                >Save & Re-analyze</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
              <div style={{ fontSize: 13, color: '#e8e8ed', lineHeight: 1.4, flex: 1 }}>
                {entry.summary}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {confirming ? (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button onClick={() => onDelete?.(entry.id)} style={{ background: '#ff525215', border: '1px solid #ff525240', borderRadius: 6, color: '#ff5252', fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>Delete</button>
                    <button onClick={() => setConfirming(false)} style={{ background: 'none', border: '1px solid #2a2a3a', borderRadius: 6, color: '#7a7a8a', fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => { setIsEditing(true); setEditText(entry.summary || ''); }}
                      style={{ background: 'none', border: 'none', color: '#7a7a9a', cursor: 'pointer', fontSize: 11, padding: '0 2px', textDecoration: 'underline' }}
                      title="Edit (fix typo)"
                    >edit</button>
                    <button
                      onClick={() => setConfirming(true)}
                      style={{ background: 'none', border: 'none', color: '#4a4a5a', cursor: 'pointer', fontSize: 16, padding: '0 0 0 4px', lineHeight: 1 }}
                      title="Delete"
                    >×</button>
                  </>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#7a7a8a' }}>{entry.time}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#00e676' }}>{entry.protein_g || 0}g</span>
            <span style={{ fontSize: 11, color: '#7a7a8a' }}>protein</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ffab40' }}>{entry.calories || 0}</span>
            <span style={{ fontSize: 11, color: '#7a7a8a' }}>kcal</span>
            {isExactMapped && (
              <span style={{
                fontSize: 10,
                color: '#69f0ae',
                background: '#00e67610',
                border: '1px solid #00e67625',
                borderRadius: 4,
                padding: '1px 6px',
                fontWeight: 600,
              }}>
                ⚡ Exact Map
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {isFailed ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#ff5252',
                  background: '#ff525215',
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: '1px solid #ff525240',
                  letterSpacing: '0.3px',
                }}>
                  ✕ Analysis failed
                </span>
                {onRetry && (
                  <button
                    onClick={() => onRetry(entry.id)}
                    style={{
                      background: '#b388ff',
                      color: '#0a0a0f',
                      border: 'none',
                      borderRadius: 6,
                      padding: '2px 8px',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : isPending ? (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#ffab40', background: '#2a2215', padding: '2px 8px', borderRadius: 6, border: '1px solid #ffab4040', letterSpacing: '0.3px' }}>
                {entry.analyzed === 'analyzing' ? 'Analyzing…' : 'Pending'}
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
              <span style={{ fontSize: 11, color: isFailed ? '#ff8a80' : '#7a7a8a', flex: 1 }}>{entry.feedback}</span>
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
