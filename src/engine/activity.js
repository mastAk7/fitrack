/**
 * Activity, Cardio & Dynamic Maintenance Calories Engine.
 * Calculates energy expenditure using exercise physiology MET standards and distance formulas.
 *
 * TDEE (Maintenance) = BMR + TEF + NEAT (Daily steps) + EAT (Runs/Workouts/Sports).
 * A morning run or high-step day legitimately increases maintenance calories.
 */

export const ACTIVITY_TYPES = [
  { id: 'run', name: 'Running', icon: '🏃', met: 9.8, hasDistance: true, defaultPaceMinPerKm: 6 },
  { id: 'walk', name: 'Walking / Steps', icon: '🚶', met: 3.5, hasDistance: true, defaultPaceMinPerKm: 12 },
  { id: 'cycling', name: 'Cycling', icon: '🚴', met: 7.5, hasDistance: true, defaultPaceMinPerKm: 3 },
  { id: 'volleyball', name: 'Volleyball', icon: '🏐', met: 5.5, hasDistance: false },
  { id: 'sports', name: 'Sports (Football/Hoops)', icon: '⚽', met: 6.5, hasDistance: false },
  { id: 'hiit', name: 'Cardio / HIIT', icon: '🔥', met: 8.0, hasDistance: false },
  { id: 'swimming', name: 'Swimming', icon: '🏊', met: 7.0, hasDistance: true, defaultPaceMinPerKm: 25 },
  { id: 'custom', name: 'Other Activity', icon: '⚡', met: 5.0, hasDistance: false },
];

const DEFAULT_BODY_WEIGHT_KG = 78;

/**
 * Calculates calories burned for an activity based on physics and MET equations.
 *
 * For Running: standard Gross Energy Expenditure = 1.036 kcal / kg / km.
 * For Walking: ~0.75 kcal / kg / km (or ~0.04 kcal per step).
 * For Duration-based: kcal = MET × 3.5 × weight_kg / 200 × duration_min.
 */
export function calculateActivityCalories(typeId, { distance_km, duration_min, steps, weight_kg = DEFAULT_BODY_WEIGHT_KG }) {
  const w = Number(weight_kg) || DEFAULT_BODY_WEIGHT_KG;
  const dist = parseFloat(distance_km) || 0;
  const dur = parseFloat(duration_min) || 0;
  const stp = parseInt(steps, 10) || 0;

  if (typeId === 'run') {
    if (dist > 0) {
      // 1.036 kcal per kg per km is the gold-standard exercise physiology constant for running
      return Math.round(dist * w * 1.036);
    }
    if (dur > 0) {
      return Math.round(9.8 * 3.5 * w / 200 * dur);
    }
  }

  if (typeId === 'walk') {
    if (stp > 0) {
      return Math.round(stp * 0.04); // ~400 kcal per 10k steps
    }
    if (dist > 0) {
      return Math.round(dist * w * 0.73);
    }
    if (dur > 0) {
      return Math.round(3.5 * 3.5 * w / 200 * dur);
    }
  }

  // Lookup MET for other activities
  const type = ACTIVITY_TYPES.find(a => a.id === typeId) || ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1];
  const met = type.met || 5.0;

  if (dur > 0) {
    return Math.round(met * 3.5 * w / 200 * dur);
  }

  if (dist > 0 && type.hasDistance) {
    const estDurationMin = dist * (type.defaultPaceMinPerKm || 6);
    return Math.round(met * 3.5 * w / 200 * estDurationMin);
  }

  return 0;
}

/**
 * Calculates step-based calories for standalone steps not already counted in dedicated runs/walks.
 */
export function calculateStepCalories(steps) {
  const s = parseInt(steps, 10) || 0;
  return Math.round(s * 0.04);
}

/**
 * Retrieves total active calories for a given date from healthMap.
 * Includes both dedicated logged activities and background steps.
 */
export function getDayActiveCalories(healthEntry) {
  if (!healthEntry) return 0;

  let activityCals = 0;
  if (Array.isArray(healthEntry.activities)) {
    activityCals = healthEntry.activities.reduce((sum, act) => sum + (Number(act.calories) || 0), 0);
  }

  // Background steps (avoid double counting if activities already exist, or take max)
  const stepsCals = calculateStepCalories(healthEntry.steps);
  const directActive = Number(healthEntry.active_cals) || 0;

  return Math.max(activityCals + stepsCals, directActive, activityCals);
}

/**
 * Computes Dynamic Maintenance (TDEE) and Adjusted Target for a specific day.
 *
 * Example:
 * Base target = 1950 kcal (Cut with ~350 kcal deficit -> Base Maintenance = 2300 kcal).
 * Morning Run logged = 420 kcal burned.
 * Today's Dynamic Maintenance = 2300 + 420 = 2720 kcal!
 * Today's Adjusted Calorie Budget = 1950 + 420 = 2370 kcal (maintains the exact same 350 kcal deficit without starving!).
 */
export function getDynamicMaintenance(targets, healthEntry) {
  const calTarget = targets?.cal || 2000;
  const goalType = targets?.goalType || 'cut';

  // Estimate baseline sedentary/light maintenance from current target & goal
  let deficitOrSurplus = 0;
  if (goalType === 'cut') deficitOrSurplus = -350;
  else if (goalType === 'bulk') deficitOrSurplus = +250;
  else if (goalType === 'recomp') deficitOrSurplus = -150;

  const baseMaintenance = Math.round(calTarget - deficitOrSurplus);
  // Cap active burn to realistic daily bounds
  const rawActiveBurn = getDayActiveCalories(healthEntry);
  const activeBurn = Math.min(850, rawActiveBurn);

  const dynamicMaintenance = baseMaintenance + activeBurn;

  // For a Cut / Recomp, allocate a controlled portion of active burn (up to +450 kcal max)
  // to ensure you stay in a guaranteed fat-loss deficit without blowing up the calorie budget
  const budgetBoost = goalType === 'cut'
    ? Math.min(450, Math.round(activeBurn * 0.7))
    : Math.min(600, activeBurn);

  const adjustedTarget = calTarget + budgetBoost;

  return {
    baseMaintenance,
    activeBurn,
    dynamicMaintenance,
    adjustedTarget,
  };
}
