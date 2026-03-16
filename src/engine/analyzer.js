import { callClaude } from './claude.js';

function rateEntry(protein_g, calories, dailyCal = 2000) {
  const threshold45 = dailyCal * 0.45;
  if (protein_g >= 15 && calories <= threshold45) return 'good';
  if (protein_g < 10) return 'low_protein';
  if (calories > threshold45) return 'too_many_calories';
  return 'ok';
}

// Shared vessel-size anchor — gives Gemini consistent gram equivalents so it can
// apply its own food knowledge for precise macros per specific dish.
const FOOD_REF = `
VESSEL SIZES — convert to grams of SOLID/DENSE food content, not total volume:
  small bowl  ≈ 150–180 g dense food  (or ~100–120 g solids if watery)
  medium bowl ≈ 250–300 g dense food  (or ~130–160 g solids if watery)
  big bowl    ≈ 400–450 g dense food  (or ~220–260 g solids if watery)
  small plate ≈ 150–200 g food
  big plate   ≈ 300–400 g food

WATERY / GRAVY PREPARATIONS ("water sabzi", thin dal, rasam, soup, kadhi, etc.):
  Liquid makes up 40–60% of the bowl. Estimate ONLY the solid ingredient weight —
  e.g. 1 medium bowl watery chole ≈ 130–150 g actual cooked chickpeas (rest is water/gravy).

LEGUMES — ALWAYS use COOKED weight values (NOT dry/raw):
  Cooked chickpeas / chole    = 9 g protein / 100 g,  164 kcal / 100 g
  Cooked rajma (kidney beans) = 9 g protein / 100 g,  150 kcal / 100 g
  Cooked moong dal (whole)    = 7 g protein / 100 g,  105 kcal / 100 g
  Cooked toor / arhar dal     = 7 g protein / 100 g,  116 kcal / 100 g
  Cooked chana dal            = 9 g protein / 100 g,  164 kcal / 100 g
  (Dry legumes have 2× the protein density — never use dry values for a cooked dish.)

BREAD (standard Indian sizes):
  1 roti / chapati = ~30 g → 100 kcal / 3 g protein
  1 big roti       = ~40 g → 130 kcal / 4 g protein
  1 paratha (plain)= ~60 g → 200 kcal / 5 g protein
  1 puri           = ~25 g → 90 kcal  / 2 g protein
  1 slice bread    = ~25 g → 80 kcal  / 3 g protein

For all other dishes (chilli paneer, dal makhani, palak paneer, etc.) use your food
knowledge for that specific dish. Do NOT flatten different dishes into a generic category.

Quantities multiply linearly: 2 medium bowls = 2 × one medium bowl.`.trim();

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
  const prompt = `You are a precision nutrition analyzer for a 19yo male (78kg) cutting at ${dailyCalTarget} kcal/day. He describes meals using vessel sizes (small bowl, medium bowl, big bowl, small plate, big plate) and bread counts.

${FOOD_REF}

Step 1: convert vessel size → grams using the table above.
Step 2: apply accurate macros for the SPECIFIC dish (chilli paneer ≠ palak paneer ≠ matar paneer; dal makhani ≠ moong dal; etc.). Use your food knowledge — do NOT flatten different dishes into a generic category.
Step 3: multiply linearly for multiple servings.

Analyze each meal below. Return ONLY a JSON array — no markdown, no extra text.

Meals:
[${list}]

For each meal return exactly this shape (no extra keys):
{
  "id":<id>,
  "summary":"brief description naming the actual dish",
  "protein_g":<total protein, number>,
  "calories":<total calories, number>,
  "rating":"good|ok|low_protein|too_many_calories",
  "feedback":"one specific coaching note with exact numbers",
  "items":[
    {
      "name":"dish / ingredient name",
      "qty":"human-readable quantity (e.g. '2 medium bowls (~280g)')",
      "weight_g":<estimated grams, number>,
      "calories":<item calories, number>,
      "protein_g":<item protein, number>,
      "carbs_g":<item carbs, number>,
      "fat_g":<item fat, number>,
      "fiber_g":<item fiber, number>,
      "iron_mg":<item iron, number>,
      "calcium_mg":<item calcium, number>
    }
  ]
}

Rating: "good" if protein_g>=15 AND calories<=${threshold} | "low_protein" if protein_g<10 | "too_many_calories" if calories>${threshold} | else "ok".
The sum of item calories and protein_g must equal the top-level totals.`;

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
  const prompt = `You are a precision nutrition analyzer for a 19yo male (78kg) cutting at ${dailyCalTarget} kcal/day. He describes meals using vessel sizes (small bowl, medium bowl, big bowl, small plate, big plate) and bread counts.

${FOOD_REF}

${imageDataUri
    ? `The user shared a photo of their meal.${text ? ` Context: "${text}"` : ' Identify all food items visible.'}`
    : `The user ate: "${text}"`}

Step 1: convert vessel size → grams using the table above.
Step 2: apply accurate macros for the SPECIFIC dish — chilli paneer, dal makhani, palak paneer, chole, etc. each have distinct macro profiles. Use your food knowledge precisely; do NOT flatten into generic categories.
Step 3: multiply linearly for multiple servings (2 medium bowls = 2×).

Feedback must be one specific, actionable note with exact numbers (e.g. "Only 8g protein here — add a medium bowl of curd to reach 16g"). Never generic.

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "summary":"dish name(s) with quantity",
  "protein_g":<total protein, number>,
  "calories":<total calories, number>,
  "rating":"good|ok|low_protein|too_many_calories",
  "feedback":"specific note with numbers",
  "items":[
    {
      "name":"dish / ingredient name",
      "qty":"human-readable quantity (e.g. '2 medium bowls (~280g)')",
      "weight_g":<estimated grams, number>,
      "calories":<item calories, number>,
      "protein_g":<item protein, number>,
      "carbs_g":<item carbs, number>,
      "fat_g":<item fat, number>,
      "fiber_g":<item fiber, number>,
      "iron_mg":<item iron, number>,
      "calcium_mg":<item calcium, number>
    }
  ]
}

Rating: "good" if protein_g>=15 AND calories<=${threshold} | "low_protein" if protein_g<10 | "too_many_calories" if calories>${threshold} | else "ok".
The sum of item calories and protein_g must equal the top-level totals.`;

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
