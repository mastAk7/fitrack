// Gemini API — multi-model × multi-key rotation for maximum free-tier RPD.
//
// Strategy: exhaust all 3 text models on key 1 before moving to key 2.
// Each model has its own independent RPD quota per API key.
//
//   gemini-2.5-flash:      20 RPD  ← best quality, tried first
//   gemini-2.5-flash-lite: 20 RPD
//   gemini-3-flash:        20 RPD
//   ─────────────────────────────
//   Per key:               60 RPD
//   4 keys total:         240 RPD/day
//
// ⚠ gemini-2.5-flash-tts is EXCLUDED — it outputs audio, not text.
// ⚠ If a model gives 404, check its exact API ID in Google AI Studio.

const TEXT_MODELS = [
  'gemini-2.5-flash',       // 20 RPD — best quality
  'gemini-2.5-flash-lite',  // 20 RPD — fast, good quality
  'gemini-3-flash',         // 20 RPD — fallback
];

function getApiKeys() {
  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const k = import.meta.env[`VITE_GEMINI_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  const legacy = import.meta.env.VITE_GEMINI_API_KEY;
  if (legacy && !keys.includes(legacy)) keys.push(legacy);
  return keys;
}

function apiUrl(key, model, streaming = false) {
  const method = streaming ? 'streamGenerateContent' : 'generateContent';
  const alt = streaming ? '&alt=sse' : '';
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}?key=${key}${alt}`;
}

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
 * Builds the ordered attempt list: exhaust all models on key 1, then key 2, etc.
 * Returns [{ key, model }, ...] — up to keys.length × TEXT_MODELS.length combos.
 */
function buildAttempts(keys) {
  const attempts = [];
  for (const key of keys) {
    for (const model of TEXT_MODELS) {
      attempts.push({ key, model });
    }
  }
  return attempts;
}

/**
 * Single-shot Gemini call.
 * Rotates through all model × key combos on 429, throws on first hard error.
 */
export async function callClaude({ messages, system, max_tokens = 1024 }) {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error('No Gemini API key configured');

  const attempts = buildAttempts(keys);
  let lastErr;

  for (const { key, model } of attempts) {
    const res = await fetch(apiUrl(key, model, false), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody(messages, system, max_tokens)),
    });

    if (res.status === 429) {
      lastErr = new Error(`Quota exhausted: ${model}`);
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      // 404 = wrong model ID — skip to next
      if (res.status === 404) {
        lastErr = new Error(`Model not found: ${model}`);
        continue;
      }
      // 400 can mean this specific model doesn't support the request (e.g. vision not supported,
      // content policy, or payload issue) — try next model before giving up
      if (res.status === 400) {
        lastErr = new Error(`Bad request (${model}): ${errText.slice(0, 200)}`);
        continue;
      }
      // 401/403 = auth error — no point retrying other models with same key
      throw new Error(`Gemini API error ${res.status} (${model}): ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      // Some models return a blocked/empty response — try next
      lastErr = new Error(`Empty response from ${model}`);
      continue;
    }
    return text;
  }

  throw lastErr || new Error('All Gemini models and keys exhausted for today');
}

/**
 * Streaming Gemini call.
 * Rotates through all model × key combos on 429.
 * Calls onChunk(text) for each delta. Returns full accumulated text.
 */
export async function callClaudeStream({ messages, system, max_tokens = 1024, onChunk }) {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error('No Gemini API key configured');

  const attempts = buildAttempts(keys);
  let lastErr;

  for (const { key, model } of attempts) {
    const res = await fetch(apiUrl(key, model, true), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody(messages, system, max_tokens)),
    });

    if (res.status === 429) {
      lastErr = new Error(`Quota exhausted: ${model}`);
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 404) {
        lastErr = new Error(`Model not found: ${model}`);
        continue;
      }
      if (res.status === 400) {
        lastErr = new Error(`Bad request (${model}): ${errText.slice(0, 200)}`);
        continue;
      }
      throw new Error(`Gemini API error ${res.status} (${model}): ${errText.slice(0, 300)}`);
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

  throw lastErr || new Error('All Gemini models and keys exhausted for today');
}
