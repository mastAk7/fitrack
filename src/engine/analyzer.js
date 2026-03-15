import { FOOD_DB } from '../data/foodDb.js';
import { callClaude } from './claude.js';

/**
 * Matches food DB keys from free-text input using regex.
 * Returns { items, protein_g, calories }
 */
function matchFromText(text) {
  const lower = text.toLowerCase();
  const items = [];
  let protein_g = 0;
  let calories = 0;

  // Build patterns from DB keys
  const patterns = [
    // Multi-word matches first (longer keys)
    { key: 'soya chunks 100g', regex: /soya\s+chunks?/i },
    { key: 'paneer 100g', regex: /paneer/i },
    { key: 'sprouts 1 cup', regex: /sprouts?/i },
    { key: 'moong dal 1 bowl', regex: /moong\s*dal/i },
    { key: 'rajma 1 bowl', regex: /rajma/i },
    { key: 'milk 250ml', regex: /\bmilk\b/i },
    { key: 'curd 1 bowl', regex: /\bcurd\b/i },
    { key: 'gobhi sabzi 1 bowl', regex: /gobhi|cauliflower/i },
    { key: 'salad 1 bowl', regex: /\bsalad\b/i },
    { key: 'carrot pea sabzi', regex: /carrot.*pea|matar.*gajar/i },
    { key: 'peanuts 30g', regex: /peanuts?|mungfali/i },
    { key: 'rice 1 bowl', regex: /\brice\b/i },
    { key: 'chaap medium', regex: /\bchaap\b/i },
    { key: 'coffee', regex: /\bcoffee\b|\bbru\b/i },
    { key: 'almonds 10', regex: /almonds?/i },
    { key: 'custard 1 bowl', regex: /\bcustard\b/i },
    { key: 'banana', regex: /\bbanana/i },
    { key: 'roti', regex: /\broti\b|\bchapati\b/i },
    { key: 'egg', regex: /\begg\b/i },
  ];

  for (const { key, regex } of patterns) {
    const db = FOOD_DB[key];
    if (!db) continue;

    const match = lower.match(new RegExp(
      regex.source.replace(/\\b/g, '').trim(),
      'gi'
    ));

    if (match) {
      // Count quantity prefixes: "2 roti", "3 bananas", "big bowl"
      let qty = 1;
      const qtyPatterns = [
        /(\d+)\s*x?\s*/ ,
        /(\d+)\s+/,
      ];

      // Try to find quantity before the food name
      const keyWord = key.split(' ')[0];
      const qtyMatch = lower.match(new RegExp(`(\\d+)\\s+${keyWord}`, 'i'));
      if (qtyMatch) qty = parseInt(qtyMatch[1], 10) || 1;

      // Cap at reasonable quantities
      qty = Math.min(qty, 10);

      for (let i = 0; i < qty; i++) {
        items.push(key);
      }
      protein_g += db.p * qty;
      calories += db.c * qty;
    }
  }

  return { items, protein_g, calories };
}

function rateEntry(protein_g, calories, dailyCal = 2000) {
  const threshold45 = dailyCal * 0.45;
  if (protein_g >= 15 && calories <= threshold45) return 'good';
  if (protein_g < 10) return 'low_protein';
  if (calories > threshold45) return 'too_many_calories';
  return 'ok';
}

function simpleFeedback(rating, protein_g, calories) {
  switch (rating) {
    case 'good': return `Solid meal — ${protein_g}g protein, ${calories} kcal. Keep it up.`;
    case 'low_protein': return `Low protein (${protein_g}g) — add curd, eggs, or dal next time.`;
    case 'too_many_calories': return `Calorie-heavy (${calories} kcal) — watch the portions.`;
    default: return `Decent — ${protein_g}g protein, ${calories} kcal.`;
  }
}

/**
 * Analyzes a meal from text. Falls back to Claude API if no patterns matched.
 */
export async function analyzeMealText(text, dailyCalTarget = 2000) {
  const { items, protein_g, calories } = matchFromText(text);

  if (items.length === 0) {
    // Fallback to Claude
    return analyzeMealWithClaude(text, null, dailyCalTarget);
  }

  const rating = rateEntry(protein_g, calories, dailyCalTarget);
  return {
    summary: text,
    protein_g,
    calories,
    rating,
    feedback: simpleFeedback(rating, protein_g, calories),
    items,
  };
}

/**
 * Analyzes a meal from an image (base64 data URI) + optional text context.
 * Always uses Claude Vision.
 */
export async function analyzeMealImage(base64DataUri, textContext = '', dailyCalTarget = 2000) {
  return analyzeMealWithClaude(textContext || 'Identify food in this image', base64DataUri, dailyCalTarget);
}

async function analyzeMealWithClaude(text, imageDataUri, dailyCalTarget = 2000) {
  const prompt = `You are a nutrition analyzer. The user ate: "${text}".
${imageDataUri ? 'Analyze the food shown in the image.' : ''}
Estimate macros for Indian home-cooked food.

Respond with ONLY valid JSON (no markdown, no extra text):
{"summary":"brief description","protein_g":25,"calories":400,"rating":"good","feedback":"one-line coaching note","items":["food item 1","food item 2"]}

Rating rules: "good" if protein>=15g AND calories<=${Math.round(dailyCalTarget * 0.45)}, "low_protein" if protein<10g, "too_many_calories" if calories>${Math.round(dailyCalTarget * 0.45)}, else "ok".`;

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
      max_tokens: 300,
      messages: [{ role: 'user', content }],
    });

    const parsed = JSON.parse(responseText);
    return {
      summary: parsed.summary || text,
      protein_g: Number(parsed.protein_g) || 0,
      calories: Number(parsed.calories) || 0,
      rating: parsed.rating || 'ok',
      feedback: parsed.feedback || '',
      items: parsed.items || [],
    };
  } catch (err) {
    console.error('Claude meal analysis error:', err);
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
