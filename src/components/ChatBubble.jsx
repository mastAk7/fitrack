export default function ChatBubble({ role, content, imageData }) {
  const isUser = role === 'user';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      <div style={{
        maxWidth: '82%',
        background: isUser ? '#1a1a2e' : '#13131a',
        border: `1px solid ${isUser ? '#2a2a4a' : '#1e1e2a'}`,
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        padding: '10px 13px',
      }}>
        {imageData && (
          <img
            src={imageData}
            alt="attached"
            style={{
              width: '100%',
              maxHeight: 180,
              objectFit: 'cover',
              borderRadius: 8,
              marginBottom: 8,
              border: '1px solid #1e1e2a',
            }}
          />
        )}
        <div style={{
          fontSize: 13,
          color: isUser ? '#c8c8e8' : '#e8e8ed',
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {content}
        </div>
      </div>
    </div>
  );
}
