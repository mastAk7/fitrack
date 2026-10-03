/**
 * Exercise Log Parser:
 * Extracts structured sets, reps, weight, and volume load from freeform log lines.
 * Examples parsed:
 *   "Pull-ups 5 × 4"
 *   "DB rows 4 × 12 @ 10kg"
 *   "Bicep curls 3 × 10 @ 8kg, drop to 6kg"
 *   "Backpack push-ups 3 × max (12, 10, 9)"
 *   "Plank 3 × 60s"
 */

export function parseExerciseLine(line) {
  if (!line || typeof line !== 'string') return null;
  const raw = line.trim();
  if (raw.startsWith('//') || raw.length < 3) return null;

  // Name extraction (everything before sets/reps pattern like "3x10", "4 × 12", "5 sets")
  const splitMatch = raw.match(/^(.*?)(?:(?:\s+)(\d+)\s*(?:[x×]|sets?\s*of)\s*(\d+|max|\d+s)(.*))$/i);

  if (!splitMatch) {
    // Single set or simple text notation
    const simpleWeightMatch = raw.match(/@?\s*(\d+(?:\.\d+)?)\s*kg/i);
    return {
      raw,
      name: raw.replace(/@?\s*\d+(?:\.\d+)?\s*kg/i, '').trim(),
      sets: 1,
      reps: 1,
      weight_kg: simpleWeightMatch ? parseFloat(simpleWeightMatch[1]) : 0,
      totalVolume_kg: simpleWeightMatch ? parseFloat(simpleWeightMatch[1]) : 1,
      isBodyweight: !simpleWeightMatch,
    };
  }

  const name = splitMatch[1].trim();
  const sets = parseInt(splitMatch[2], 10) || 1;
  const repStr = splitMatch[3].trim().toLowerCase();
  const trailing = splitMatch[4] || '';

  let reps = 0;
  if (repStr === 'max') {
    // Check if parenthetical details exist e.g. "(12, 10, 9)"
    const parenMatch = trailing.match(/\(([\d\s,]+)\)/);
    if (parenMatch) {
      const numbers = parenMatch[1].split(',').map(n => parseInt(n.trim(), 10)).filter(Boolean);
      reps = numbers.length > 0 ? Math.round(numbers.reduce((s, n) => s + n, 0) / numbers.length) : 8;
    } else {
      reps = 8;
    }
  } else if (repStr.endsWith('s')) {
    reps = parseInt(repStr, 10) || 60; // seconds
  } else {
    reps = parseInt(repStr, 10) || 10;
  }

  // Weight extraction (e.g. "@ 10kg", "@ 6→8kg", "12kg")
  const weightMatch = trailing.match(/@?\s*(\d+(?:\.\d+)?)\s*kg/i) || raw.match(/@?\s*(\d+(?:\.\d+)?)\s*kg/i);
  const weight_kg = weightMatch ? parseFloat(weightMatch[1]) : 0;
  const isBodyweight = weight_kg === 0;

  const totalVolume_kg = isBodyweight ? sets * reps : Math.round(sets * reps * weight_kg);

  return {
    raw,
    name,
    sets,
    reps,
    weight_kg,
    totalVolume_kg,
    isBodyweight,
  };
}

export function parseWorkoutExercises(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map(parseExerciseLine).filter(Boolean);
}
