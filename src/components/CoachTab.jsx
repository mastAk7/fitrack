import { useState, useRef, useEffect } from 'react';
import ChatBubble from './ChatBubble.jsx';
import ImageUpload from './ImageUpload.jsx';
import { callClaudeStream } from '../engine/claude.js';
import { buildCoachContext } from '../engine/context.js';
import { saveDiet, saveWork, savePlanMods } from '../engine/storage.js';
import { analyzeMealsBatch, analyzeMealImage, extractMusclesBatch } from '../engine/analyzer.js';

const QUICK_PROMPTS = [
  'What to eat right now?',
  'Am I on track?',
  'Shorten today\'s workout',
  'I\'m tired today',
  '3 AM hunger 😅',
  'Progress review',
];

function todayStr() { return new Date().toISOString().split('T')[0]; }

/**
 * Parses a fenced JSON block from assistant response text.
 * Returns { text (cleaned), workoutMod, mealLog }
 */
function parseAssistantResponse(raw) {
  let text = raw;
  let workoutMod = null;
  let mealLog = null;

  const jsonBlockRegex = /```json\s*([\s\S]*?)```/g;
  let match;

  while ((match = jsonBlockRegex.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.workout_mod) workoutMod = parsed.workout_mod;
      if (parsed.meal_log) mealLog = parsed.meal_log;
    } catch {
      // ignore parse errors
    }
    // Remove JSON block from displayed text
    text = text.replace(match[0], '').trim();
  }

  return { text, workoutMod, mealLog };
}

export default function CoachTab({ dietMap, setDietMap, workMap, setWorkMap, planMods, setPlanMods, targets, dailyBriefing = '', healthMap = {} }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(userText, userImage) {
    const text = (userText || '').trim();
    if (!text && !userImage) return;

    setLoading(true);
    setError('');

    // Auto-analyze any pending meals/workouts before building coach context
    let freshDietMap = dietMap;
    let freshWorkMap = workMap;

    const pendingMeals = [...dietMap.values()].filter(e => e.analyzed === false);
    const pendingWorkouts = [...workMap.values()].filter(w => !w.muscles?.length);

    try {
      if (pendingMeals.length > 0) {
        setSyncStatus(`Syncing ${pendingMeals.length} meal${pendingMeals.length > 1 ? 's' : ''}…`);
        const newDietMap = new Map(dietMap);
        const textMeals = pendingMeals.filter(e => !e.imageData);
        const imageMeals = pendingMeals.filter(e => !!e.imageData);
        if (textMeals.length > 0) {
          const results = await analyzeMealsBatch(textMeals, targets.cal);
          for (const r of results) {
            const existing = newDietMap.get(r.id);
            if (existing) newDietMap.set(r.id, { ...existing, ...r, analyzed: true });
          }
        }
        for (const e of imageMeals) {
          const result = await analyzeMealImage(e.imageData, e.summary, targets.cal);
          newDietMap.set(e.id, { ...e, ...result, analyzed: true });
        }
        saveDiet(newDietMap);
        setDietMap(newDietMap);
        freshDietMap = newDietMap;
      }

      if (pendingWorkouts.length > 0) {
        setSyncStatus(`Syncing ${pendingWorkouts.length} workout${pendingWorkouts.length > 1 ? 's' : ''}…`);
        const results = await extractMusclesBatch(pendingWorkouts);
        const newWorkMap = new Map(workMap);
        for (const r of results) {
          const existing = newWorkMap.get(r.id);
          if (existing) newWorkMap.set(r.id, { ...existing, muscles: r.muscles || [] });
        }
        saveWork(newWorkMap);
        setWorkMap(newWorkMap);
        freshWorkMap = newWorkMap;
      }
    } catch {
      // silently continue — coach still works with partial data
    } finally {
      setSyncStatus('');
    }

    // Build user message content
    const userContent = userImage
      ? [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: getMediaType(userImage),
              data: stripPrefix(userImage),
            },
          },
          { type: 'text', text: text || 'What is this? Can you analyze it?' },
        ]
      : text;

    const newUserMsg = { role: 'user', content: userContent, displayText: text, imageData: userImage };

    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setImageData(null);

    // Build history for API (exclude display-only fields)
    const history = [...messages, newUserMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const systemPrompt = buildCoachContext(freshDietMap, freshWorkMap, targets, dailyBriefing, healthMap);
      let fullText = '';

      // Add a streaming placeholder
      const placeholderId = Date.now();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        displayText: '',
        id: placeholderId,
        streaming: true,
      }]);

      fullText = await callClaudeStream({
        system: systemPrompt,
        messages: history,
        max_tokens: 1024,
        onChunk: (chunk) => {
          setMessages(prev => prev.map(m =>
            m.id === placeholderId
              ? { ...m, content: m.content + chunk, displayText: m.content + chunk }
              : m
          ));
        },
      });

      const { text: cleanText, workoutMod, mealLog } = parseAssistantResponse(fullText);

      setMessages(prev => prev.map(m =>
        m.id === placeholderId
          ? {
              ...m,
              content: fullText,
              displayText: cleanText,
              streaming: false,
              workoutMod,
              mealLog,
            }
          : m
      ));
    } catch (err) {
      setError(err.message || 'Failed to reach coach. Check your API key.');
      setMessages(prev => prev.filter(m => !m.streaming));
    } finally {
      setLoading(false);
    }
  }

  function handleQuickPrompt(prompt) {
    sendMessage(prompt, null);
  }

  function applyWorkoutMod(mod) {
    const newMods = { ...planMods, [mod.dayIndex]: mod.exercises };
    setPlanMods(newMods);
    savePlanMods(newMods);
    // Mark as applied in the message
    setMessages(prev => prev.map(m =>
      m.workoutMod === mod ? { ...m, modApplied: true } : m
    ));
  }

  function logMeal(mealLog) {
    const entry = {
      id: Date.now(),
      date: todayStr(),
      time: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
      summary: mealLog.summary,
      protein_g: Number(mealLog.protein_g) || 0,
      calories: Number(mealLog.calories) || 0,
      rating: mealLog.rating || 'ok',
      feedback: mealLog.feedback || '',
      items: mealLog.items || [],
    };
    const newMap = new Map(dietMap);
    newMap.set(entry.id, entry);
    setDietMap(newMap);
    saveDiet(newMap);
    // Mark as logged
    setMessages(prev => prev.map(m =>
      m.mealLog === mealLog ? { ...m, mealLogged: true } : m
    ));
  }

  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      {/* Chat area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#e8e8ed', marginBottom: 4 }}>Shred Coach</div>
            <div style={{ fontSize: 13, color: '#7a7a8a', marginBottom: 24 }}>
              Your AI coaching assistant. Ask anything.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => handleQuickPrompt(p)}
                  style={{
                    background: '#13131a', border: '1px solid #1e1e2a',
                    borderRadius: 20, padding: '6px 14px',
                    color: '#b388ff', fontSize: 12, cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <ChatBubble
              role={msg.role}
              content={msg.displayText || (msg.streaming ? '…' : '')}
              imageData={msg.imageData}
            />

            {/* Workout mod card */}
            {msg.role === 'assistant' && msg.workoutMod && !msg.streaming && (
              <div style={{
                background: '#1a0a2a', border: '1px solid #b388ff40',
                borderRadius: 12, padding: '12px 14px', marginBottom: 10, marginLeft: 0,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#b388ff', marginBottom: 8 }}>
                  ✦ Apply workout modification to {DAY_NAMES[msg.workoutMod.dayIndex] || `Day ${msg.workoutMod.dayIndex}`}?
                </div>
                <div style={{ fontSize: 12, color: '#7a7a8a', marginBottom: 10 }}>
                  {msg.workoutMod.exercises?.slice(0, 4).map((e, j) => (
                    <div key={j} style={{ marginBottom: 2 }}>• {e}</div>
                  ))}
                  {msg.workoutMod.exercises?.length > 4 && (
                    <div style={{ color: '#4a4a5a' }}>+ {msg.workoutMod.exercises.length - 4} more</div>
                  )}
                </div>
                {msg.modApplied ? (
                  <div style={{ fontSize: 12, color: '#00e676' }}>✓ Applied to workout plan</div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => applyWorkoutMod(msg.workoutMod)}
                      style={{
                        background: '#b388ff', color: '#0a0a0f',
                        border: 'none', borderRadius: 8, padding: '6px 16px',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >Apply</button>
                    <button
                      onClick={() => setMessages(prev => prev.map((m, idx) =>
                        idx === i ? { ...m, workoutMod: null } : m
                      ))}
                      style={{
                        background: 'transparent', color: '#7a7a8a',
                        border: '1px solid #2a2a3a', borderRadius: 8, padding: '6px 12px',
                        fontSize: 12, cursor: 'pointer',
                      }}
                    >Dismiss</button>
                  </div>
                )}
              </div>
            )}

            {/* Meal log card */}
            {msg.role === 'assistant' && msg.mealLog && !msg.streaming && (
              <div style={{
                background: '#0a1a0a', border: '1px solid #00e67640',
                borderRadius: 12, padding: '12px 14px', marginBottom: 10,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#00e676', marginBottom: 6 }}>
                  🥗 Log this meal?
                </div>
                <div style={{ fontSize: 12, color: '#e8e8ed', marginBottom: 4 }}>
                  {msg.mealLog.summary}
                </div>
                <div style={{ fontSize: 12, color: '#7a7a8a', marginBottom: 10 }}>
                  {msg.mealLog.protein_g}g protein · {msg.mealLog.calories} kcal
                </div>
                {msg.mealLogged ? (
                  <div style={{ fontSize: 12, color: '#00e676' }}>✓ Logged to diet</div>
                ) : (
                  <button
                    onClick={() => logMeal(msg.mealLog)}
                    style={{
                      background: '#00e676', color: '#0a0a0f',
                      border: 'none', borderRadius: 8, padding: '6px 16px',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >Log this meal</button>
                )}
              </div>
            )}
          </div>
        ))}

        {error && (
          <div style={{
            background: '#1a0a0a', border: '1px solid #ff525240',
            borderRadius: 10, padding: '10px 14px', marginBottom: 8,
            fontSize: 12, color: '#ff5252',
          }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompts (when there are messages) */}
      {messages.length > 0 && (
        <div style={{
          padding: '6px 16px',
          display: 'flex', gap: 6, overflowX: 'auto',
          borderTop: '1px solid #1e1e2a',
        }}>
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => handleQuickPrompt(p)}
              disabled={loading}
              style={{
                background: '#13131a', border: '1px solid #1e1e2a',
                borderRadius: 16, padding: '5px 12px',
                color: '#b388ff', fontSize: 11, cursor: 'pointer',
                flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >{p}</button>
          ))}
        </div>
      )}

      {/* Sync status */}
      {syncStatus && (
        <div style={{ padding: '6px 16px', fontSize: 11, color: '#b388ff', background: '#13131a', borderTop: '1px solid #1e1e2a' }}>
          ⟳ {syncStatus}
        </div>
      )}

      {/* Input area */}
      <div style={{
        padding: '10px 16px 12px',
        borderTop: '1px solid #1e1e2a',
        background: '#0a0a0f',
      }}>
        {imageData && (
          <div style={{ marginBottom: 8 }}>
            <ImageUpload
              onImage={(b64) => setImageData(b64)}
              compact={true}
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {!imageData && (
            <ImageUpload
              label=""
              onImage={(b64) => setImageData(b64)}
              compact={false}
            />
          )}
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask your coach…"
            rows={1}
            disabled={loading}
            style={{
              flex: 1,
              background: '#13131a',
              border: '1px solid #1e1e2a',
              borderRadius: 10,
              padding: '9px 12px',
              color: '#e8e8ed',
              fontSize: 13,
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
              maxHeight: 120,
              overflow: 'auto',
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input, imageData);
              }
            }}
          />
          <button
            onClick={() => sendMessage(input, imageData)}
            disabled={loading || (!input.trim() && !imageData)}
            style={{
              background: loading || (!input.trim() && !imageData) ? '#1a1a2a' : '#b388ff',
              color: loading || (!input.trim() && !imageData) ? '#4a4a5a' : '#0a0a0f',
              border: 'none',
              borderRadius: 10,
              width: 40, height: 40,
              cursor: loading || (!input.trim() && !imageData) ? 'not-allowed' : 'pointer',
              fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            {loading ? '…' : '↑'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getMediaType(dataUri) {
  if (dataUri?.startsWith('data:image/png')) return 'image/png';
  if (dataUri?.startsWith('data:image/webp')) return 'image/webp';
  if (dataUri?.startsWith('data:image/gif')) return 'image/gif';
  return 'image/jpeg';
}

function stripPrefix(dataUri) {
  return (dataUri || '').replace(/^data:[^;]+;base64,/, '');
}
