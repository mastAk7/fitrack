import { callClaude } from './claude.js';

function rateEntry(protein_g, calories, dailyCal = 2000) {
  const threshold45 = dailyCal * 0.45;
  if (protein_g >= 15 && calories <= threshold45) return 'good';
  if (protein_g < 10) return 'low_protein';
  if (calories > threshold45) return 'too_many_calories';
  return 'ok';
}

/**
 * Analyzes a meal from text. Always uses Gemini for accurate quantity parsing.
 */
export async function analyzeMealText(text, dailyCalTarget = 2000) {
  return analyzeMealWithGemini(text, null, dailyCalTarget);
}

/**
 * Batch-analyzes multiple text meals in a single Gemini call.
 * entries: [{ id, summary }]
 * Returns: [{ id, summary, protein_g, calories, rating, feedback, items }]
 */
export async function analyzeMealsBatch(entries, dailyCalTarget = 2000) {
  const threshold = Math.round(dailyCalTarget * 0.45);
  const list = entries.map(e => JSON.stringify({ id: e.id, text: e.summary || '' })).join(',\n');
  const prompt = `You are a nutrition analyzer. Analyze each meal and return ONLY a JSON array (no markdown, no extra text).

Meals:
[${list}]

For each return: {"id":<id>,"summary":"brief desc","protein_g":<number>,"calories":<number>,"rating":"good|ok|low_protein|too_many_calories","feedback":"one coaching note","items":["item1"]}
Rating: "good" if protein>=15 AND calories<=${threshold}, "low_protein" if protein<10, "too_many_calories" if calories>${threshold}, else "ok".
Pay close attention to quantities. Cover all food types worldwide.`;

  const responseText = await callClaude({ max_tokens: 8192, messages: [{ role: 'user', content: prompt }] });
  const cleaned = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Partial response — extract complete objects via regex
    const matches = [...cleaned.matchAll(/\{[^{}]*"id"\s*:\s*(\d+)[^{}]*"protein_g"\s*:\s*(\d+)[^{}]*\}/g)];
    if (matches.length > 0) {
      return matches.map(m => {
        try { return JSON.parse(m[0]); } catch { return null; }
      }).filter(Boolean);
    }
    throw new Error('Could not parse batch meal response');
  }
}

/**
 * Batch-extracts muscles from multiple workouts in a single Gemini call.
 * workouts: [{ id, exercises[] }]
 * Returns: [{ id, muscles: [{ name, intensity }] }]
 */
export async function extractMusclesBatch(workouts) {
  const list = workouts.map(w => JSON.stringify({
    id: w.id,
    exercises: w.exercises.filter(l => !l.trim().startsWith('//')).join(', '),
  })).join(',\n');
  const prompt = `You are a fitness analyst. Extract muscles worked for each workout. Return ONLY a JSON array (no markdown).

Workouts:
[${list}]

For each return: {"id":<id>,"muscles":[{"name":"Chest","intensity":4},...]}
Use ONLY these names: Chest, Front Delts, Side Delts, Rear Delts, Traps, Upper Back, Lats, Lower Back, Biceps, Triceps, Forearms, Abs, Obliques, Glutes, Quads, Hamstrings, Calves
Intensity 1-5 (1=very light, 5=very heavy). Only include muscles actually worked.`;

  const responseText = await callClaude({ max_tokens: 8192, messages: [{ role: 'user', content: prompt }] });
  const cleaned = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const matches = [...cleaned.matchAll(/\{"id"\s*:\s*(\d+)\s*,\s*"muscles"\s*:\s*(\[[^\]]*\])/g)];
    if (matches.length > 0) {
      return matches.map(m => {
        try { return { id: Number(m[1]), muscles: JSON.parse(m[2]) }; } catch { return null; }
      }).filter(Boolean);
    }
    throw new Error('Could not parse batch muscle response');
  }
}

/**
 * Analyzes a meal from an image (base64 data URI) + optional text context.
 */
export async function analyzeMealImage(base64DataUri, textContext = '', dailyCalTarget = 2000) {
  return analyzeMealWithGemini(textContext || 'Identify food in this image', base64DataUri, dailyCalTarget);
}

async function analyzeMealWithGemini(text, imageDataUri, dailyCalTarget = 2000) {
  const threshold = Math.round(dailyCalTarget * 0.45);
  const prompt = `You are a nutrition analyzer. The user ate: "${text}".
${imageDataUri ? 'Analyze the food shown in the image.' : ''}
Estimate macros accurately — pay close attention to quantities (e.g. "2 chapati" vs "1 chapati" should give different calorie values).
Be accurate for all food types: Indian, Western, packaged, anything.

Respond with ONLY valid JSON (no markdown, no extra text):
{"summary":"brief description","protein_g":25,"calories":400,"rating":"good","feedback":"one-line coaching note","items":["food item 1","food item 2"]}

Rating rules: "good" if protein>=15g AND calories<=${threshold}, "low_protein" if protein<10g, "too_many_calories" if calories>${threshold}, else "ok".`;

  try {
    const content = imageDataUri
      ? [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: getMediaType(imageDataUri),
              data: stripPrefix(imageDataUri),
            },
          },
          { type: 'text', text: prompt },
        ]
      : prompt;

    const responseText = await callClaude({
      max_tokens: 512,
      messages: [{ role: 'user', content }],
    });

    // Strip markdown code fences if present
    const cleaned = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary || text,
      protein_g: Number(parsed.protein_g) || 0,
      calories: Number(parsed.calories) || 0,
      rating: parsed.rating || rateEntry(Number(parsed.protein_g) || 0, Number(parsed.calories) || 0, dailyCalTarget),
      feedback: parsed.feedback || '',
      items: parsed.items || [],
    };
  } catch (err) {
    console.error('Gemini meal analysis error:', err);
    return {
      summary: text,
      protein_g: 0,
      calories: 0,
      rating: 'ok',
      feedback: 'Could not analyze — check API key or try again.',
      items: [],
    };
  }
}

function getMediaType(dataUri) {
  if (dataUri.startsWith('data:image/png')) return 'image/png';
  if (dataUri.startsWith('data:image/webp')) return 'image/webp';
  if (dataUri.startsWith('data:image/gif')) return 'image/gif';
  return 'image/jpeg';
}

function stripPrefix(dataUri) {
  return dataUri.replace(/^data:[^;]+;base64,/, '');
}

/**
 * Extracts muscles worked from a free-text workout log.
 * Returns an array: [{ name: string, intensity: 1-5 }]
 * Intensity: 1=light, 5=very heavy
 */
export async function extractMuscles(workoutLog) {
  const prompt = `You are a fitness analyst. Analyze this workout log and extract which muscle groups were worked and at what intensity.

Workout log:
${workoutLog}

Return ONLY valid JSON (no markdown):
{"muscles":[{"name":"Chest","intensity":4},{"name":"Triceps","intensity":3}]}

Use these exact muscle names (use only from this list):
Chest, Front Delts, Side Delts, Rear Delts, Traps, Upper Back, Lats, Lower Back, Biceps, Triceps, Forearms, Abs, Obliques, Glutes, Quads, Hamstrings, Calves

Intensity scale (1-5):
1 = very light / incidental
2 = light / accessory
3 = moderate
4 = heavy / primary
5 = very heavy / max effort

Lines starting with // are section comments — ignore them for muscle detection.
Only include muscles that were actually worked.`;

  try {
    const responseText = await callClaude({
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const cleaned = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

    // Try full parse first
    try {
      const parsed = JSON.parse(cleaned);
      return parsed.muscles || [];
    } catch {
      // Fallback: extract individual muscle objects via regex even if JSON is truncated
      const matches = [...cleaned.matchAll(/\{"name"\s*:\s*"([^"]+)"\s*,\s*"intensity"\s*:\s*(\d)/g)];
      if (matches.length > 0) {
        return matches.map(m => ({ name: m[1], intensity: Number(m[2]) }));
      }
      return [];
    }
  } catch (err) {
    console.error('Gemini muscle extraction error:', err);
    return [];
  }
}
