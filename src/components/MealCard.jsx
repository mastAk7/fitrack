const RATING_META = {
  good:             { label: '✓ Good',        color: '#00e676', bg: '#00e67615' },
  ok:               { label: '~ OK',           color: '#ffab40', bg: '#ffab4015' },
  low_protein:      { label: '↓ Low Protein',  color: '#ff5252', bg: '#ff525215' },
  too_many_calories:{ label: '↑ High Cals',    color: '#ff5252', bg: '#ff525215' },
};

export default function MealCard({ entry, onDelete }) {
  const meta = RATING_META[entry.rating] || RATING_META.ok;

  return (
    <div style={{
      background: '#13131a',
      border: '1px solid #1e1e2a',
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
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
            <button
              onClick={() => onDelete?.(entry.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#4a4a5a',
                cursor: 'pointer',
                fontSize: 16,
                padding: '0 0 0 4px',
                lineHeight: 1,
                flexShrink: 0,
              }}
              title="Delete"
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#7a7a8a' }}>{entry.time}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#00e676' }}>{entry.protein_g}g</span>
            <span style={{ fontSize: 11, color: '#7a7a8a' }}>protein</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ffab40' }}>{entry.calories}</span>
            <span style={{ fontSize: 11, color: '#7a7a8a' }}>kcal</span>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
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
            {entry.feedback && (
              <span style={{ fontSize: 11, color: '#7a7a8a', flex: 1 }}>{entry.feedback}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
