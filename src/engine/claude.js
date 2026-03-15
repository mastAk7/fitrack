// Gemini API — drop-in replacement, same exported function signatures.
const MODEL = 'gemini-2.5-flash';

// Collect all configured API keys (VITE_GEMINI_API_KEY_1, _2, _3, ... or legacy VITE_GEMINI_API_KEY)
function getApiKeys() {
  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const k = import.meta.env[`VITE_GEMINI_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  // Fallback to legacy single-key env var
  const legacy = import.meta.env.VITE_GEMINI_API_KEY;
  if (legacy && !keys.includes(legacy)) keys.push(legacy);
  return keys;
}

function apiUrl(key, streaming = false) {
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
 * Single-shot Gemini API call. Tries each configured key in order,
 * skipping any that return 429 (quota exhausted).
 * Returns the text response.
 */
export async function callClaude({ messages, system, max_tokens = 1024 }) {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error('No Gemini API key configured');

  let lastErr;
  for (const key of keys) {
    const res = await fetch(apiUrl(key, false), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody(messages, system, max_tokens)),
    });

    if (res.status === 429) {
      lastErr = new Error(`Gemini API error 429: quota exhausted`);
      continue; // try next key
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');
    return text;
  }

  throw lastErr || new Error('All Gemini API keys exhausted');
}

/**
 * Streaming Gemini API call. Tries each configured key in order,
 * skipping any that return 429. Calls onChunk(text) for each delta.
 * Returns full text when done.
 */
export async function callClaudeStream({ messages, system, max_tokens = 1024, onChunk }) {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error('No Gemini API key configured');

  let lastErr;
  for (const key of keys) {
    const res = await fetch(apiUrl(key, true), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody(messages, system, max_tokens)),
    });

    if (res.status === 429) {
      lastErr = new Error(`Gemini API error 429: quota exhausted`);
      continue; // try next key
    }

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

  throw lastErr || new Error('All Gemini API keys exhausted');
}
