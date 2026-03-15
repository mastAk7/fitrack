// Gemini API — drop-in replacement, same exported function signatures.
const MODEL = 'gemini-1.5-flash';

function apiUrl(streaming = false) {
  const key = import.meta.env.VITE_GEMINI_API_KEY || '';
  const method = streaming ? 'streamGenerateContent' : 'generateContent';
  const alt = streaming ? '&alt=sse' : '';
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:${method}?key=${key}${alt}`;
}

/**
 * Converts Claude-format messages to Gemini format.
 * Claude: { role: 'user'|'assistant', content: string | array }
 * Gemini: { role: 'user'|'model', parts: [...] }
 */
function toGeminiMessages(messages) {
  return messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: toGeminiParts(m.content),
  }));
}

function toGeminiParts(content) {
  if (typeof content === 'string') return [{ text: content }];
  if (!Array.isArray(content)) return [{ text: String(content) }];

  return content.map(block => {
    if (block.type === 'text') return { text: block.text };
    if (block.type === 'image') {
      // Claude format: { source: { type: 'base64', media_type, data } }
      return {
        inlineData: {
          mimeType: block.source?.media_type || 'image/jpeg',
          data: block.source?.data || '',
        },
      };
    }
    return { text: '' };
  });
}

function buildBody(messages, system, max_tokens) {
  const body = {
    contents: toGeminiMessages(messages),
    generationConfig: { maxOutputTokens: max_tokens },
  };
  if (system) {
    body.system_instruction = { parts: [{ text: system }] };
  }
  return body;
}

/**
 * Single-shot Gemini API call.
 * Returns the text response.
 */
export async function callClaude({ messages, system, max_tokens = 1024 }) {
  const res = await fetch(apiUrl(false), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildBody(messages, system, max_tokens)),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

/**
 * Streaming Gemini API call. Calls onChunk(text) for each delta.
 * Returns full text when done.
 */
export async function callClaudeStream({ messages, system, max_tokens = 1024, onChunk }) {
  const res = await fetch(apiUrl(true), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildBody(messages, system, max_tokens)),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const evt = JSON.parse(raw);
        const chunk = evt.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (chunk) {
          full += chunk;
          onChunk?.(chunk);
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
  }

  return full;
}
