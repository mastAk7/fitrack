# Shred Coach

Personal adaptive fitness and nutrition tracker built with React + Vite. Single-user app for a 12-week body recomposition cut with AI coaching powered by Claude.

---

## Quick Start

```bash
npm install
```

Create `.env` in root:

```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

```bash
npm run dev
```

Open `http://localhost:5173`

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS (dark theme) |
| Charts | Recharts |
| Storage | localStorage (JSON) |
| AI | Anthropic Claude Sonnet 4 API (`claude-sonnet-4-20250514`) |
| Image handling | Native `<input type="file" accept="image/*" capture>` + base64 encoding for Claude Vision |
| Deployment | Vercel / Netlify / any static host |

---

## Project Structure

```
shred-coach/
├── public/
├── src/
│   ├── main.jsx                  # Entry point
│   ├── App.jsx                   # Root component, tab routing, data loading
│   ├── components/
│   │   ├── Header.jsx            # App header with phase badge
│   │   ├── TabBar.jsx            # Sticky 4-tab navigation
│   │   ├── DietTab.jsx           # Meal logging tab
│   │   ├── WorkoutTab.jsx        # Workout plan + logging tab
│   │   ├── AnalyticsTab.jsx      # Charts and stats dashboard
│   │   ├── CoachTab.jsx          # AI chat interface
│   │   ├── MealCard.jsx          # Individual meal entry card
│   │   ├── ExerciseRow.jsx       # Checkable exercise row
│   │   ├── TargetBar.jsx         # Progress bar with label
│   │   ├── StatCard.jsx          # Analytics stat card
│   │   ├── ImageUpload.jsx       # Reusable camera/gallery image picker
│   │   └── ChatBubble.jsx        # Chat message bubble
│   ├── engine/
│   │   ├── adaptive.js           # Adaptive targets computation
│   │   ├── analyzer.js           # Meal text + image analysis
│   │   ├── storage.js            # localStorage helpers with migration
│   │   └── claude.js             # Anthropic API client
│   ├── data/
│   │   ├── foodDb.js             # Indian food macro database
│   │   ├── trainingPlan.js       # 6-day workout split
│   │   └── seeds.js              # Day 1–3 pre-seeded data
│   └── styles/
│       └── index.css             # Tailwind directives + custom styles
├── .env                          # VITE_ANTHROPIC_API_KEY
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

---

## Core Architecture

### Storage (`src/engine/storage.js`)

All data lives in `localStorage` under two keys:

| Key | Type | Description |
|---|---|---|
| `sc_diet3` | `MealEntry[]` | All meal log entries |
| `sc_work3` | `WorkoutEntry[]` | All workout log entries |

**Migration on load:** Scan legacy keys `sc_diet`, `sc_diet2`, `sc_diet3`, `sc_work`, `sc_work2`, `sc_work3`. Merge all entries by `id` into a single array, deduplicate, persist to `sc_diet3` / `sc_work3`. Seed data (Days 1–3) injected by fixed IDs if not already present.

**Helper functions:**

```js
loadDiet()    → Map<id, MealEntry>
saveDiet(map) → void
loadWork()    → Map<id, WorkoutEntry>
saveWork(map) → void
```

Use `Map` objects internally keyed by `id` for O(1) lookups. Convert to/from arrays for JSON serialization.

### Data Schemas

```ts
interface MealEntry {
  id: number;           // Date.now() — unique
  date: string;         // "YYYY-MM-DD"
  time: string;         // "08:30 PM"
  summary: string;      // natural language description
  protein_g: number;
  calories: number;
  rating: "good" | "ok" | "low_protein" | "too_many_calories";
  feedback: string;     // one-line AI feedback
  items: string[];      // matched food DB keys
  imageData?: string;   // base64 data URI if photo-logged
}

interface WorkoutEntry {
  id: number;
  date: string;         // "YYYY-MM-DD"
  dayLabel: string;     // e.g. "Push A (Mon, 10 Mar)"
  exercises: string[];  // what was actually done
  completed: number;
  total: number;
  notes: string;
}
```

---

## Adaptive Targets Engine (`src/engine/adaptive.js`)

The engine recalculates daily calorie and protein targets on every app load from the full diet log.

```js
computeTargets(dietMap: Map) → { cal: number, pro: number, week: number, phase: string }
```

### Algorithm

1. **Week number:** Weeks elapsed since first logged meal date, capped at 12.
2. **Base calorie taper:** `baseCal = 2000 - (week × 10)` → range 1990 to 1880 over 12 weeks.
3. **Adaptive adjustments** using the last 14 logged days:
   - If avg calories > 110% of base → tighten by 5% (`× 0.95`)
   - If protein hit rate < 40% (days ≥ 130g) → set protein target to `avg + 20g`
   - If protein hit rate > 70% → bump protein target by 5g (max 160g)
4. **Guard rails:** Calories clamped to 1750–2100. Protein clamped to 130–165g.
5. **Phase labels:**

| Weeks | Phase | Behavior |
|---|---|---|
| 1–2 | Ramp Up | Lenient targets, focus on logging habit |
| 3–6 | Mid Cut | Targets tighten, protein adherence critical |
| 7–10 | Deep Cut | Aggressive calorie reduction |
| 11–12 | Final Push | Lowest calories, max protein emphasis |

---

## Indian Food Database (`src/data/foodDb.js`)

Used by both the meal analyzer (pattern matching) and the AI coach (context injection).

```js
export const FOOD_DB = {
  "paneer 100g":        { p: 18, c: 260 },
  "sprouts 1 cup":      { p: 13, c: 120 },
  "soya chunks 100g":   { p: 52, c: 345 },
  "moong dal 1 bowl":   { p: 15, c: 250 },
  "rajma 1 bowl":       { p: 12, c: 220 },
  "milk 250ml":         { p: 8,  c: 150 },
  "curd 1 bowl":        { p: 6,  c: 100 },
  "egg":                { p: 6,  c: 70  },
  "roti":               { p: 3,  c: 100 },
  "banana":             { p: 1,  c: 90  },
  "peanuts 30g":        { p: 8,  c: 170 },
  "rice 1 bowl":        { p: 4,  c: 200 },
  "chaap medium":       { p: 12, c: 200 },
  "coffee":             { p: 1,  c: 15  },
  "almonds 10":         { p: 3,  c: 70  },
  "custard 1 bowl":     { p: 4,  c: 180 },
  "gobhi sabzi 1 bowl": { p: 4,  c: 120 },
  "salad 1 bowl":       { p: 2,  c: 40  },
  "carrot pea sabzi":   { p: 4,  c: 110 },
};
```

Extend as needed. The meal analyzer uses regex patterns to match items from user input.

---

## Training Plan (`src/data/trainingPlan.js`)

6-day push/pull/legs split designed for home equipment (6–12kg dumbbells, door pull-up bar, backpack as weight, chair).

| Day | Focus | Key Exercises |
|---|---|---|
| Mon | Push (Chest/Shoulders/Tri) | Diamond PU 3×max, Backpack PU 3×10, Incline PU 3×15, Pike PU 3×8, Chair Dips 3×12, DB Shoulder Press 3×10 |
| Tue | Pull (Back/Biceps) | Pull-ups 5×max (door), DB Rows 4×12 each, DB Flies 3×12 each, Bicep Curls drop 12→6kg ×7, Hammer Curls 3×10 |
| Wed | Legs + Core | Backpack Squats 4×15, Walking Lunges 3×12/leg, Glute Bridges 3×20, Calf Raises 4×25, Plank 3×60s, Mountain Climbers 3×30, Leg Raises 3×15 |
| Thu | Push B (Volume) | Backpack PU 3×max, Wide PU 3×15, Knuckle PU 3×12, OHP w/ Backpack 3×10, Lateral Raises 3×12 |
| Fri | Pull B + Forearms | Pull-ups 5×max (door), CG Pull-ups 3×max, DB Rows Heavy 4×10, Concentration Curls 3×10, Wrist Curls + Reverse Wrist Curls |
| Sat | HIIT Circuits | 4 circuits with 45s rest: Burpees, Backpack Squats, Push-ups, Mountain Climbers, DB Rows, Jump Squats |
| Sun | Active Rest | 30–60 min park walk |

**The training plan is mutable.** The AI coach can modify individual days or the entire split. When modified:
- Store the modified plan in localStorage key `sc_plan_mods` as `{ [dayIndex]: string[] }`
- Show a "Modified" badge on the workout tab
- Provide a "Reset to original" button per day
- The original plan in `trainingPlan.js` is never edited — mods are an overlay

---

## Module Specifications

### Tab 1 — Diet Log (`DietTab.jsx`)

**Purpose:** Log every meal via text or photo. Analyzer estimates macros from Indian food DB.

**Features:**

1. **Date selector** — "Today" and "Yesterday" quick buttons + native date picker. All logs are attributed to the selected date. Users can log meals for any past date.

2. **Text logging** — Free-text input. User types what they ate ("2 rotis, big bowl moong dal, medium curd"). The `analyzer.js` module matches food patterns, sums macros, and returns:
   - `summary`, `protein_g`, `calories`, `rating`, `feedback`, `items[]`
   - If no patterns match, send the text to Claude API for estimation (fallback)

3. **Photo logging** — Camera/gallery upload button. When an image is selected:
   - Convert to base64 data URI
   - Send to Claude Vision API alongside any text context the user typed
   - Claude identifies the Indian food items and estimates macros
   - Return the same structured output as text logging
   - Store `imageData` (base64 thumbnail, max 200KB — resize before storing) in the `MealEntry` for display
   - Display a small thumbnail on the meal card

   **Image upload component (`ImageUpload.jsx`):**
   ```jsx
   // Reusable. Props: onImage(base64, file), label, accept="image/*"
   // Should support both camera capture and gallery pick on mobile
   // Compress/resize to max 1024px wide before base64 encoding
   // Show a small preview after selection
   ```

4. **Per-meal cards** — Each card shows: thumbnail (if photo), summary, time, protein (green), calories (amber), rating pill, one-line feedback, delete button.

5. **Daily summary bar** — Running protein progress bar (X/{adaptive_target}g) and calorie counter. Color-coded: green 85–110% of target, amber below 85%, red above 110%.

6. **History** — Scrollable list of all dates with logged meals, showing per-day protein, calories, meal count. Tapping switches the date context.

**Rating logic:**

| Rating | Condition |
|---|---|
| `good` | protein ≥ 15g AND calories ≤ 45% of daily target |
| `ok` | protein 10–15g or doesn't trigger other ratings |
| `low_protein` | protein < 10g |
| `too_many_calories` | calories > 45% of daily calorie target |

---

### Tab 2 — Workout Log (`WorkoutTab.jsx`)

**Purpose:** Display 6-day training split, check off exercises, log completed workouts.

**Features:**

1. **Day selector** — 7 buttons (Mon–Sun). Auto-selects current day. Shows base plan OR modified plan (if coach modified it).

2. **Exercise check-off** — Each exercise is a tappable row with checkbox. Progress bar shows X/Total. Checked state is local to the session until saved.

3. **Notes + save** — Text area for free-form notes. "Save Workout" creates a `WorkoutEntry`. Uses the selected date (not just today — user can log past workouts).

4. **Date selector for past logging** — Same Today/Yesterday + date picker pattern as Diet tab. When a past date is selected, the day selector auto-jumps to that date's day of week.

5. **AI modification flow:**
   - In the Coach tab, user asks to modify a workout
   - Coach responds with explanation + a structured JSON block containing the modified exercise list
   - App parses this and shows a purple "Apply to [Day]" card in the chat
   - Applying writes to `sc_plan_mods` in localStorage
   - Workout tab shows "Modified" pill + "Reset" button for that day

6. **Previous logs** — All saved workout entries for the selected date shown below the plan.

---

### Tab 3 — Analytics (`AnalyticsTab.jsx`)

**Purpose:** Derived data visualization. Everything computed from diet and workout logs. No manual inputs.

**Components:**

1. **Adaptive targets card** — Shows current week, phase, protein target, calorie target. Subtitle: "Targets adapt weekly based on your logged progress."

2. **4 stat cards** (2×2 grid):
   - Avg protein/day (last 14 logged days) — green if ≥130g
   - Avg calories/day (last 14 logged days) — amber if ≤110% target
   - Protein hit rate (days ≥130g / total logged days) — always green
   - Workout sessions (last 14 days) — always purple

3. **Protein trend chart** (Recharts `LineChart`):
   - X-axis: last 14 logged dates
   - Y-axis: protein (g)
   - Dots: green (≥ adaptive target) or purple (below)
   - Dashed reference line at adaptive protein target

4. **Calorie bar chart** (Recharts `BarChart`):
   - X-axis: last 14 logged dates
   - Bars: amber default, red if >108% of adaptive target
   - Dashed reference line at adaptive calorie target

5. **Workout heatmap** — 7×4 grid (last 28 days). Purple = workout logged, dim = no workout.

6. **Meal quality breakdown** — Horizontal bars showing % of meals per rating (good/ok/low_protein/too_many_calories) across all time.

7. **Streaks** — Current protein streak (consecutive days ≥130g counting backward) and workout sessions in last 14 days.

---

### Tab 4 — AI Coach (`CoachTab.jsx`)

**Purpose:** Conversational coach with full context of all logged data and training plan. Supports text and image input.

**Features:**

1. **Context injection** — Every API call includes a system prompt with:
   - Full user profile (19, 78kg, 5'11", equipment list, schedule, known issues)
   - Today's logged meals with running protein/calorie totals
   - Today's workout plan + completion status
   - Current adaptive targets (week, phase, protein target, calorie target)
   - Full Indian food reference database
   - Known behavioral issues from logs (3AM eating, skipping legs, low protein)
   - Instructions: be direct, 2–4 sentences, blunt coaching style

2. **Image input** — User can attach a photo alongside their message. Use cases:
   - **Physique check:** User sends a body photo asking "how's my progress?" or "what should I focus on?"
   - **Food identification:** User sends a food photo asking "log this" or "how much protein is this?"
   - **Workout form:** User sends a video frame asking about form
   
   When an image is attached, send it as a base64 `image` content block to Claude Vision alongside the text message and system context. For food photos, the coach should return structured macro estimates that can be auto-logged (render a "Log this meal" button on the response).

3. **Workout modification flow:**
   - When the user asks to modify a workout, the coach responds in normal text AND includes a fenced JSON block:
     ```json
     {"workout_mod": {"dayIndex": 0, "exercises": ["Exercise 1", "Exercise 2"]}}
     ```
   - The app parses this from the response and renders a purple "Apply to Monday" card
   - Clicking applies the modification to `sc_plan_mods`
   - A "Dismiss" button ignores it

4. **Diet plan advice** — When user asks what to eat, coach checks today's running totals and recommends from the Indian food DB, giving specific portions to hit remaining targets.

5. **Quick prompt chips:**
   - "What to eat right now?"
   - "Am I on track?"
   - "Shorten today's workout"
   - "I'm tired today"
   - "3 AM hunger 😅"
   - "Progress review"

6. **Chat history** — Maintained in React state for the session. Not persisted to localStorage. Fresh chat each session.

**API call structure:**

```js
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: buildCoachContext(), // dynamic system prompt
    messages: conversationHistory,
  }),
});
```

For image messages, use the multi-part content format:

```js
{
  role: "user",
  content: [
    {
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: base64WithoutPrefix }
    },
    { type: "text", text: userMessage }
  ]
}
```

**CORS note:** Direct browser → Anthropic API calls require `anthropic-dangerous-direct-browser-access: true` header. For production, set up a thin proxy server or use Vercel/Netlify serverless functions to keep the API key server-side.

---

## Pre-Seeded Data (`src/data/seeds.js`)

Real user data from Days 1–3 (March 10–12, 2025). Injected on load using fixed IDs to prevent duplicates.

### Diet Seeds (IDs 1001–1011)

**Day 1 — March 10** (31g protein, 1030 kcal):
- 6:00 PM — 3 bananas + 2 Bru black coffee (4g P / 300 kcal) `low_protein`
- 9:00 PM — Paneer sabzi (capsicum, onion, tomato) + 2 roti (24g P / 460 kcal) `good`
- 3:00 AM — 3 bananas (3g P / 270 kcal) `too_many_calories`

**Day 2 — March 11** (49g protein, 1425 kcal):
- 1:00 PM — Gobhi sabzi + custard + 2 roti (12g P / 500 kcal) `low_protein`
- 6:30 PM — Black coffee (1g P / 15 kcal) `ok`
- 8:30 PM — Big moong dal + curd + 2 roti (30g P / 600 kcal) `ok`
- 11:30 PM — 10–15 almonds + 2 bananas (6g P / 310 kcal) `ok`

**Day 3 — March 12** (61g protein, 1195 kcal):
- 9:00 AM — Carrot pea sabzi + 2 roti (10g P / 310 kcal) `low_protein`
- 1:00 PM — Curd + 2 coffee (7g P / 115 kcal) `low_protein`
- 6:00 PM — 37g Haldiram peanuts (10g P / 210 kcal) `ok`
- 9:00 PM — 2 roti + chaap + big sprouts + salad (34g P / 560 kcal) `good`

### Workout Seeds (IDs 2001–2003)

**Day 1:** Diamond PU ×10, Knuckle PU ×10, Normal PU ×10+10, Incline PU ×15, Pull-ups 2×4, wrist curls full ladder, reverse wrist curls, bicep curls 12→6kg drop, 45 min walk (10/10 completed)

**Day 2:** Two sessions. Evening: wrist curls, bicep curls, plank 1.5min, mountain climbers, plank 1min. 11PM: backpack PU max, air squats ×20, standard PU max, burpees ×15 (10/10)

**Day 3:** Two sessions. 1PM: bicep curls + wrist curls. 6PM: pull-ups 5×4, DB rows 4×12 (6→10kg), DB flies 3×12 (6→8kg) (6/6)

---

## User Profile (for AI context)

```
Age: 19
Weight: 78 kg
Height: 5'11" (180 cm)
Body fat: ~20%
Goal: Cut to ~71 kg, visible muscle definition, 12 weeks
Equipment: 6/8/10/12 kg dumbbells, door pull-up bar, backpack + notes as weight, chair
Schedule: Free before 8 AM and after 6 PM, engineering college during the day
Cardio: Volleyball 7:30–9 PM most evenings (intense, 1.5 hrs), 2 km park for walks
Diet context: Indian home-cooked food — paneer, dal, soya chunks, sprouts, curd, roti, milk, chaap
Known issues: 3 AM eating, inconsistent sleep, skips back/leg days, protein avg 47g/day across first 3 days, carb-heavy meals, split workouts at random times
```

---

## Design System

### Theme

Dark theme only. Matches a dark fitness app aesthetic.

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#0a0a0f` | App background |
| `card` | `#13131a` | Card backgrounds |
| `border` | `#1e1e2a` | Card borders, dividers |
| `text` | `#e8e8ed` | Primary text |
| `textDim` | `#7a7a8a` | Secondary text |
| `textMuted` | `#4a4a5a` | Tertiary text |
| `green` | `#00e676` | Protein, positive, on-target |
| `purple` | `#b388ff` | Workouts, modifications, below-target |
| `amber` | `#ffab40` | Calories, "ok" rating |
| `red` | `#ff5252` | Over-calorie, low protein, negative |

### Layout

- Mobile-first, `max-width: 520px`, centered
- Tab bar is sticky below the header
- Cards: 14px radius, 16px padding, 1px border
- Buttons: 10px radius, solid fills
- All images compressed and displayed as small thumbnails (max 80px height in meal cards)

### Typography

Use `DM Sans` from Google Fonts. Sizes: 10px (micro), 11px (labels), 12px (secondary), 13px (body), 16px (card titles), 22px (section), 28px (stat numbers).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude Sonnet 4 |

---

## Scripts

```bash
npm run dev       # Start dev server on :5173
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
```

---

## Deployment

Build and deploy the `dist/` folder to any static host.

```bash
npm run build
```

**Vercel:**
```bash
npx vercel --prod
```

**Netlify:**
```bash
npx netlify deploy --prod --dir=dist
```

**Important:** The API key is exposed in the browser bundle. For production, either:
1. Accept the risk (single-user app, set a low spend limit on the key)
2. Create a `/api/chat` serverless function that proxies to Anthropic (add `"anthropic"` to `dependencies`, proxy the request server-side)

---

## Key Implementation Notes

1. **Image handling:** Use `FileReader.readAsDataURL()` to get base64. Resize to max 1024px width using an off-screen canvas before encoding. Strip the `data:image/jpeg;base64,` prefix before sending to Claude API.

2. **Past date logging:** Both Diet and Workout tabs share the same date selector pattern. When a past date is selected in the Workout tab, auto-map the date to the correct day of the week to show the right training plan.

3. **Workout modification persistence:** Store in `localStorage` key `sc_plan_mods` as `{ "0": ["Exercise 1", ...], "3": ["Exercise A", ...] }` where keys are day indices (0=Mon, 6=Sun). On the Workout tab, check this overlay before falling back to the base plan.

4. **Coach food logging:** When the coach identifies food from a photo, it should include a parseable JSON block in its response:
   ```json
   {"meal_log": {"summary": "...", "protein_g": 30, "calories": 450, "rating": "good", "feedback": "...", "items": ["paneer 100g", "roti", "roti"]}}
   ```
   The app renders a "Log this meal" button. Clicking it creates the `MealEntry` and saves it.

5. **Error resilience:** All `localStorage` and API operations wrapped in try/catch. UI never crashes. Show inline error messages, not alerts.

6. **No `localStorage` or `sessionStorage` in tests** — use in-memory mocks.