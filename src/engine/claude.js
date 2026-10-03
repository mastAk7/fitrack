// Multi-Provider AI Client: Gemini (Primary Multi-Model × Multi-Key) + Groq (High-Speed Fallback)
// Rotates keys and models seamlessly to maximize free-tier availability.

import { loadUserApiKeys } from './storage.js';

const GEMINI_TEXT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

function getGeminiKeys() {
  const keys = [];
  const userKeys = loadUserApiKeys();
  if (userKeys.geminiKey) keys.push(userKeys.geminiKey);

  for (let i = 1; i <= 10; i++) {
    const k = import.meta.env[`VITE_GEMINI_API_KEY_${i}`];
    if (k && !keys.includes(k)) keys.push(k);
  }
  const legacy = import.meta.env.VITE_GEMINI_API_KEY;
  if (legacy && !keys.includes(legacy)) keys.push(legacy);
  return keys;
}

function getGroqKeys() {
  const keys = [];
  const userKeys = loadUserApiKeys();
  if (userKeys.groqKey) keys.push(userKeys.groqKey);

  const envGroq = import.meta.env.VITE_GROQ_API_KEY;
  if (envGroq && !keys.includes(envGroq)) keys.push(envGroq);
  return keys;
}

function geminiApiUrl(key, model, streaming = false) {
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

function buildGeminiBody(messages, system, max_tokens) {
  const body = {
    contents: toGeminiMessages(messages),
    generationConfig: { maxOutputTokens: max_tokens },
  };
  if (system) {
    body.system_instruction = { parts: [{ text: system }] };
  }
  return body;
}

function buildGeminiAttempts(keys) {
  const attempts = [];
  for (const key of keys) {
    for (const model of GEMINI_TEXT_MODELS) {
      attempts.push({ key, model });
    }
  }
  return attempts;
}

/**
 * Single-shot call with automatic fallback across Gemini and Groq
 */
export async function callClaude({ messages, system, max_tokens = 1024 }) {
  const geminiKeys = getGeminiKeys();
  const groqKeys = getGroqKeys();

  let lastErr;

  // 1. Try Gemini rotation
  if (geminiKeys.length > 0) {
    const attempts = buildGeminiAttempts(geminiKeys);
    for (const { key, model } of attempts) {
      try {
        const res = await fetch(geminiApiUrl(key, model, false), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildGeminiBody(messages, system, max_tokens)),
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
          if (res.status === 401 || res.status === 403) {
            lastErr = new Error(`Auth error on key: ${errText.slice(0, 200)}`);
            continue; // try next key
          }
          lastErr = new Error(`API error ${res.status} (${model})`);
          continue;
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
        lastErr = new Error(`Empty response from ${model}`);
      } catch (err) {
        lastErr = err;
      }
    }
  }

  // 2. Fallback to Groq if available
  if (groqKeys.length > 0) {
    for (const groqKey of groqKeys) {
      for (const groqModel of GROQ_MODELS) {
        try {
          const groqMsgs = [];
          if (system) groqMsgs.push({ role: 'system', content: system });
          for (const m of messages) {
            let content = '';
            if (typeof m.content === 'string') content = m.content;
            else if (Array.isArray(m.content)) {
              content = m.content.map(b => b.text || '').filter(Boolean).join('\n');
            }
            groqMsgs.push({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: content || '[photo attached]',
            });
          }

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: groqModel,
              messages: groqMsgs,
              max_tokens,
              temperature: 0.4,
            }),
          });

          if (!res.ok) {
            continue;
          }

          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return text;
        } catch {
          // try next groq model/key
        }
      }
    }
  }

  throw lastErr || new Error('All AI models and quota limits reached. Check your API keys in Settings.');
}

/**
 * Streaming call with automatic fallback across Gemini and Groq
 */
export async function callClaudeStream({ messages, system, max_tokens = 1024, onChunk }) {
  const geminiKeys = getGeminiKeys();
  const groqKeys = getGroqKeys();

  let lastErr;

  // 1. Try Gemini streaming
  if (geminiKeys.length > 0) {
    const attempts = buildGeminiAttempts(geminiKeys);
    for (const { key, model } of attempts) {
      try {
        const res = await fetch(geminiApiUrl(key, model, true), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildGeminiBody(messages, system, max_tokens)),
        });

        if (res.status === 429) {
          lastErr = new Error(`Quota exhausted: ${model}`);
          continue;
        }

        if (!res.ok) {
          if (res.status === 404 || res.status === 400) continue;
          lastErr = new Error(`Gemini error ${res.status} (${model})`);
          continue;
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

        if (full) return full;
      } catch (err) {
        lastErr = err;
      }
    }
  }

  // 2. Fallback to Groq streaming if available
  if (groqKeys.length > 0) {
    for (const groqKey of groqKeys) {
      for (const groqModel of GROQ_MODELS) {
        try {
          const groqMsgs = [];
          if (system) groqMsgs.push({ role: 'system', content: system });
          for (const m of messages) {
            let content = '';
            if (typeof m.content === 'string') content = m.content;
            else if (Array.isArray(m.content)) {
              content = m.content.map(b => b.text || '').filter(Boolean).join('\n');
            }
            groqMsgs.push({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: content || '[photo attached]',
            });
          }

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: groqModel,
              messages: groqMsgs,
              max_tokens,
              temperature: 0.4,
              stream: true,
            }),
          });

          if (!res.ok) continue;

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
                const chunk = evt.choices?.[0]?.delta?.content || '';
                if (chunk) {
                  full += chunk;
                  onChunk?.(chunk);
                }
              } catch {
                // ignore malformed SSE
              }
            }
          }

          if (full) return full;
        } catch {
          // try next
        }
      }
    }
  }

  throw lastErr || new Error('All AI models and quota limits reached. Check your API keys in Settings.');
}
