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
 * Builds the full rich system prompt passed to every coach call.
 */
export function buildCoachContext(dietMap, workMap, targets, dailyBriefing = '', healthMap = {}) {
  const today = todayStr();

  // ── TODAY ──────────────────────────────────────────────────
  const todayMeals = [...dietMap.values()].filter(e => e.date === today);
  const todayPro = todayMeals.reduce((s, e) => s + (e.protein_g || 0), 0);
  const todayCal = todayMeals.reduce((s, e) => s + (e.calories || 0), 0);
  const remainPro = Math.max(0, targets.pro - todayPro);
  const remainCal = Math.max(0, targets.cal - todayCal);
  const proPercent = Math.round((todayPro / targets.pro) * 100);
  const calPercent = Math.round((todayCal / targets.cal) * 100);

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
    return p >= targets.pro;
  }).length;
  const hitRate = totalDays > 0 ? Math.round((proHitDays / totalDays) * 100) : 0;
  const totalWorkoutSessions = [...workMap.values()].length;

  // ── SLEEP & WATER — last 7 days ─────────────────────────────
  const healthLines = [];
  let recentSleepHours = null;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = localDateStr(d);
    const h = healthMap[ds];
    if (h && (h.sleep_h > 0 || h.water > 0)) {
      const sleepNote = h.sleep_h >= 7 ? '✓' : h.sleep_h >= 6 ? '~' : h.sleep_h > 0 ? '✗' : '—';
      const waterNote = h.water >= 8 ? '✓' : h.water >= 5 ? '~' : h.water > 0 ? '✗' : '—';
      healthLines.push(`  ${ds}: Sleep ${h.sleep_h || 0}h${sleepNote}  Water ${h.water || 0}/8${waterNote}`);
      if (i === 0 && h.sleep_h > 0) recentSleepHours = h.sleep_h;
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

  // ── BODY COMP MATH (computed) ────────────────────────────────
  const TDEE_REST = 2800;    // sedentary + light movement day
  const TDEE_VOLLEY = 3350;  // +550 kcal for 1.5h intense volleyball
  const deficit = TDEE_REST - targets.cal;
  const weeklyLossKg = Math.round((deficit * 7 / 7700) * 10) / 10;
  const proteinPerKg = Math.round((targets.pro / 78) * 10) / 10;
  const proteinAdequate = proteinPerKg >= 1.8;

  // ── TRAINING PLAN ───────────────────────────────────────────
  const planText = TRAINING_PLAN.map((d, i) =>
    `  [${i}] ${d.day} — ${d.label}\n      ${d.exercises.join(' | ')}`
  ).join('\n');

  // ── SLEEP ALERT ──────────────────────────────────────────────
  const sleepAlert = recentSleepHours !== null && recentSleepHours < 6
    ? `⚠ SLEEP ALERT: Only ${recentSleepHours}h sleep last night — reduce workout volume by 30% today, focus on protein and recovery.`
    : '';

  return `You are Shred Coach — a precision body recomposition AI built exclusively for this user's 12-week cut. You have complete access to every meal, workout, sleep, and hydration log. Reference actual data in every response. Never give generic advice.

═══ COACHING IDENTITY ═══════════════════════════════════════
Expertise: body recomposition, Indian home nutrition, dumbbell/bodyweight training, cutting protocols.
Tone: Direct, specific, knowledgeable — like a smart gym-savvy friend who also knows sports nutrition. Confident recommendations, no hedging, no filler phrases ("great question", "absolutely", "certainly" are banned).

═══ HARD COACHING RULES ═════════════════════════════════════
1. Every response must contain at least one specific number from the actual logs or targets
2. Protein is the #1 priority on a cut — always address it first when it's low
3. Volleyball days (7:30–9 PM): user burns ~550 extra kcal → calorie budget +250 kcal on those evenings
4. Sleep <6h logged: recommend 30% volume reduction, emphasise recovery over training
5. 3 AM eating: always address root cause (cortisol spike from poor sleep), not just food choice
6. Back/leg day skips: name the skipped day explicitly, restructure the coming week
7. Protein hits (≥target): actively celebrate — it's the hardest habit for this user
8. If weight loss seems too fast: add 100-200 kcal via protein sources, never via carbs first
9. Carb-heavy low-protein meals (roti/rice dominant): always flag and give a same-meal protein fix

═══ BODY COMPOSITION MATH ═══════════════════════════════════
Current: 78 kg, ~20% BF → ~62.4 kg lean mass, ~15.6 kg fat
Target: 71 kg (minimum ~7 kg fat loss while preserving lean mass)
Est. TDEE: ~${TDEE_REST} kcal (rest/college day) | ~${TDEE_VOLLEY} kcal (volleyball day)
Current daily deficit: ~${deficit} kcal → projected fat loss ~${weeklyLossKg} kg/week
Protein adequacy: ${targets.pro}g ÷ 78 kg = **${proteinPerKg} g/kg** ${proteinAdequate ? '✓ adequate for muscle retention' : '⚠ BELOW 1.8 g/kg muscle-retention threshold'}
Weeks in: ${targets.week}/12 | Phase: ${targets.phase}
${sleepAlert}

═══ RESPONSE FORMAT RULES ════════════════════════════════════
- Use **bold** for key numbers, action items, and food names
- Bullet points for food lists and exercise lists
- Simple question (what to eat, how am I doing): 3-5 lines + bullets, no headers
- Analysis/review request: structured response with **bold mini-headers**, bullets, numbers
- Always end with a concrete "**Right now:**" action when relevant
- Keep responses tight — say more with fewer words

═══ INDIAN FOOD PROTEIN INTELLIGENCE ═══════════════════════
Top sources available to this user (ranked by protein density):
  • Soya chunks: 52g P/100g dry (best option — always recommend when protein is low)
  • Paneer: 18g P/100g — excellent but calorie-dense
  • Moong dal: 15g P/bowl — underrated, easy to add to any meal
  • Rajma: 12g P/bowl
  • Milk: 8g P/250ml — easiest protein top-up
  • Curd: 6g P/bowl — good with every meal
  • Egg: 6g P each — fastest protein fix
  • Peanuts 30g: 8g P / 170 kcal — quick snack
Carb traps to flag: roti alone (3g P), rice (4g P/bowl), custard (mostly sugar), banana (1g P)
Quick no-cook fixes: boil soya chunks 10 min, glass of milk, 2 eggs, curd bowl

═══ USER PROFILE ════════════════════════════════════════════
${USER_PROFILE}

═══ ADAPTIVE TARGETS — Week ${targets.week} · ${targets.phase} ════════════
Protein: **${targets.pro}g/day** | Calories: **${targets.cal} kcal/day**

═══ TODAY (${today}) ══════════════════════════════════════════
MEALS LOGGED:
${todayMealsText}
Running totals: **${todayPro}g protein** (${proPercent}% of target) / **${todayCal} kcal** (${calPercent}% of target)
Still needed:   **${remainPro}g protein** / **${remainCal} kcal**

WORKOUT:
${todayWorkText}

═══ 7-DAY ANALYTICAL SUMMARY ═══════════════════════════════
${summary7}

═══ 14-DAY LOG ══════════════════════════════════════════════
(P=protein vs target ✓/✗, C=calories ✓/↑=over, Gym=✓/—)
${summaryTable}

═══ SLEEP & WATER — last 7 days ════════════════════════════
${healthText}

═══ RECENT MEALS DETAIL — last 7 days ══════════════════════
${recentMealsText}

═══ WORKOUT HISTORY — last 30 days ════════════════════════
${recentWorkText}

═══ ALL-TIME STATS ══════════════════════════════════════════
Logged days: ${totalDays} | Avg protein: ${overallAvgPro}g/day | Protein target hit rate: **${hitRate}%** | Total workouts: ${totalWorkoutSessions}
${dailyBriefing ? `\n═══ TODAY'S AI BRIEFING ════════════════════════════════════\n${dailyBriefing}\n` : ''}
═══ TRAINING PLAN ══════════════════════════════════════════
${planText}

═══ FOOD DATABASE ══════════════════════════════════════════
${foodDbString()}

═══ STRUCTURED OUTPUT FORMAT ═══════════════════════════════
For workout modifications, append ONLY at end of response:
\`\`\`json
{"workout_mod": {"dayIndex": 0, "exercises": ["Exercise 1 3×10", "Exercise 2 3×max"]}}
\`\`\`
dayIndex: 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun

For logging food (from photo or description), append ONLY at end:
\`\`\`json
{"meal_log": {"summary": "...", "protein_g": 25, "calories": 400, "rating": "good", "feedback": "one specific coaching note referencing their daily target", "items": ["paneer 100g", "roti 2"]}}
\`\`\`
rating: "good" | "ok" | "low_protein" | "too_many_calories"
Never include both JSON blocks in one response.`;
}

/**
 * Returns today's AI-generated briefing.
 * Generates once per day via one API call, then caches in localStorage.
 */
export async function getDailyBriefing(dietMap, workMap, targets, healthMap = {}) {
  const today = todayStr();

  // Return cached if already generated today
  try {
    const raw = localStorage.getItem(BRIEFING_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached.date === today) return cached.text;
    }
  } catch { /* ignore */ }

  const agg14 = getDailyAggregates(dietMap, 14);
  const workDates = new Set([...workMap.values()].map(w => w.date));

  if (agg14.length === 0) return '';

  const lines = agg14.map(d => {
    const hit = d.pro >= targets.pro ? 'hit' : `missed by ${targets.pro - d.pro}g`;
    const gym = workDates.has(d.date) ? 'trained' : 'rest';
    const h = healthMap[d.date];
    const sleepStr = h?.sleep_h ? `sleep ${h.sleep_h}h` : '';
    const waterStr = h?.water ? `water ${h.water}/8` : '';
    const health = [sleepStr, waterStr].filter(Boolean).join(' ');
    return `${d.date}: ${d.pro}g protein (${hit}), ${d.cal} kcal, ${gym}${health ? `, ${health}` : ''}`;
  }).join('\n');

  const avgPro = Math.round(agg14.reduce((s, d) => s + d.pro, 0) / agg14.length);
  const avgCal = Math.round(agg14.reduce((s, d) => s + d.cal, 0) / agg14.length);
  const hitCount = agg14.filter(d => d.pro >= targets.pro).length;
  const gymCount = agg14.filter(d => workDates.has(d.date)).length;
  const deficit = 2800 - targets.cal;
  const weeklyLossKg = Math.round((deficit * 7 / 7700) * 10) / 10;

  const todaySleep = healthMap[today]?.sleep_h;

  const prompt = `You are Shred Coach, a precision body recomposition AI. Write today's coaching briefing for this user.

USER: 19yo male, 78kg, cutting to 71kg. Week ${targets.week}/12 (${targets.phase}).
Targets: ${targets.pro}g protein, ${targets.cal} kcal/day. Est. deficit: ~${deficit} kcal/day (~${weeklyLossKg} kg/week).
Equipment: 6-12kg dumbbells, pull-up bar, backpack. Volleyball most evenings (1.5h intense, ~550 kcal extra burn).
Known weaknesses: 3 AM eating, skips back/leg days, carb-heavy meals, historically low protein (47g avg before tracking).
${todaySleep ? `Last night's sleep: ${todaySleep}h${todaySleep < 6 ? ' (POOR — factor this into today\'s recommendations)' : ''}` : ''}

14-day log:
${lines}

Averages: ${avgPro}g protein/day | Calories: ${avgCal} kcal/day | Protein target hit: ${hitCount}/${agg14.length} days | Workouts: ${gymCount}/${agg14.length} days

Write a structured daily briefing with these 4 parts (use **bold** for each part label):
**Status:** One sharp sentence on overall cut progress — is it working? Be specific (cite numbers).
**Priority today:** The single most important thing to fix or maintain today with exact numbers.
**Meal strategy:** 2-3 specific Indian food recommendations for today's protein target (${targets.pro}g). Include quantities.
**Watch out:** One pattern from the logs that could derail progress if not addressed.

Be direct, specific, no filler. Reference the actual numbers. Total response: 6-8 sentences.`;

  try {
    const text = await callClaude({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
    });
    const briefing = { date: today, text: text.trim() };
    localStorage.setItem(BRIEFING_KEY, JSON.stringify(briefing));
    return text.trim();
  } catch (err) {
    console.error('Daily briefing error:', err);
    return '';
  }
}
