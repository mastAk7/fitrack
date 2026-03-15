/**
 * Renders a subset of markdown used by the coach:
 * **bold**, *italic*, - / * bullet lists, numbered lists, blank-line paragraphs.
 */
function renderInline(text, baseKey = 0) {
  // Match **bold** before *italic* to avoid partial matches
  const regex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*(?!\*)[^*\n]+\*(?!\*))/g;
  const parts = [];
  let last = 0;
  let k = baseKey;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const m = match[0];
    if (m.startsWith('***')) {
      parts.push(<strong key={k++}><em>{m.slice(3, -3)}</em></strong>);
    } else if (m.startsWith('**')) {
      parts.push(<strong key={k++} style={{ color: '#f0f0f8', fontWeight: 650 }}>{m.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={k++} style={{ color: '#c8c8e0' }}>{m.slice(1, -1)}</em>);
    }
    last = match.index + m.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderMarkdown(raw) {
  if (!raw) return null;

  const lines = raw.split('\n');
  const out = [];
  let listItems = [];
  let listOrdered = false;
  let key = 0;

  function flushList() {
    if (!listItems.length) return;
    const Tag = listOrdered ? 'ol' : 'ul';
    out.push(
      <Tag key={key++} style={{ margin: '4px 0 6px 0', paddingLeft: 18 }}>
        {listItems.map((item, i) => (
          <li key={i} style={{ marginBottom: 3, lineHeight: 1.55 }}>
            {renderInline(item, i * 100)}
          </li>
        ))}
      </Tag>
    );
    listItems = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Unordered list: "- item" or "* item" (with any amount of leading spaces)
    const ulMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (ulMatch) {
      if (listOrdered) flushList();
      listOrdered = false;
      listItems.push(ulMatch[1]);
      continue;
    }

    // Ordered list: "1. item"
    const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!listOrdered) flushList();
      listOrdered = true;
      listItems.push(olMatch[1]);
      continue;
    }

    // Not a list item — flush any pending list
    flushList();

    // Blank line — small gap
    if (line.trim() === '') {
      // Don't add gap after another gap
      if (out.length > 0 && out[out.length - 1]?.type !== 'div' || out[out.length - 1]?.props?.role !== 'gap') {
        out.push(<div key={key++} role="gap" style={{ height: 5 }} />);
      }
      continue;
    }

    // Heading-style line (AI sometimes uses "**Header:**" as a standalone line)
    // Just render as a slightly spaced block
    out.push(
      <div key={key++} style={{ lineHeight: 1.6 }}>
        {renderInline(line, key * 100)}
      </div>
    );
  }

  flushList();
  return out;
}

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
          color: isUser ? '#c8c8e8' : '#d8d8ec',
          lineHeight: 1.55,
          wordBreak: 'break-word',
        }}>
          {isUser
            ? <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
            : renderMarkdown(content)
          }
        </div>
      </div>
    </div>
  );
}
