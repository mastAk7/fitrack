/**
 * Calibrated Daily Recomp Evaluation & Gamification Engine.
 * Replaces unweighted averaging with a scientifically calibrated 4-pillar athletic rubric.
 */

export function calculateDailyScore(dayAgg, targets, hasWorkout, health = {}, hadOverload = false) {
  const pro = dayAgg?.pro || 0;
  const cal = dayAgg?.cal || 0;
  const sleep_h = health?.sleep_h || 0;
  const water = health?.water || 0;

  // 1. Protein Score (35 max points)
  let proPoints = 0;
  if (pro >= targets.pro) {
    proPoints = 35;
  } else if (pro >= targets.pro * 0.85) {
    proPoints = 28;
  } else if (pro >= targets.pro * 0.7) {
    proPoints = 20;
  } else if (pro >= 60) {
    proPoints = 12;
  } else if (pro > 0) {
    proPoints = 5;
  }

  // 2. Calorie Deficit Accuracy (25 max points)
  let calPoints = 0;
  if (cal > 0) {
    const diff = cal - targets.cal;
    if (diff <= 50 && diff >= -150) {
      calPoints = 25; // sweet spot
    } else if (diff <= 150 && diff > 50) {
      calPoints = 20; // slight overshoot
    } else if (diff > 150 && diff <= 300) {
      calPoints = 12; // moderate overshoot
    } else if (diff > 300) {
      calPoints = 5; // heavy overshoot
    } else if (diff < -400) {
      calPoints = 14; // too low deficit, risk of muscle catabolism
    } else {
      calPoints = 22;
    }
  }

  // 3. Workout & Progressive Overload (25 max points)
  let workPoints = 0;
  if (hasWorkout) {
    workPoints = 18;
    if (hadOverload) workPoints += 7; // PR bonus
  }

  // 4. Sleep & Recovery (15 max points)
  let recPoints = 0;
  if (sleep_h >= 7) recPoints += 9;
  else if (sleep_h >= 6) recPoints += 6;
  else if (sleep_h > 0) recPoints += 2;

  if (water >= 8) recPoints += 6;
  else if (water >= 5) recPoints += 4;
  else if (water > 0) recPoints += 2;

  const totalScore = Math.min(100, Math.round(proPoints + calPoints + workPoints + recPoints));

  let grade = 'D';
  if (totalScore >= 92) grade = 'S';
  else if (totalScore >= 82) grade = 'A';
  else if (totalScore >= 70) grade = 'B';
  else if (totalScore >= 52) grade = 'C';

  return {
    score: totalScore,
    grade,
    breakdown: {
      protein: { points: proPoints, max: 35 },
      calories: { points: calPoints, max: 25 },
      workout: { points: workPoints, max: 25 },
      recovery: { points: recPoints, max: 15 },
    },
  };
}

/**
 * Calculates Athlete Level & XP from historical data.
 */
export function calculateAthleteProfile(dietMap, workMap, targets, healthMap) {
  const entries = [...dietMap.values()];
  const uniqueDates = [...new Set(entries.map(e => e.date))];
  const workDates = new Set([...workMap.values()].map(w => w.date));

  let totalXP = 0;
  let proteinHits = 0;
  let midnightEatingCount = 0;

  for (const date of uniqueDates) {
    const dayEntries = entries.filter(e => e.date === date);
    const dayPro = dayEntries.reduce((s, e) => s + (e.protein_g || 0), 0);
    const dayCal = dayEntries.reduce((s, e) => s + (e.calories || 0), 0);
    const hasGym = workDates.has(date);
    const h = healthMap[date] || {};

    const dayScore = calculateDailyScore({ pro: dayPro, cal: dayCal }, targets, hasGym, h);
    totalXP += dayScore.score;

    if (dayPro >= targets.pro) proteinHits++;

    // Check for late night meals (1 AM to 4:59 AM)
    for (const m of dayEntries) {
      if (m.time && (m.time.includes('3:') || m.time.includes('2:') || m.time.includes('4:')) && m.time.includes('AM')) {
        midnightEatingCount++;
      }
    }
  }

  const level = Math.max(1, Math.floor(totalXP / 100) + 1);
  const currentLevelProgress = totalXP % 100;

  const ranks = [
    'Rookie Shredder',
    'Rising Athlete',
    'Dedicated Shredder',
    'Iron Recomper',
    'Volume Builder',
    'Disciplined Striker',
    'Elite Recomp Athlete',
    'Spartan Master',
  ];
  const rankIndex = Math.min(ranks.length - 1, Math.floor((level - 1) / 2));
  const rankTitle = ranks[rankIndex];

  // Badges
  const badges = [
    {
      id: 'protein_titan',
      name: 'Protein Titan',
      desc: 'Hit protein target 5+ days',
      icon: '🥩',
      unlocked: proteinHits >= 5,
    },
    {
      id: 'iron_lats',
      name: 'Iron Lats',
      desc: 'Completed 4+ progressive back sessions',
      icon: '🦅',
      unlocked: [...workMap.values()].some(w => (w.exercises || []).some(l => /pull[\s-]?up|row/i.test(l))),
    },
    {
      id: 'midnight_discipline',
      name: 'Midnight Discipline',
      desc: 'Maintained sleep without 3 AM eating',
      icon: '🌙',
      unlocked: midnightEatingCount <= 1 && uniqueDates.length >= 3,
    },
    {
      id: 'volleyball_engine',
      name: 'Volleyball Engine',
      desc: 'Fueling through high-burn athletic evenings',
      icon: '🏐',
      unlocked: true,
    },
  ];

  return {
    totalXP,
    level,
    currentLevelProgress,
    rankTitle,
    badges,
  };
}
