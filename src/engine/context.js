import { getDailyAggregates } from './adaptive.js';
import { callClaude } from './claude.js';
import { DEFAULT_GOAL } from './storage.js';

const BRIEFING_KEY = 'sc_daily_briefing';

export const USER_PROFILE = `Age: 19 | Weight: 78 kg | Height: 5'11" (180 cm) | Body fat: ~20%
Equipment: 6/8/10/12 kg dumbbells, door pull-up bar, backpack as weight, chair
Schedule: Free before 8 AM and after 6 PM (engineering college during day)
Cardio: Volleyball 7:30–9 PM most evenings (intense, 1.5 hrs), 2 km park walks
Diet: Indian home-cooked — paneer, dal, soya chunks, sprouts, curd, roti, milk, chaap
Known issues: 3 AM eating, inconsistent sleep, skips back/leg days, carb-heavy meals`;

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr() { return localDateStr(); }

/**
 * Builds a compressed, highly targeted system prompt injected into Coach calls.
 * Compresses historical logs into statistical vectors to conserve API tokens.
 */
export function buildCoachContext(dietMap, workMap, targets, dailyBriefing = '', healthMap = {}, goal = DEFAULT_GOAL) {
  const today = todayStr();
  const activeGoal = goal || DEFAULT_GOAL;

  // ── TODAY'S RUNWAY ──────────────────────────────────────────
  const todayMeals = [...dietMap.values()].filter(e => e.date === today);
  const todayPro = Math.round(todayMeals.reduce((s, e) => s + (e.protein_g || 0), 0) * 10) / 10;
  const todayCal = Math.round(todayMeals.reduce((s, e) => s + (e.calories || 0), 0));
  const remainPro = Math.max(0, Math.round((targets.pro - todayPro) * 10) / 10);
  const remainCal = Math.max(0, Math.round(targets.cal - todayCal));
  const proPercent = Math.round((todayPro / targets.pro) * 100);
  const calPercent = Math.round((todayCal / targets.cal) * 100);

  const todayMealsText = todayMeals.length > 0
    ? todayMeals.map(e => `• ${e.time}: ${e.summary} (${e.protein_g}g P / ${e.calories} kcal) [${e.rating}]`).join('\n')
    : '• No meals logged yet today.';

  const todayWorkouts = [...workMap.values()].filter(w => w.date === today);
  const todayWorkText = todayWorkouts.length > 0
    ? todayWorkouts.map(w => `• ${w.dayLabel}: ${w.completed} exercises completed${w.notes ? ` (${w.notes})` : ''}`).join('\n')
    : '• No workout logged yet.';

  // ── 14-DAY STATISTICAL SUMMARY (Compressed) ─────────────────
  const agg14 = getDailyAggregates(dietMap, 14);
  const workDates = new Set([...workMap.values()].map(w => w.date));
  const avgPro14 = agg14.length > 0 ? Math.round(agg14.reduce((s, d) => s + d.pro, 0) / agg14.length) : 0;
  const avgCal14 = agg14.length > 0 ? Math.round(agg14.reduce((s, d) => s + d.cal, 0) / agg14.length) : 0;
  const proHits14 = agg14.filter(d => d.pro >= targets.pro).length;
  const gymDays14 = agg14.filter(d => workDates.has(d.date)).length;

  // ── RECENT WORKOUTS (Last 3 sessions only) ───────────────────
  const recentWorkouts = [...workMap.values()]
    .sort((a, b) => b.id - a.id)
    .slice(0, 3)
    .map(w => `• [${w.date}] ${w.dayLabel}: ${(w.exercises || []).slice(0, 4).join(', ')}`)
    .join('\n') || '• No recent sessions.';

  // ── RECENT SLEEP & RECOVERY ─────────────────────────────────
  const todayHealth = healthMap[today] || {};
  const recentSleep = todayHealth.sleep_h || 0;
  const recentWater = todayHealth.water || 0;

  const sleepAlert = recentSleep > 0 && recentSleep < 6
    ? `⚠ LOW SLEEP (${recentSleep}h): Reduce workout volume by 25%, avoid failure sets, prioritize hydration and recovery.`
    : '';

  return `You are Shred Coach — a high-precision, hyper-adaptive AI body recomposition coach.
Reference actual logged data in every answer. Be direct, punchy, and confident. Never use filler phrases.

═══ PRIMARY USER GOAL ═════════════════════════════════════════
Goal: "${activeGoal.text}"
Mode: ${activeGoal.goalType?.toUpperCase() || 'CUT'} | Target Weight: ${activeGoal.targetWeight_kg || 71}kg (Current: ${activeGoal.startWeight_kg || 78}kg)
Pace: ${activeGoal.weeklyPace_kg || 0.5}kg/week | Target Protein Floor: 1.8g/kg (~${targets.pro}g)

═══ TODAY'S REAL-TIME RUNWAY (${today}) ══════════════════════
Consumed: ${todayPro}g P (${proPercent}%) / ${todayCal} kcal (${calPercent}%)
Remaining to hit target: **${remainPro}g Protein** / **${remainCal} kcal**
Logged Meals:
${todayMealsText}
Workout Status:
${todayWorkText}
${sleepAlert}

═══ ROLLING 14-DAY METRICS ════════════════════════════════════
14-day Avg: **${avgPro14}g Protein/day** (Target ${targets.pro}g) · Hit rate: **${proHits14}/${agg14.length} days**
14-day Avg Calories: **${avgCal14} kcal/day** (Target ${targets.cal} kcal) · Training sessions: **${gymDays14} days**
Recent Sessions:
${recentWorkouts}

═══ ATHLETE PROFILE & CONSTRAINTS ═════════════════════════════
${USER_PROFILE}
Volleyball: 7:30–9 PM most evenings (~550 kcal burn). Grant +200-250 kcal budget on volleyball evenings.

═══ ACTION RULES ══════════════════════════════════════════════
1. Always state specific numbers from their runway (remaining protein and calories).
2. If remaining calories are low (<400 kcal) and protein is needed, advise pure lean sources (soya chunks, egg whites, low-fat curd).
3. For workout recommendations, always encourage progressive overload (+1 rep or +weight) based on past sessions.
4. Bold food names, exercise names, and key numbers.

═══ STRUCTURED ACTIONS ═════════════════════════════════════════
To modify a workout plan, append at the very end:
\`\`\`json
{"workout_mod": {"dayIndex": 0, "exercises": ["Exercise 1 3×10", "Exercise 2 3×max"]}}
\`\`\`
(dayIndex: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun)

To log a suggested meal directly, append at the very end:
\`\`\`json
{"meal_log": {"summary": "dish name with quantity", "protein_g": 35, "calories": 420, "rating": "good", "feedback": "note", "items": ["soya chunks 60g", "curd 1 bowl"]}}
\`\`\`
Do not include both JSON blocks in one response.`;
}

/**
 * Returns today's AI-generated briefing cached in localStorage.
 */
export async function getDailyBriefing(dietMap, workMap, targets, healthMap = {}) {
  const today = todayStr();
  try {
    const raw = localStorage.getItem(BRIEFING_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached.date === today) return cached.text;
    }
  } catch { /* ignore */ }

  const agg14 = getDailyAggregates(dietMap, 14);
  if (agg14.length === 0) return '';

  const avgPro = Math.round(agg14.reduce((s, d) => s + d.pro, 0) / agg14.length);
  const avgCal = Math.round(agg14.reduce((s, d) => s + d.cal, 0) / agg14.length);

  const prompt = `Give a concise 3-line daily athletic briefing for a 19yo male cutting at ${targets.cal} kcal and ${targets.pro}g protein.
14-day avg: ${avgPro}g protein, ${avgCal} kcal.
Format:
• Status: [1 sentence]
• Priority today: [1 actionable nutrition/workout step]
• Watch out: [1 warning on sleep or late-night eating]`;

  try {
    const text = await callClaude({ max_tokens: 300, messages: [{ role: 'user', content: prompt }] });
    if (text) {
      localStorage.setItem(BRIEFING_KEY, JSON.stringify({ date: today, text }));
      return text;
    }
  } catch {
    // fallback
  }
  return '';
}
