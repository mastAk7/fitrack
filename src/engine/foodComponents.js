/**
 * Exact Component-Based Food Mapping & Persistent Learned Food Engine.
 * 
 * Key Principles:
 * 1. Meals are split into distinct components (e.g. "2 roti, 2 bowls sabzi" -> "2 roti", "2 bowls sabzi").
 * 2. Each component is EXACTLY mapped by its full food name string (no substring bleed!).
 *    - "soya chunk pulav" !== "soya chunk rice" !== "soya chunk"
 *    - "sabzi" !== "gobhi sabzi"
 * 3. When a new component is analyzed by AI, it is permanently saved in localStorage.
 * 4. Future occurrences of that exact component are resolved instantly with 0 API tokens
 *    and scale linearly with quantity (e.g. 2 bowls = 2×).
 * 5. Users can view, edit, add, or delete their saved components in the Food Library.
 */

const STORAGE_KEY = 'fitrack_food_components_v1';

// Default base components — strictly unambiguous items with verified macros
export const DEFAULT_FOOD_COMPONENTS = {
  roti: {
    key: 'roti',
    name: 'Roti / Chapati',
    unit: 'piece',
    servingGrams: 35,
    calories: 100,
    protein_g: 3.2,
    carbs_g: 20,
    fat_g: 0.8,
    fiber_g: 2.5,
    iron_mg: 1.2,
    calcium_mg: 20,
    source: 'default',
  },
  chapati: {
    key: 'chapati',
    name: 'Roti / Chapati',
    unit: 'piece',
    servingGrams: 35,
    calories: 100,
    protein_g: 3.2,
    carbs_g: 20,
    fat_g: 0.8,
    fiber_g: 2.5,
    iron_mg: 1.2,
    calcium_mg: 20,
    source: 'default',
  },
  phulka: {
    key: 'phulka',
    name: 'Phulka',
    unit: 'piece',
    servingGrams: 30,
    calories: 95,
    protein_g: 3.2,
    carbs_g: 19,
    fat_g: 0.6,
    fiber_g: 2.5,
    iron_mg: 1.1,
    calcium_mg: 18,
    source: 'default',
  },
  paratha: {
    key: 'paratha',
    name: 'Plain Paratha',
    unit: 'piece',
    servingGrams: 60,
    calories: 200,
    protein_g: 4.5,
    carbs_g: 26,
    fat_g: 9.0,
    fiber_g: 2.5,
    iron_mg: 1.4,
    calcium_mg: 22,
    source: 'default',
  },
  puri: {
    key: 'puri',
    name: 'Puri',
    unit: 'piece',
    servingGrams: 30,
    calories: 110,
    protein_g: 2.2,
    carbs_g: 13,
    fat_g: 6.0,
    fiber_g: 1.0,
    iron_mg: 0.8,
    calcium_mg: 10,
    source: 'default',
  },
  bread: {
    key: 'bread',
    name: 'Bread slice',
    unit: 'slice',
    servingGrams: 28,
    calories: 75,
    protein_g: 2.8,
    carbs_g: 14,
    fat_g: 0.9,
    fiber_g: 1.2,
    iron_mg: 0.8,
    calcium_mg: 30,
    source: 'default',
  },
  'brown bread': {
    key: 'brown bread',
    name: 'Brown Bread slice',
    unit: 'slice',
    servingGrams: 28,
    calories: 70,
    protein_g: 3.5,
    carbs_g: 13,
    fat_g: 0.8,
    fiber_g: 2.0,
    iron_mg: 1.0,
    calcium_mg: 25,
    source: 'default',
  },
  egg: {
    key: 'egg',
    name: 'Whole Egg',
    unit: 'piece',
    servingGrams: 50,
    calories: 74,
    protein_g: 6.3,
    carbs_g: 0.5,
    fat_g: 5.0,
    fiber_g: 0,
    iron_mg: 0.9,
    calcium_mg: 28,
    source: 'default',
  },
  'boiled egg': {
    key: 'boiled egg',
    name: 'Boiled Egg',
    unit: 'piece',
    servingGrams: 50,
    calories: 74,
    protein_g: 6.3,
    carbs_g: 0.5,
    fat_g: 5.0,
    fiber_g: 0,
    iron_mg: 0.9,
    calcium_mg: 28,
    source: 'default',
  },
  'egg white': {
    key: 'egg white',
    name: 'Egg White',
    unit: 'piece',
    servingGrams: 33,
    calories: 17,
    protein_g: 3.6,
    carbs_g: 0.2,
    fat_g: 0.1,
    fiber_g: 0,
    iron_mg: 0.1,
    calcium_mg: 2,
    source: 'default',
  },
  curd: {
    key: 'curd',
    name: 'Curd / Dahi',
    unit: 'bowl',
    servingGrams: 180,
    calories: 117,
    protein_g: 6.3,
    carbs_g: 8.1,
    fat_g: 6.3,
    fiber_g: 0,
    iron_mg: 0.2,
    calcium_mg: 210,
    source: 'default',
  },
  dahi: {
    key: 'dahi',
    name: 'Curd / Dahi',
    unit: 'bowl',
    servingGrams: 180,
    calories: 117,
    protein_g: 6.3,
    carbs_g: 8.1,
    fat_g: 6.3,
    fiber_g: 0,
    iron_mg: 0.2,
    calcium_mg: 210,
    source: 'default',
  },
  milk: {
    key: 'milk',
    name: 'Toned Milk',
    unit: 'glass',
    servingGrams: 250,
    calories: 150,
    protein_g: 8.0,
    carbs_g: 12.0,
    fat_g: 7.8,
    fiber_g: 0,
    iron_mg: 0.2,
    calcium_mg: 290,
    source: 'default',
  },
  chaas: {
    key: 'chaas',
    name: 'Chaas / Buttermilk',
    unit: 'glass',
    servingGrams: 250,
    calories: 75,
    protein_g: 3.8,
    carbs_g: 6.3,
    fat_g: 3.0,
    fiber_g: 0,
    iron_mg: 0.1,
    calcium_mg: 150,
    source: 'default',
  },
  whey: {
    key: 'whey',
    name: 'Whey Protein (1 scoop)',
    unit: 'scoop',
    servingGrams: 33,
    calories: 125,
    protein_g: 24.0,
    carbs_g: 2.5,
    fat_g: 1.5,
    fiber_g: 0,
    iron_mg: 0.5,
    calcium_mg: 140,
    source: 'default',
  },
  'whey protein': {
    key: 'whey protein',
    name: 'Whey Protein (1 scoop)',
    unit: 'scoop',
    servingGrams: 33,
    calories: 125,
    protein_g: 24.0,
    carbs_g: 2.5,
    fat_g: 1.5,
    fiber_g: 0,
    iron_mg: 0.5,
    calcium_mg: 140,
    source: 'default',
  },
  banana: {
    key: 'banana',
    name: 'Banana (medium)',
    unit: 'piece',
    servingGrams: 110,
    calories: 95,
    protein_g: 1.3,
    carbs_g: 24.0,
    fat_g: 0.3,
    fiber_g: 2.8,
    iron_mg: 0.3,
    calcium_mg: 6,
    source: 'default',
  },
  apple: {
    key: 'apple',
    name: 'Apple (medium)',
    unit: 'piece',
    servingGrams: 150,
    calories: 80,
    protein_g: 0.5,
    carbs_g: 20.0,
    fat_g: 0.2,
    fiber_g: 4.0,
    iron_mg: 0.2,
    calcium_mg: 9,
    source: 'default',
  },
  'black coffee': {
    key: 'black coffee',
    name: 'Black Coffee',
    unit: 'cup',
    servingGrams: 200,
    calories: 5,
    protein_g: 0.3,
    carbs_g: 0.5,
    fat_g: 0,
    fiber_g: 0,
    iron_mg: 0.1,
    calcium_mg: 5,
    source: 'default',
  },
  coffee: {
    key: 'coffee',
    name: 'Black Coffee',
    unit: 'cup',
    servingGrams: 200,
    calories: 5,
    protein_g: 0.3,
    carbs_g: 0.5,
    fat_g: 0,
    fiber_g: 0,
    iron_mg: 0.1,
    calcium_mg: 5,
    source: 'default',
  },
};

/**
 * Load all food components from localStorage, merging with defaults.
 */
export function loadFoodComponents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const custom = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_FOOD_COMPONENTS, ...custom };
  } catch (err) {
    console.error('Error loading food components:', err);
    return { ...DEFAULT_FOOD_COMPONENTS };
  }
}

/**
 * Save food components map to localStorage.
 */
export function saveFoodComponents(componentsMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(componentsMap));
    // Dispatch custom event for reactive UI updates across components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fitrack_components_updated'));
    }
  } catch (err) {
    console.error('Error saving food components:', err);
  }
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val;
      if (a[i - 1] === b[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

const COMMON_TRANSLITERATIONS = {
  pulao: 'pulav',
  pulaav: 'pulav',
  pulaoo: 'pulav',
  sabji: 'sabzi',
  subzi: 'sabzi',
  subji: 'sabzi',
  chhole: 'chole',
  parantha: 'paratha',
  fulka: 'phulka',
  panir: 'paneer',
};

/**
 * Look up a food component by its exact key, with intelligent typo tolerance:
 * 1. Exact string match
 * 2. Plural / Singular match
 * 3. Common phonetic transliterations (e.g. sabji -> sabzi, pulao -> pulav)
 * 4. Levenshtein edit distance <= 1 (or <= 2 for multi-word phrases)
 */
export function getExactComponent(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return null;
  const key = normalizeFoodKey(rawKey);
  const all = loadFoodComponents();

  // 1. Direct exact match
  if (all[key]) return all[key];

  // 2. Singular / Plural match
  if (key.endsWith('s')) {
    const singular = key.slice(0, -1);
    if (all[singular]) return all[singular];
  }
  const plural = key + 's';
  if (all[plural]) return all[plural];

  // 3. Common transliterations / spelling variations
  let transliterated = key;
  for (const [variant, canonical] of Object.entries(COMMON_TRANSLITERATIONS)) {
    if (transliterated.includes(variant)) {
      transliterated = transliterated.replace(new RegExp(`\\b${variant}\\b`, 'g'), canonical);
    }
  }
  if (transliterated !== key) {
    if (all[transliterated]) return all[transliterated];
    if (transliterated.endsWith('s') && all[transliterated.slice(0, -1)]) return all[transliterated.slice(0, -1)];
  }

  // 4. Minor typo tolerance (Levenshtein distance <= 1 for keys >= 4 chars, <= 2 for keys >= 10 chars)
  let bestMatch = null;
  let minDistance = 999;

  for (const savedKey of Object.keys(all)) {
    const maxAllowedDist = key.length >= 10 ? 2 : key.length >= 4 ? 1 : 0;
    if (Math.abs(savedKey.length - key.length) > maxAllowedDist || maxAllowedDist === 0) continue;

    const dist = levenshteinDistance(key, savedKey);
    if (dist <= maxAllowedDist && dist < minDistance) {
      minDistance = dist;
      bestMatch = all[savedKey];
    }
  }

  return bestMatch;
}

/**
 * Save or update a single food component in the persistent library.
 */
export function saveSingleComponent(key, data) {
  const normKey = normalizeFoodKey(key);
  const current = loadFoodComponents();
  const updated = {
    ...current,
    [normKey]: {
      ...data,
      key: normKey,
      name: data.name || capitalizeWords(normKey),
      source: data.source || 'learned',
      updatedAt: new Date().toISOString(),
    },
  };
  saveFoodComponents(updated);
  return updated[normKey];
}

/**
 * Delete a component from user's storage. If it's a default, it will revert to default.
 */
export function deleteFoodComponent(key) {
  const normKey = normalizeFoodKey(key);
  const current = loadFoodComponents();
  delete current[normKey];
  saveFoodComponents(current);
}

/**
 * Reset user components to initial defaults.
 */
export function resetFoodComponents() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fitrack_components_updated'));
    }
  } catch {}
}

/**
 * Normalize food name string for exact key matching:
 * - Trims whitespace
 * - Converts to lowercase
 * - Strips redundant quotes, leading/trailing punctuation
 * - Collapses internal whitespace into single space
 */
export function normalizeFoodKey(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/["'’]/g, '')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Capitalize words for clean display names.
 */
function capitalizeWords(str) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Split a natural meal string into separate component phrases.
 * e.g. "2 roti, 2 bowls sabzi" -> ["2 roti", "2 bowls sabzi"]
 * e.g. "soya chunk pulav" -> ["soya chunk pulav"]
 * e.g. "soya chunk rice" -> ["soya chunk rice"]
 * e.g. "2 roti + 1 bowl dal and 1 cup curd" -> ["2 roti", "1 bowl dal", "1 cup curd"]
 */
export function splitMealText(text) {
  if (!text || typeof text !== 'string') return [];
  // Split on comma, plus, ampersand, newline, semicolon, or " and "
  return text
    .split(/[\+,\n;&]|(?:\s+and\s+)/i)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Vessel size multipliers (standard Indian katori / bowl / plate sizes)
 */
function getVesselMultiplier(sizeModifier) {
  if (!sizeModifier) return 1.0;
  const s = sizeModifier.toLowerCase();
  if (s.includes('small')) return 0.7;
  if (s.includes('big') || s.includes('large')) return 1.4;
  return 1.0; // medium or default
}

/**
 * Parse an individual component phrase to extract quantity, vessel/unit, and foodKey.
 * Examples:
 * - "2 roti" -> { qty: 2, unit: 'piece', foodKey: 'roti' }
 * - "2 bowls sabzi" -> { qty: 2, unit: 'bowl', size: null, foodKey: 'sabzi' }
 * - "1 medium bowl moong dal" -> { qty: 1, unit: 'bowl', size: 'medium', foodKey: 'moong dal' }
 * - "soya chunk pulav" -> { qty: 1, unit: 'serving', foodKey: 'soya chunk pulav' }
 * - "soya chunk rice" -> { qty: 1, unit: 'serving', foodKey: 'soya chunk rice' }
 * - "100g paneer" -> { qty: 100, unit: 'g', foodKey: 'paneer' }
 */
export function parseComponentPhrase(rawPhrase) {
  const phrase = rawPhrase.trim();
  if (!phrase) return null;

  // 1. Grams / ml notation: e.g. "100g paneer", "50 gm soya chunks", "250ml milk"
  const gramMatch = phrase.match(/^(\d+(?:\.\d+)?)\s*(?:g|gm|grams?|ml)\s+(?:of\s+)?(.*)$/i);
  if (gramMatch) {
    const qty = parseFloat(gramMatch[1]);
    const isMl = /ml/i.test(phrase.slice(0, 10));
    const foodKey = normalizeFoodKey(gramMatch[2]);
    return {
      rawPhrase: phrase,
      qty,
      unit: isMl ? 'ml' : 'g',
      sizeModifier: null,
      foodKey,
    };
  }

  // 2. Count + vessel/unit + food name: e.g. "2 bowls sabzi", "1 medium bowl dal", "1 plate soya chunk pulav"
  const vesselRegex = /^(\d+(?:\.\d+)?)\s*(?:(small|medium|big|large)\s+)?(bowl|bowls|katori|katoris|plate|plates|cup|cups|glass|glasses|piece|pieces|slice|slices|scoop|scoops|serving|servings)\s+(?:of\s+)?(.*)$/i;
  const vesselMatch = phrase.match(vesselRegex);
  if (vesselMatch) {
    const qty = parseFloat(vesselMatch[1]);
    const sizeModifier = vesselMatch[2]?.toLowerCase() || null;
    let unit = vesselMatch[3].toLowerCase();
    // Normalize unit name
    if (unit.startsWith('bowl') || unit.startsWith('katori')) unit = 'bowl';
    else if (unit.startsWith('plate')) unit = 'plate';
    else if (unit.startsWith('cup')) unit = 'cup';
    else if (unit.startsWith('glass')) unit = 'glass';
    else if (unit.startsWith('piece')) unit = 'piece';
    else if (unit.startsWith('slice')) unit = 'slice';
    else if (unit.startsWith('scoop')) unit = 'scoop';
    else unit = 'serving';

    const foodKey = normalizeFoodKey(vesselMatch[4]);
    return {
      rawPhrase: phrase,
      qty,
      unit,
      sizeModifier,
      foodKey,
    };
  }

  // 3. Count + food name without explicit vessel: e.g. "2 roti", "4 eggs", "1 banana"
  const countRegex = /^(\d+(?:\.\d+)?)\s+(.*)$/i;
  const countMatch = phrase.match(countRegex);
  if (countMatch) {
    const qty = parseFloat(countMatch[1]);
    const foodKey = normalizeFoodKey(countMatch[2]);
    return {
      rawPhrase: phrase,
      qty,
      unit: null, // will inherit from base component unit
      sizeModifier: null,
      foodKey,
    };
  }

  // 4. Vessel with "a / an / one": e.g. "a bowl of curd", "one medium bowl dal"
  const articleRegex = /^(?:a|an|one)\s+(?:(small|medium|big|large)\s+)?(bowl|katori|plate|cup|glass|piece|slice|scoop|serving)\s+(?:of\s+)?(.*)$/i;
  const articleMatch = phrase.match(articleRegex);
  if (articleMatch) {
    const sizeModifier = articleMatch[1]?.toLowerCase() || null;
    let unit = articleMatch[2].toLowerCase();
    if (unit.startsWith('bowl') || unit.startsWith('katori')) unit = 'bowl';
    else if (unit.startsWith('plate')) unit = 'plate';
    else unit = 'serving';

    const foodKey = normalizeFoodKey(articleMatch[3]);
    return {
      rawPhrase: phrase,
      qty: 1,
      unit,
      sizeModifier,
      foodKey,
    };
  }

  // 5. Standalone food item (exact dish string): e.g. "soya chunk pulav", "soya chunk rice", "sabzi"
  return {
    rawPhrase: phrase,
    qty: 1,
    unit: 'serving',
    sizeModifier: null,
    foodKey: normalizeFoodKey(phrase),
  };
}

/**
 * Resolves a meal's components using the persistent exact-mapping library.
 * Returns:
 * {
 *   resolved: boolean,
 *   meal: object (if resolved === true),
 *   parsedComponents: array of parsed component descriptors,
 *   unknownKeys: array of food keys that are not yet in the library
 * }
 */
export function resolveMealComponents(text, dailyCalTarget = 2000) {
  if (!text || typeof text !== 'string') return { resolved: false, parsedComponents: [], unknownKeys: [] };

  const phrases = splitMealText(text);
  if (phrases.length === 0) return { resolved: false, parsedComponents: [], unknownKeys: [] };

  const parsedComponents = [];
  const unknownKeys = [];
  const items = [];
  let totalProtein = 0;
  let totalCalories = 0;

  for (const phrase of phrases) {
    const parsed = parseComponentPhrase(phrase);
    if (!parsed || !parsed.foodKey) {
      return { resolved: false, parsedComponents, unknownKeys: [phrase] };
    }
    parsedComponents.push(parsed);

    const base = getExactComponent(parsed.foodKey);
    if (!base) {
      unknownKeys.push(parsed.foodKey);
      continue;
    }

    // Calculate item macros based on quantity and size modifier
    const sizeFactor = getVesselMultiplier(parsed.sizeModifier);
    let itemMultiplier = 1;
    let itemWeight = base.servingGrams || 100;
    let displayQty = '';

    if (parsed.unit === 'g' || parsed.unit === 'ml') {
      const baseGram = base.servingGrams || 100;
      itemMultiplier = parsed.qty / baseGram;
      itemWeight = parsed.qty;
      displayQty = `${parsed.qty}${parsed.unit}`;
    } else {
      itemMultiplier = parsed.qty * sizeFactor;
      itemWeight = Math.round((base.servingGrams || 100) * itemMultiplier);
      const sizePrefix = parsed.sizeModifier ? `${parsed.sizeModifier} ` : '';
      const unitLabel = parsed.unit || base.unit || 'serving';
      const pluralSuffix = parsed.qty > 1 && !unitLabel.endsWith('s') ? 's' : '';
      displayQty = `${parsed.qty} ${sizePrefix}${unitLabel}${pluralSuffix} (~${itemWeight}g)`.trim();
    }

    const itemC = Math.round(base.calories * itemMultiplier);
    const itemP = Math.round(base.protein_g * itemMultiplier * 10) / 10;
    const itemCarbs = Math.round((base.carbs_g || 0) * itemMultiplier * 10) / 10;
    const itemFat = Math.round((base.fat_g || 0) * itemMultiplier * 10) / 10;
    const itemFiber = Math.round((base.fiber_g || 0) * itemMultiplier * 10) / 10;

    items.push({
      name: base.name,
      componentKey: base.key,
      qty: displayQty,
      weight_g: itemWeight,
      calories: itemC,
      protein_g: itemP,
      carbs_g: itemCarbs,
      fat_g: itemFat,
      fiber_g: itemFiber,
      iron_mg: base.iron_mg != null ? Math.round(base.iron_mg * itemMultiplier * 10) / 10 : 0.8,
      calcium_mg: base.calcium_mg != null ? Math.round(base.calcium_mg * itemMultiplier) : 20,
      source: base.source || 'mapped',
    });

    totalProtein += itemP;
    totalCalories += itemC;
  }

  // If any component is unknown, we cannot resolve 100% locally
  if (unknownKeys.length > 0) {
    return {
      resolved: false,
      parsedComponents,
      unknownKeys,
    };
  }

  totalProtein = Math.round(totalProtein * 10) / 10;
  totalCalories = Math.round(totalCalories);

  // Rating rubric
  const threshold45 = Math.round(dailyCalTarget * 0.45);
  let rating = 'ok';
  if (totalProtein >= 15 && totalCalories <= threshold45) rating = 'good';
  else if (totalProtein < 10) rating = 'low_protein';
  else if (totalCalories > threshold45) rating = 'too_many_calories';

  // Coaching feedback
  let feedback = '';
  if (rating === 'good') {
    feedback = `Great meal! ${totalProtein}g protein matches your targets nicely.`;
  } else if (rating === 'low_protein') {
    feedback = `Only ${totalProtein}g protein. Add 1 bowl curd (+6g) or paneer/soya to hit your target.`;
  } else if (rating === 'too_many_calories') {
    feedback = `${totalCalories} kcal is high for this meal. Balance with a lighter dinner.`;
  } else {
    feedback = `Solid balanced meal (${totalProtein}g P / ${totalCalories} kcal).`;
  }

  return {
    resolved: true,
    parsedComponents,
    unknownKeys: [],
    meal: {
      summary: text.trim(),
      protein_g: totalProtein,
      calories: totalCalories,
      rating,
      feedback,
      items,
      analyzed: true,
      source: 'exact_mapping',
    },
  };
}

/**
 * Learns and permanently saves new components from an AI meal analysis.
 * Matches returned items back to the user's input component phrases and registers
 * exact string mappings.
 */
export function learnComponentsFromAnalysis(mealText, analyzedItems) {
  if (!mealText || !Array.isArray(analyzedItems) || analyzedItems.length === 0) return [];

  const phrases = splitMealText(mealText);
  const parsedComponents = phrases.map(parseComponentPhrase).filter(Boolean);
  const newlyLearned = [];

  // Match each parsed component with an item returned by AI
  for (const comp of parsedComponents) {
    if (!comp || !comp.foodKey) continue;

    // Check if component is already saved
    const existing = getExactComponent(comp.foodKey);
    if (existing && existing.source !== 'default') {
      continue; // already learned or customized
    }

    // Find the closest matching item from analyzed items
    // First try exact key match or substring in item.name
    let matchedItem = analyzedItems.find(it => {
      const itName = normalizeFoodKey(it.name || '');
      return itName === comp.foodKey || itName.includes(comp.foodKey) || comp.foodKey.includes(itName);
    });

    // If single component and single item, map directly
    if (!matchedItem && parsedComponents.length === 1 && analyzedItems.length === 1) {
      matchedItem = analyzedItems[0];
    }

    if (matchedItem) {
      // Calculate single unit base values
      const count = comp.qty > 0 ? comp.qty : 1;
      const sizeMultiplier = getVesselMultiplier(comp.sizeModifier);
      const totalDivisor = count * sizeMultiplier;

      const baseCalories = Math.max(1, Math.round(Number(matchedItem.calories || 0) / totalDivisor));
      const baseProtein = Math.round((Number(matchedItem.protein_g || 0) / totalDivisor) * 10) / 10;
      const baseCarbs = Math.round((Number(matchedItem.carbs_g || 0) / totalDivisor) * 10) / 10;
      const baseFat = Math.round((Number(matchedItem.fat_g || 0) / totalDivisor) * 10) / 10;
      const baseFiber = Math.round((Number(matchedItem.fiber_g || 0) / totalDivisor) * 10) / 10;
      const baseWeight = Math.round(Number(matchedItem.weight_g || 150) / totalDivisor);

      const componentData = {
        key: comp.foodKey,
        name: matchedItem.name || capitalizeWords(comp.foodKey),
        unit: comp.unit || 'serving',
        servingGrams: baseWeight,
        calories: baseCalories,
        protein_g: baseProtein,
        carbs_g: baseCarbs,
        fat_g: baseFat,
        fiber_g: baseFiber,
        iron_mg: Number(matchedItem.iron_mg) || 1.0,
        calcium_mg: Number(matchedItem.calcium_mg) || 20,
        source: 'learned',
      };

      saveSingleComponent(comp.foodKey, componentData);
      newlyLearned.push(componentData);
    }
  }

  // Also register items by their returned name if unique
  for (const item of analyzedItems) {
    if (!item.name) continue;
    const itemKey = normalizeFoodKey(item.name);
    if (!getExactComponent(itemKey)) {
      const baseWeight = Math.round(Number(item.weight_g || 150));
      saveSingleComponent(itemKey, {
        key: itemKey,
        name: item.name,
        unit: 'serving',
        servingGrams: baseWeight,
        calories: Math.max(1, Math.round(Number(item.calories || 0))),
        protein_g: Math.round(Number(item.protein_g || 0) * 10) / 10,
        carbs_g: Math.round(Number(item.carbs_g || 0) * 10) / 10,
        fat_g: Math.round(Number(item.fat_g || 0) * 10) / 10,
        fiber_g: Math.round(Number(item.fiber_g || 0) * 10) / 10,
        iron_mg: Number(item.iron_mg) || 1.0,
        calcium_mg: Number(item.calcium_mg) || 20,
        source: 'learned',
      });
    }
  }

  return newlyLearned;
}
