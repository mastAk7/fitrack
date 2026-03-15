import { foodDbString } from '../data/foodDb.js';
import { TRAINING_PLAN } from '../data/trainingPlan.js';
import { getDailyAggregates } from './adaptive.js';
import { callClaude } from './claude.js';

const BRIEFING_KEY = 'sc_daily_briefing';

export const USER_PROFILE = `Age: 19 | Weight: 78 kg | Height: 5'11" (180 cm) | Body fat: ~20%
Goal: Cut to ~71 kg, visible muscle definition, 12 weeks
Equipment: 6/8/10/12 kg dumbbells, door pull-up bar, backpack as weight, chair
Schedule: Free before 8 AM and after 6 PM (engineering college during day)
Cardio: Volleyball 7:30–9 PM most evenings (intense, 1.5 hrs), 2 km park walks
Diet: Indian home-cooked — paneer, dal, soya chunks, sprouts, curd, roti, milk, chaap
Known issues: 3 AM eating, inconsistent sleep, skips back/leg days, early protein avg ~47g/day, carb-heavy meals`;

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr() { return localDateStr(); }

function nDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateStr(d);
}

/**
 * Builds the full rich system prompt passed to every Gemini coach call.
 */
export function buildCoachContext(dietMap, workMap, targets, dailyBriefing = '', healthMap = {}) {
  const today = todayStr();

  // ── TODAY ──────────────────────────────────────────────────
  const todayMeals = [...dietMap.values()].filter(e => e.date === today);
  const todayPro = todayMeals.reduce((s, e) => s + (e.protein_g || 0), 0);
  const todayCal = todayMeals.reduce((s, e) => s + (e.calories || 0), 0);
  const remainPro = Math.max(0, targets.pro - todayPro);
  const remainCal = Math.max(0, targets.cal - todayCal);

  const todayMealsText = todayMeals.length > 0
    ? todayMeals.map(e =>
        `  ${e.time}: ${e.summary} → ${e.protein_g}g P / ${e.calories} kcal [${e.rating}]`
      ).join('\n')
    : '  Nothing logged yet.';

  const todayWorkouts = [...workMap.values()].filter(w => w.date === today);
  const todayWorkText = todayWorkouts.length > 0
    ? todayWorkouts.map(w =>
        `  ${w.dayLabel} — ${w.completed}/${w.total} exercises done${w.notes ? `. Notes: ${w.notes}` : ''}`
      ).join('\n')
    : '  No workout logged yet.';

  // ── 14-DAY SUMMARY TABLE ────────────────────────────────────
  const agg14 = getDailyAggregates(dietMap, 14);
  const workDates = new Set([...workMap.values()].map(w => w.date));

  const summaryTable = agg14.length > 0
    ? agg14.map(d => {
        const hitP = d.pro >= targets.pro ? '✓' : '✗';
        const hitC = d.cal <= targets.cal * 1.1 ? '✓' : '↑';
        const gym  = workDates.has(d.date) ? '✓' : '—';
        return `  ${d.date}  P:${String(d.pro).padStart(3)}g${hitP}  Cal:${String(d.cal).padStart(4)}${hitC}  Gym:${gym}  (${d.meals} meals)`;
      }).join('\n')
    : '  No data yet.';

  // ── DETAILED MEALS — last 7 days ────────────────────────────
  const last7 = nDaysAgo(7);
  const recentMeals = [...dietMap.values()]
    .filter(e => e.date >= last7 && e.date < today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const recentMealsText = recentMeals.length > 0
    ? recentMeals.map(e =>
        `  [${e.date} ${e.time}] ${e.summary} (${e.protein_g}g P / ${e.calories} kcal)`
      ).join('\n')
    : '  None.';

  // ── WORKOUT HISTORY — last 30 days ──────────────────────────
  const last30 = nDaysAgo(30);
  const recentWork = [...workMap.values()]
    .filter(w => w.date >= last30)
    .sort((a, b) => a.date.localeCompare(b.date));
  const recentWorkText = recentWork.length > 0
    ? recentWork.map(w =>
        `  [${w.date}] ${w.dayLabel} — ${w.completed}/${w.total}${w.notes ? ` | ${w.notes}` : ''}`
      ).join('\n')
    : '  None.';

  // ── ALL-TIME STATS ──────────────────────────────────────────
  const allMeals = [...dietMap.values()];
  const allDays = [...new Set(allMeals.map(e => e.date))];
  const totalDays = allDays.length;
  const overallAvgPro = totalDays > 0
    ? Math.round(allMeals.reduce((s, e) => s + (e.protein_g || 0), 0) / totalDays)
    : 0;
  const proHitDays = allDays.filter(date => {
    const p = allMeals.filter(e => e.date === date).reduce((s, e) => s + (e.protein_g || 0), 0);
    return p >= 130;
  }).length;
  const hitRate = totalDays > 0 ? Math.round((proHitDays / totalDays) * 100) : 0;
  const totalWorkoutSessions = [...workMap.values()].length;

  // ── SLEEP & WATER — last 7 days ─────────────────────────────
  const healthLines = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = localDateStr(d);
    const h = healthMap[ds];
    if (h && (h.sleep_h > 0 || h.water > 0)) {
      const sleepNote = h.sleep_h >= 7 ? '✓' : h.sleep_h >= 6 ? '~' : h.sleep_h > 0 ? '✗' : '—';
      const waterNote = h.water >= 8 ? '✓' : h.water >= 5 ? '~' : h.water > 0 ? '✗' : '—';
      healthLines.push(`  ${ds}: Sleep ${h.sleep_h || 0}h${sleepNote}  Water ${h.water || 0}/8${waterNote}`);
    }
  }
  const healthText = healthLines.length > 0 ? healthLines.join('\n') : '  No sleep/water data logged.';

  // ── 7-DAY ANALYTICAL SUMMARY ─────────────────────────────────
  const last7days = agg14.slice(-7);
  const avgPro7 = last7days.length > 0 ? Math.round(last7days.reduce((s, d) => s + d.pro, 0) / last7days.length) : 0;
  const avgCal7 = last7days.length > 0 ? Math.round(last7days.reduce((s, d) => s + d.cal, 0) / last7days.length) : 0;
  const proHit7 = last7days.filter(d => d.pro >= targets.pro).length;
  const workouts7 = last7days.filter(d => workDates.has(d.date)).length;
  const avgSleep7 = (() => {
    const vals = last7days.map(d => healthMap[d.date]?.sleep_h || 0).filter(v => v > 0);
    return vals.length > 0 ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null;
  })();
  const avgWater7 = (() => {
    const vals = last7days.map(d => healthMap[d.date]?.water || 0).filter(v => v > 0);
    return vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  })();
  const trend = last7days.length >= 4
    ? (() => {
        const firstHalf = last7days.slice(0, Math.floor(last7days.length / 2));
        const secondHalf = last7days.slice(Math.floor(last7days.length / 2));
        const avg1 = firstHalf.reduce((s, d) => s + d.pro, 0) / firstHalf.length;
        const avg2 = secondHalf.reduce((s, d) => s + d.pro, 0) / secondHalf.length;
        return avg2 > avg1 + 5 ? 'improving' : avg2 < avg1 - 5 ? 'declining' : 'steady';
      })()
    : 'insufficient data';

  const summary7 = [
    `  Avg protein: ${avgPro7}g/day (target ${targets.pro}g) — hit ${proHit7}/${last7days.length} days — trend: ${trend}`,
    `  Avg calories: ${avgCal7} kcal/day (target ${targets.cal})`,
    `  Workouts: ${workouts7}/${last7days.length} days`,
    avgSleep7 !== null ? `  Avg sleep: ${avgSleep7}h/night` : null,
    avgWater7 !== null ? `  Avg water: ${avgWater7} glasses/day` : null,
  ].filter(Boolean).join('\n');

  // ── TRAINING PLAN ───────────────────────────────────────────
  const planText = TRAINING_PLAN.map((d, i) =>
    `  [${i}] ${d.day} — ${d.label}\n      ${d.exercises.join(' | ')}`
  ).join('\n');

  return `You are a direct, no-nonsense personal fitness coach. Be blunt, specific, actionable. 2–4 sentences max unless detailed breakdown is asked.

═══ USER PROFILE ════════════════════════════════════════════
${USER_PROFILE}

═══ ADAPTIVE TARGETS — Week ${targets.week} · ${targets.phase} ════════════
Protein: ${targets.pro}g/day | Calories: ${targets.cal} kcal/day

═══ TODAY (${today}) ══════════════════════════════════════════
MEALS LOGGED:
${todayMealsText}
Running totals: ${todayPro}g protein / ${todayCal} kcal
Still needed:   ${remainPro}g protein / ${remainCal} kcal

WORKOUT:
${todayWorkText}

═══ 7-DAY ANALYTICAL SUMMARY ═══════════════════════════════════
${summary7}

═══ 14-DAY LOG (P=protein vs target, C=calories vs target) ════
${summaryTable}

═══ SLEEP & WATER — last 7 days ═══════════════════════════════
${healthText}

═══ RECENT MEALS DETAIL — last 7 days ══════════════════════════
${recentMealsText}

═══ WORKOUT HISTORY — last 30 days ════════════════════════════
${recentWorkText}

═══ ALL-TIME STATS ═════════════════════════════════════════════
Logged days: ${totalDays} | Avg protein: ${overallAvgPro}g/day | Protein target hit rate: ${hitRate}% | Total workouts: ${totalWorkoutSessions}
${dailyBriefing ? `\n═══ DAILY COACH BRIEFING (AI analysis, generated today) ════════\n${dailyBriefing}\n` : ''}
═══ TRAINING PLAN ══════════════════════════════════════════════
${planText}

═══ INDIAN FOOD DATABASE ═══════════════════════════════════════
${foodDbString()}

═══ RESPONSE FORMAT RULES ══════════════════════════════════════
For workout modifications, append at end of response:
\`\`\`json
{"workout_mod": {"dayIndex": 0, "exercises": ["Exercise 1 3×10", "Exercise 2 3×max"]}}
\`\`\`
dayIndex: 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun

For logging food (from photo or description), append at end:
\`\`\`json
{"meal_log": {"summary": "...", "protein_g": 25, "calories": 400, "rating": "good", "feedback": "...", "items": ["paneer 100g", "roti"]}}
\`\`\`
rating options: "good" | "ok" | "low_protein" | "too_many_calories"

Never include both JSON blocks in the same response.`;
}

/**
 * Returns today's AI-generated briefing text.
 * Generates via Gemini once per day (1 request), then caches in localStorage.
 * Returns '' if generation fails.
 */
export async function getDailyBriefing(dietMap, workMap, targets) {
  const today = todayStr();

  // Return cached if already generated today
  try {
    const raw = localStorage.getItem(BRIEFING_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached.date === today) return cached.text;
    }
  } catch { /* ignore */ }

  // Build a focused analysis prompt (not the full context — saves tokens)
  const agg14 = getDailyAggregates(dietMap, 14);
  const workDates = new Set([...workMap.values()].map(w => w.date));
  const allMeals = [...dietMap.values()];

  const lines = agg14.map(d => {
    const hit = d.pro >= targets.pro ? 'hit' : 'missed';
    const gym = workDates.has(d.date) ? 'trained' : 'rest';
    return `${d.date}: ${d.pro}g protein (${hit}), ${d.cal} kcal, ${gym}`;
  }).join('\n');

  const avgPro = agg14.length > 0
    ? Math.round(agg14.reduce((s, d) => s + d.pro, 0) / agg14.length)
    : 0;
  const hitCount = agg14.filter(d => d.pro >= targets.pro).length;
  const gymCount = agg14.filter(d => workDates.has(d.date)).length;

  if (agg14.length === 0) return ''; // no data yet, skip

  const prompt = `You are a blunt fitness coach. Analyze 14-day data and write a 3-sentence daily briefing.

User: 19yo, 78kg, cutting to 71kg. Targets: ${targets.pro}g protein, ${targets.cal} kcal/day. Week ${targets.week} (${targets.phase}).

Last 14 days:
${lines}

Averages: ${avgPro}g protein/day | Protein target hit: ${hitCount}/${agg14.length} days | Workouts: ${gymCount}/${agg14.length} days

Write exactly 3 sentences: (1) overall trend verdict, (2) biggest weakness to fix today, (3) one specific action for today. Be direct, no fluff.`;

  try {
    const text = await callClaude({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 180,
    });
    const briefing = { date: today, text: text.trim() };
    localStorage.setItem(BRIEFING_KEY, JSON.stringify(briefing));
    return text.trim();
  } catch (err) {
    console.error('Daily briefing error:', err);
    return '';
  }
}
