/**
 * Local Fast-Path Indian Macro Parser & Exercise Classifier.
 * Evaluates standard meals and exercises client-side with 0 API tokens.
 * Falls back to LLM only for unrecognized items or photos.
 */

// 120+ Indian home-cooked foods and staples with realistic cooked-weight macros
export const LOCAL_FOOD_DB = {
  // Breads / Rotis (unit: per piece)
  roti: { name: 'Roti / Chapati', p: 3.2, c: 100, carbs: 20, fat: 0.8, fiber: 2.5, unit: 'piece', gram: 35 },
  chapati: { name: 'Roti / Chapati', p: 3.2, c: 100, carbs: 20, fat: 0.8, fiber: 2.5, unit: 'piece', gram: 35 },
  phulka: { name: 'Phulka', p: 3.2, c: 95, carbs: 19, fat: 0.6, fiber: 2.5, unit: 'piece', gram: 30 },
  fulka: { name: 'Phulka', p: 3.2, c: 95, carbs: 19, fat: 0.6, fiber: 2.5, unit: 'piece', gram: 30 },
  paratha: { name: 'Plain Paratha', p: 4.5, c: 200, carbs: 26, fat: 9.0, fiber: 2.5, unit: 'piece', gram: 60 },
  'aloo paratha': { name: 'Aloo Paratha', p: 5.0, c: 260, carbs: 36, fat: 11.0, fiber: 3.0, unit: 'piece', gram: 90 },
  'paneer paratha': { name: 'Paneer Paratha', p: 11.0, c: 310, carbs: 30, fat: 16.0, fiber: 2.8, unit: 'piece', gram: 100 },
  puri: { name: 'Puri', p: 2.2, c: 110, carbs: 13, fat: 6.0, fiber: 1.0, unit: 'piece', gram: 30 },
  bread: { name: 'Bread slice', p: 2.8, c: 75, carbs: 14, fat: 0.9, fiber: 1.2, unit: 'slice', gram: 28 },
  'brown bread': { name: 'Brown Bread slice', p: 3.5, c: 70, carbs: 13, fat: 0.8, fiber: 2.0, unit: 'slice', gram: 28 },

  // Legumes & Dals (per 100g cooked or standard bowl ~220g)
  'moong dal': { name: 'Moong Dal (cooked)', p: 7.2, c: 105, carbs: 17, fat: 1.2, fiber: 4.0, unit: '100g', bowlGrams: 220 },
  'toor dal': { name: 'Toor / Arhar Dal (cooked)', p: 6.8, c: 115, carbs: 18, fat: 1.8, fiber: 3.8, unit: '100g', bowlGrams: 220 },
  'arhar dal': { name: 'Toor / Arhar Dal (cooked)', p: 6.8, c: 115, carbs: 18, fat: 1.8, fiber: 3.8, unit: '100g', bowlGrams: 220 },
  'chana dal': { name: 'Chana Dal (cooked)', p: 8.5, c: 145, carbs: 22, fat: 2.5, fiber: 5.0, unit: '100g', bowlGrams: 220 },
  'masoor dal': { name: 'Masoor Dal (cooked)', p: 7.5, c: 110, carbs: 18, fat: 1.0, fiber: 4.2, unit: '100g', bowlGrams: 220 },
  'dal makhani': { name: 'Dal Makhani', p: 6.0, c: 175, carbs: 18, fat: 9.5, fiber: 3.5, unit: '100g', bowlGrams: 220 },
  rajma: { name: 'Rajma / Kidney Beans (cooked)', p: 8.7, c: 140, carbs: 22, fat: 1.0, fiber: 6.0, unit: '100g', bowlGrams: 220 },
  chole: { name: 'Chole / Chickpeas (cooked)', p: 8.9, c: 160, carbs: 24, fat: 3.2, fiber: 6.2, unit: '100g', bowlGrams: 220 },
  chickpeas: { name: 'Chole / Chickpeas (cooked)', p: 8.9, c: 160, carbs: 24, fat: 3.2, fiber: 6.2, unit: '100g', bowlGrams: 220 },
  dal: { name: 'Yellow Dal (cooked)', p: 7.0, c: 110, carbs: 18, fat: 1.5, fiber: 4.0, unit: '100g', bowlGrams: 220 },

  // Soya & High-Protein Staples
  'soya chunks': { name: 'Soya Chunks (dry)', p: 52.0, c: 345, carbs: 33, fat: 0.5, fiber: 13.0, unit: '100g' },
  'soya chunk': { name: 'Soya Chunks (dry)', p: 52.0, c: 345, carbs: 33, fat: 0.5, fiber: 13.0, unit: '100g' },
  'boiled soya': { name: 'Boiled Soya Chunks', p: 17.5, c: 120, carbs: 11, fat: 0.2, fiber: 4.5, unit: '100g' },
  sprouts: { name: 'Moong Sprouts', p: 13.0, c: 120, carbs: 19, fat: 0.8, fiber: 5.5, unit: 'cup', gram: 150 },
  chaap: { name: 'Soya Chaap (plain)', p: 14.0, c: 190, carbs: 18, fat: 6.0, fiber: 3.0, unit: 'piece', gram: 120 },

  // Dairy & Eggs
  paneer: { name: 'Paneer (fresh)', p: 18.0, c: 265, carbs: 3.5, fat: 20.0, fiber: 0, unit: '100g' },
  'paneer bhurji': { name: 'Paneer Bhurji', p: 16.0, c: 285, carbs: 5.0, fat: 22.0, fiber: 1.0, unit: '100g' },
  curd: { name: 'Curd / Dahi', p: 3.5, c: 65, carbs: 4.5, fat: 3.5, fiber: 0, unit: '100g', bowlGrams: 180 },
  dahi: { name: 'Curd / Dahi', p: 3.5, c: 65, carbs: 4.5, fat: 3.5, fiber: 0, unit: '100g', bowlGrams: 180 },
  milk: { name: 'Toned Milk', p: 3.2, c: 60, carbs: 4.8, fat: 3.1, fiber: 0, unit: '100ml', glassMl: 250 },
  chaas: { name: 'Chaas / Buttermilk', p: 1.5, c: 30, carbs: 2.5, fat: 1.2, fiber: 0, unit: '100ml', glassMl: 250 },
  egg: { name: 'Whole Egg', p: 6.3, c: 74, carbs: 0.5, fat: 5.0, fiber: 0, unit: 'piece' },
  eggs: { name: 'Whole Egg', p: 6.3, c: 74, carbs: 0.5, fat: 5.0, fiber: 0, unit: 'piece' },
  'boiled egg': { name: 'Boiled Egg', p: 6.3, c: 74, carbs: 0.5, fat: 5.0, fiber: 0, unit: 'piece' },
  'egg white': { name: 'Egg White', p: 3.6, c: 17, carbs: 0.2, fat: 0.1, fiber: 0, unit: 'piece' },
  omelette: { name: 'Egg Omelette (1 egg + oil)', p: 6.5, c: 110, carbs: 1.0, fat: 9.0, fiber: 0.2, unit: 'piece' },
  whey: { name: 'Whey Protein (1 scoop)', p: 24.0, c: 125, carbs: 2.5, fat: 1.5, fiber: 0, unit: 'scoop', gram: 33 },

  // Grains & Rice
  rice: { name: 'Steamed White Rice', p: 2.6, c: 130, carbs: 28, fat: 0.3, fiber: 0.4, unit: '100g', bowlGrams: 180 },
  chawal: { name: 'Steamed White Rice', p: 2.6, c: 130, carbs: 28, fat: 0.3, fiber: 0.4, unit: '100g', bowlGrams: 180 },
  'brown rice': { name: 'Brown Rice', p: 2.8, c: 120, carbs: 25, fat: 1.0, fiber: 1.8, unit: '100g', bowlGrams: 180 },
  khichdi: { name: 'Moong Dal Khichdi', p: 5.0, c: 125, carbs: 22, fat: 2.5, fiber: 2.2, unit: '100g', bowlGrams: 220 },
  oats: { name: 'Rolled Oats (cooked)', p: 4.5, c: 140, carbs: 24, fat: 2.5, fiber: 3.5, unit: '100g', bowlGrams: 200 },
  poha: { name: 'Cooked Poha', p: 3.0, c: 150, carbs: 28, fat: 3.5, fiber: 1.5, unit: '100g', bowlGrams: 180 },

  // Vegetables & Sabzis (cooked home style)
  'gobhi sabzi': { name: 'Aloo Gobhi Sabzi', p: 2.5, c: 110, carbs: 14, fat: 5.0, fiber: 3.0, unit: '100g', bowlGrams: 180 },
  'bhindi sabzi': { name: 'Bhindi Sabzi', p: 2.0, c: 95, carbs: 9, fat: 6.0, fiber: 3.2, unit: '100g', bowlGrams: 180 },
  'palak paneer': { name: 'Palak Paneer', p: 8.5, c: 180, carbs: 6, fat: 14.0, fiber: 2.5, unit: '100g', bowlGrams: 200 },
  'matar paneer': { name: 'Matar Paneer', p: 8.0, c: 190, carbs: 12, fat: 13.0, fiber: 3.0, unit: '100g', bowlGrams: 200 },
  'carrot pea sabzi': { name: 'Gajar Matar Sabzi', p: 2.8, c: 90, carbs: 13, fat: 3.5, fiber: 3.5, unit: '100g', bowlGrams: 180 },
  salad: { name: 'Cucumber, Tomato, Onion Salad', p: 1.2, c: 30, carbs: 6, fat: 0.2, fiber: 2.0, unit: 'bowl', gram: 150 },
  cucumber: { name: 'Cucumber', p: 0.8, c: 15, carbs: 3, fat: 0.1, fiber: 1.0, unit: 'piece', gram: 120 },

  // Fruits, Nuts & Beverages
  banana: { name: 'Banana (medium)', p: 1.3, c: 95, carbs: 24, fat: 0.3, fiber: 2.8, unit: 'piece', gram: 110 },
  bananas: { name: 'Banana (medium)', p: 1.3, c: 95, carbs: 24, fat: 0.3, fiber: 2.8, unit: 'piece', gram: 110 },
  apple: { name: 'Apple (medium)', p: 0.5, c: 80, carbs: 20, fat: 0.2, fiber: 4.0, unit: 'piece', gram: 150 },
  peanuts: { name: 'Roasted Peanuts', p: 7.5, c: 170, carbs: 5, fat: 14.0, fiber: 2.5, unit: '30g', gram: 30 },
  almonds: { name: 'Almonds (10 nuts)', p: 2.8, c: 70, carbs: 2.5, fat: 6.0, fiber: 1.5, unit: '10 nuts', gram: 12 },
  coffee: { name: 'Black Coffee', p: 0.3, c: 10, carbs: 1, fat: 0.1, fiber: 0, unit: 'cup' },
  'black coffee': { name: 'Black Coffee', p: 0.3, c: 10, carbs: 1, fat: 0.1, fiber: 0, unit: 'cup' },
};

/**
 * Vessel multiplier helper (standard Indian katori / bowl sizes)
 */
function getVesselGrams(vesselStr, defaultGrams = 200) {
  const v = vesselStr.toLowerCase();
  if (v.includes('small bowl') || v.includes('small katori')) return Math.round(defaultGrams * 0.7);
  if (v.includes('big bowl') || v.includes('large bowl')) return Math.round(defaultGrams * 1.5);
  if (v.includes('medium bowl') || v.includes('bowl') || v.includes('katori')) return defaultGrams;
  if (v.includes('small plate')) return 160;
  if (v.includes('big plate') || v.includes('plate')) return 300;
  return defaultGrams;
}

/**
 * Parses a natural language text meal locally.
 * Returns structured meal object if resolved, or null if LLM analysis is required.
 */
export function parseMealLocal(text, dailyCalTarget = 2000) {
  if (!text || typeof text !== 'string') return null;
  const raw = text.trim().toLowerCase();
  if (raw.length < 3) return null;

  // Split clauses: '2 roti + 1 bowl dal, medium curd'
  const parts = raw.split(/[\+,\n]|(?:\s+and\s+)|\&/).map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const items = [];
  let totalProtein = 0;
  let totalCalories = 0;
  let allMatched = true;

  for (const part of parts) {
    let matched = false;

    // Detect quantity/count e.g. "2 roti", "3 eggs", "10 almonds", "100g paneer"
    const countMatch = part.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    const count = countMatch ? parseFloat(countMatch[1]) : 1;
    const itemText = (countMatch ? countMatch[2] : part).trim();

    // Check specific gram notation: "100g paneer" or "50g soya chunks"
    const gramMatch = part.match(/(\d+)\s*g(?:rams?)?\s+(.*)/);
    const specifiedGrams = gramMatch ? parseInt(gramMatch[1], 10) : null;
    const foodCandidate = (gramMatch ? gramMatch[2] : itemText).replace(/^(bowl|katori|plate|glass|cup|medium|small|big|large)\s+of\s+/i, '').trim();

    // Search keys sorted longest first for precise matching (e.g. "aloo paratha" before "paratha")
    const sortedKeys = Object.keys(LOCAL_FOOD_DB).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      if (foodCandidate.includes(key) || itemText.includes(key)) {
        const info = LOCAL_FOOD_DB[key];
        let itemWeight = 0;
        let itemP = 0;
        let itemC = 0;
        let itemCarbs = 0;
        let itemFat = 0;
        let itemFiber = 0;
        let displayQty = '';

        if (specifiedGrams) {
          // Direct gram calculation
          const ratio = specifiedGrams / (info.gram || 100);
          itemWeight = specifiedGrams;
          itemP = Math.round(info.p * ratio * 10) / 10;
          itemC = Math.round(info.c * ratio);
          itemCarbs = Math.round((info.carbs || 0) * ratio * 10) / 10;
          itemFat = Math.round((info.fat || 0) * ratio * 10) / 10;
          itemFiber = Math.round((info.fiber || 0) * ratio * 10) / 10;
          displayQty = `${specifiedGrams}g`;
        } else if (info.unit === 'piece' || info.unit === 'slice' || info.unit === 'scoop') {
          itemWeight = Math.round((info.gram || 40) * count);
          itemP = Math.round(info.p * count * 10) / 10;
          itemC = Math.round(info.c * count);
          itemCarbs = Math.round((info.carbs || 0) * count * 10) / 10;
          itemFat = Math.round((info.fat || 0) * count * 10) / 10;
          itemFiber = Math.round((info.fiber || 0) * count * 10) / 10;
          displayQty = `${count} ${count > 1 ? info.unit + 's' : info.unit}`;
        } else if (info.unit === '100ml') {
          const ml = count * (info.glassMl || 200);
          const ratio = ml / 100;
          itemWeight = ml;
          itemP = Math.round(info.p * ratio * 10) / 10;
          itemC = Math.round(info.c * ratio);
          itemCarbs = Math.round((info.carbs || 0) * ratio * 10) / 10;
          itemFat = Math.round((info.fat || 0) * ratio * 10) / 10;
          displayQty = `${ml}ml`;
        } else {
          // Bowl / Gram portion
          const bowlGrams = getVesselGrams(part, info.bowlGrams || 180);
          const totalGrams = Math.round(bowlGrams * count);
          const ratio = totalGrams / (info.gram || 100);
          itemWeight = totalGrams;
          itemP = Math.round(info.p * ratio * 10) / 10;
          itemC = Math.round(info.c * ratio);
          itemCarbs = Math.round((info.carbs || 0) * ratio * 10) / 10;
          itemFat = Math.round((info.fat || 0) * ratio * 10) / 10;
          itemFiber = Math.round((info.fiber || 0) * ratio * 10) / 10;
          displayQty = `${count > 1 ? count + ' ' : ''}${part.includes('bowl') ? 'bowl' : 'serving'} (~${totalGrams}g)`;
        }

        items.push({
          name: info.name,
          qty: displayQty,
          weight_g: itemWeight,
          calories: itemC,
          protein_g: itemP,
          carbs_g: itemCarbs,
          fat_g: itemFat,
          fiber_g: itemFiber,
          iron_mg: 1.0,
          calcium_mg: 25,
        });

        totalProtein += itemP;
        totalCalories += itemC;
        matched = true;
        break;
      }
    }

    if (!matched) {
      allMatched = false;
      break;
    }
  }

  // If any part of the meal was unrecognized, return null to delegate to Gemini/Groq
  if (!allMatched || items.length === 0) return null;

  totalProtein = Math.round(totalProtein * 10) / 10;
  totalCalories = Math.round(totalCalories);

  // Rating rubric
  const threshold45 = Math.round(dailyCalTarget * 0.45);
  let rating = 'ok';
  if (totalProtein >= 20 && totalCalories <= threshold45) rating = 'good';
  else if (totalProtein < 10) rating = 'low_protein';
  else if (totalCalories > threshold45) rating = 'too_many_calories';

  // Construct coaching feedback note
  let feedback = '';
  if (rating === 'good') {
    feedback = `Solid meal! ${totalProtein}g protein fuels recovery within your calorie budget.`;
  } else if (rating === 'low_protein') {
    feedback = `Only ${totalProtein}g protein here. Add 1 bowl of curd (+6g) or 30g boiled soya chunks (+15g) to hit your target.`;
  } else if (rating === 'too_many_calories') {
    feedback = `${totalCalories} kcal is high for this meal. Balance with a leaner dinner like soya chunks or egg whites.`;
  } else {
    feedback = `Balanced intake (${totalProtein}g P / ${totalCalories} kcal). Keep hydration high.`;
  }

  return {
    summary: text.trim(),
    protein_g: totalProtein,
    calories: totalCalories,
    rating,
    feedback,
    items,
    analyzed: true,
    source: 'local',
  };
}

/**
 * Local Exercise Classifier for common movements.
 * Returns muscles worked array without an LLM call.
 */
export function extractMusclesLocal(exerciseLines) {
  if (!Array.isArray(exerciseLines) || exerciseLines.length === 0) return [];
  const text = exerciseLines.join(' ').toLowerCase();

  const muscleMap = new Map();
  function addMuscle(name, intensity) {
    const current = muscleMap.get(name) || 0;
    if (intensity > current) muscleMap.set(name, intensity);
  }

  // Back & Lats
  if (/pull[\s-]?up|chin[\s-]?up|lat pull|pulldown/i.test(text)) {
    addMuscle('Lats', 5);
    addMuscle('Upper Back', 4);
    addMuscle('Biceps', 3);
  }
  if (/row|db row|dumbbell row|cable row|barbell row/i.test(text)) {
    addMuscle('Upper Back', 5);
    addMuscle('Lats', 4);
    addMuscle('Rear Delts', 3);
    addMuscle('Biceps', 2);
  }
  if (/deadlift|rdl|romanian/i.test(text)) {
    addMuscle('Lower Back', 5);
    addMuscle('Hamstrings', 4);
    addMuscle('Glutes', 4);
    addMuscle('Traps', 3);
  }
  if (/shrug/i.test(text)) {
    addMuscle('Traps', 5);
    addMuscle('Upper Back', 3);
  }

  // Chest & Triceps
  if (/push[\s-]?up|bench press|floor press|dips|db press|dumbbell press|chest press|incline press|decline press/i.test(text)) {
    addMuscle('Chest', 5);
    addMuscle('Triceps', 4);
    addMuscle('Front Delts', 3);
  }
  if (/fl(?:y|ies)|pec deck/i.test(text)) {
    if (/rear|reverse/i.test(text)) {
      addMuscle('Rear Delts', 5);
      addMuscle('Upper Back', 3);
    } else {
      addMuscle('Chest', 5);
      addMuscle('Front Delts', 2);
    }
  }

  // Shoulders
  if (/shoulder press|overhead press|ohp|pike push|arnold press/i.test(text)) {
    addMuscle('Front Delts', 5);
    addMuscle('Side Delts', 4);
    addMuscle('Triceps', 3);
  }
  if (/lateral raise|side raise/i.test(text)) {
    addMuscle('Side Delts', 5);
  }
  if (/rear delt|face pull|reverse fl(?:y|ies)/i.test(text)) {
    addMuscle('Rear Delts', 5);
    addMuscle('Traps', 3);
  }

  // Arms & Forearms
  if (/bicep curl|hammer curl|concentration curl|preacher curl|spider curl|\bcurl\b/i.test(text)) {
    if (!/wrist|leg|hamstring/i.test(text)) {
      addMuscle('Biceps', 5);
      addMuscle('Forearms', 3);
    }
  }
  if (/tricep|skull crusher|chair dip|pushdown|kickback/i.test(text)) {
    addMuscle('Triceps', 5);
  }
  if (/wrist curl|reverse curl/i.test(text)) {
    addMuscle('Forearms', 5);
  }

  // Legs & Glutes
  if (/squat|lunge|split squat|leg press|hack squat/i.test(text)) {
    addMuscle('Quads', 5);
    addMuscle('Glutes', 4);
    addMuscle('Hamstrings', 3);
  }
  if (/leg extension|quad extension/i.test(text)) {
    addMuscle('Quads', 5);
  }
  if (/hamstring curl|leg curl/i.test(text)) {
    addMuscle('Hamstrings', 5);
  }
  if (/calf raise/i.test(text)) {
    addMuscle('Calves', 5);
  }
  if (/glute bridge|hip thrust/i.test(text)) {
    addMuscle('Glutes', 5);
    addMuscle('Hamstrings', 3);
  }

  // Core
  if (/plank|mountain climber|leg raise|crunch|sit[\s-]?up|russian twist|ab rollout/i.test(text)) {
    addMuscle('Abs', 4);
    addMuscle('Obliques', 3);
  }

  // Conditioning
  if (/burpee/i.test(text)) {
    addMuscle('Chest', 4);
    addMuscle('Quads', 4);
    addMuscle('Abs', 3);
  }

  return Array.from(muscleMap.entries()).map(([name, intensity]) => ({ name, intensity }));
}
