export default function ExerciseRow({ exercise, checked, onChange }) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '10px 0',
      borderBottom: '1px solid #1e1e2a',
      cursor: 'pointer',
    }}>
      <div
        onClick={() => onChange?.(!checked)}
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          border: checked ? '2px solid #b388ff' : '2px solid #3a3a4a',
          background: checked ? '#b388ff20' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
          transition: 'all 0.15s',
          cursor: 'pointer',
        }}
      >
        {checked && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 5l3.5 3.5L11 1" stroke="#b388ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span style={{
        fontSize: 13,
        color: checked ? '#4a4a5a' : '#e8e8ed',
        textDecoration: checked ? 'line-through' : 'none',
        lineHeight: 1.4,
        transition: 'color 0.15s',
      }}>
        {exercise}
      </span>
    </label>
  );
}
