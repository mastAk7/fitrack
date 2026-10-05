/**
 * Computes adaptive calorie and protein targets from the full diet log and active goal.
 * Returns { cal, pro, week, phase, goalType }
 */
export function computeTargets(dietMap, goal = null) {
  const entries = [...dietMap.values()];
  const goalType = goal?.goalType || 'cut';

  // Sort all entries by date ascending to calculate week
  let week = 1;
  if (entries.length > 0) {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const firstDate = sorted[0].date;
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const first = new Date(firstDate + 'T12:00:00');
    const now = new Date();
    const weeksElapsed = Math.floor((now - first) / msPerWeek);
    week = Math.max(1, Math.min(12, weeksElapsed + 1));
  }

  // Base calorie and protein baseline by goal type
  let baseCal = 2000;
  let basePro = 135;

  if (goalType === 'bulk') {
    baseCal = 2350 + (week - 1) * 15;
    basePro = 145;
  } else if (goalType === 'recomp') {
    baseCal = 2100;
    basePro = 145 + Math.min(15, week * 2);
  } else if (goalType === 'strength') {
    baseCal = 2250;
    basePro = 140;
  } else {
    // Standard cut
    baseCal = 2000 - (week - 1) * 10; // week 1 = 2000, week 12 = 1890
    basePro = 130 + (week - 1) * 2;
  }

  // Last 14 logged days
  const uniqueDates = [...new Set(entries.map(e => e.date))].sort().slice(-14);
  const last14Entries = entries.filter(e => uniqueDates.includes(e.date));

  // Per-day aggregates
  const dayMap = new Map();
  for (const e of last14Entries) {
    if (!dayMap.has(e.date)) dayMap.set(e.date, { cal: 0, pro: 0 });
    const d = dayMap.get(e.date);
    d.cal += e.calories || 0;
    d.pro += e.protein_g || 0;
  }

  const days = [...dayMap.values()];
  const avgCal = days.length > 0 ? days.reduce((s, d) => s + d.cal, 0) / days.length : baseCal;
  const avgPro = days.length > 0 ? days.reduce((s, d) => s + d.pro, 0) / days.length : 47;

  // Adaptive calorie adjustment (smoothing)
  if (goalType === 'cut' && avgCal > baseCal * 1.1) {
    baseCal = Math.round(baseCal * 0.96);
  }

  // Protein hit rate
  const proteinHitDays = days.filter(d => d.pro >= basePro).length;
  const hitRate = days.length > 0 ? proteinHitDays / days.length : 0;

  if (hitRate < 0.4 && days.length >= 3) {
    basePro = Math.round(avgPro + 15);
  } else if (hitRate > 0.75) {
    basePro = Math.min(160, basePro + 5);
  }

  // Guard rails
  const minCal = goalType === 'bulk' ? 2100 : 1750;
  const maxCal = goalType === 'bulk' ? 2700 : 2200;
  const cal = Math.max(minCal, Math.min(maxCal, baseCal));
  const pro = Math.max(130, Math.min(165, basePro));

  // Phase
  let phase;
  if (week <= 2) phase = 'Ramp Up';
  else if (week <= 6) phase = 'Mid Cut';
  else if (week <= 10) phase = 'Deep Cut';
  else phase = 'Final Push';

  return { cal, pro, week, phase, goalType };
}

/**
 * Returns daily aggregates for last N unique logged dates.
 */
export function getDailyAggregates(dietMap, numDays = 14) {
  const entries = [...dietMap.values()];
  const uniqueDates = [...new Set(entries.map(e => e.date))].sort().slice(-numDays);

  return uniqueDates.map(date => {
    const dayEntries = entries.filter(e => e.date === date);
    const cal = dayEntries.reduce((s, e) => s + (e.calories || 0), 0);
    const pro = dayEntries.reduce((s, e) => s + (e.protein_g || 0), 0);
    return { date, cal, pro, meals: dayEntries.length };
  });
}

/**
 * Computes protein streak: consecutive days from today backward with pro >= minPro
 */
export function getProteinStreak(dietMap, minPro = 130) {
  const entries = [...dietMap.values()];
  const dayMap = new Map();
  for (const e of entries) {
    if (!dayMap.has(e.date)) dayMap.set(e.date, 0);
    dayMap.set(e.date, dayMap.get(e.date) + (e.protein_g || 0));
  }

  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const pro = dayMap.get(dateStr) || 0;
    if (pro >= minPro) streak++;
    else if (i > 0) break; // gap breaks streak (except today not yet logged)
  }
  return streak;
}
