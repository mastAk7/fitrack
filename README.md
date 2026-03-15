# Fitrack

Personal adaptive fitness and nutrition tracker. Single-user app for a 12-week body recomposition cut — AI coaching, automatic macro analysis, adaptive targets, and cross-device sync via GitHub Gist.

---

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
```

Create `.env` in the root:

```
VITE_GEMINI_API_KEY=your-gemini-key
VITE_GITHUB_TOKEN=your-github-pat   # gist scope only
VITE_GIST_ID=                       # leave blank — auto-created on first run
```

**Get API keys:**
- Gemini (free, 1500 req/day): [aistudio.google.com](https://aistudio.google.com) → Get API key
- GitHub PAT: Settings → Developer settings → Personal access tokens → scope: `gist` only

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS v4 (dark theme, inline styles) |
| Charts | Recharts |
| AI | Google Gemini 1.5 Flash (free tier) |
| Storage | localStorage + GitHub Gist (sync) |
| Deployment | Vercel / Netlify / any static host |

---

## Features

### 1. Diet Logging
- **Text logging** — type what you ate; regex matcher identifies Indian food items from the built-in database and sums macros instantly. Falls back to Gemini API if no patterns match.
- **Photo logging** — attach a food photo; sent to Gemini Vision which identifies items and estimates macros. Photo stored as a base64 thumbnail on the meal card.
- **Date selector** — log meals for today, yesterday, or any past date.
- **Daily progress bars** — protein and calorie bars colour-coded green/amber/red against adaptive targets.
- **Meal cards** — show thumbnail, summary, time, protein (green), calories (amber), rating pill, one-line AI feedback, delete button.
- **History panel** — all logged dates with daily protein/calorie/meal-count summaries, tap to switch date.

**Meal rating logic:**

| Rating | Condition |
|---|---|
| `good` | protein ≥ 15g AND calories ≤ 45% of daily target |
| `ok` | doesn't trigger other ratings |
| `low_protein` | protein < 10g |
| `too_many_calories` | calories > 45% of daily target |

---

### 2. Workout Logging
- **Plan reference** — 6-day PPL split shown as a read-only reference; tap "View plan" to expand.
- **Free-text workout log** — the primary input. Log exactly what you did with sets, reps, and weights in natural format:
  ```
  Pull-ups 5 × 4
  DB rows 4 × 12 @ 6→10kg (progressive)
  Bicep curls 3 × 10 @ 8kg, drop to 6kg
  // Section comments start with //
  Plank 3 × 60s
  ```
- Lines starting with `//` are treated as section headers (e.g. `// Session 2 — 11 PM`) and not counted as exercises.
- **Date selector** — log past workouts; day tabs auto-map to the correct plan day.
- **AI workout modifications** — coach can modify any day's plan (stored as overlay in `sc_plan_mods`). Modified days show a "Modified" badge with a "Reset" button.
- **Delete** logged sessions.

---

### 3. Analytics
All computed from logged data — no manual inputs.

- **Adaptive targets card** — current week, phase, protein and calorie targets.
- **4 stat cards** — avg protein/day, avg calories/day, protein hit rate, workout sessions (all last 14 days).
- **Protein trend chart** — 14-day line chart; dots green (≥ target) or purple (below); dashed reference line at target.
- **Calorie bar chart** — 14-day bars; red if > 108% of target; dashed reference line.
- **Workout heatmap** — 28-day 7×4 grid; purple = trained, dim = rest.
- **Meal quality breakdown** — horizontal bars showing % of all-time meals per rating.
- **Streaks** — current protein streak (consecutive days ≥ 130g) and workout session count.

---

### 4. AI Coach (Gemini)

#### Context injected into every request
Every message to the coach includes a rich system prompt (~2000 tokens) containing:

| Section | Content |
|---|---|
| User profile | Age, weight, height, goal, equipment, schedule, known issues |
| Adaptive targets | Current week, phase, protein and calorie targets |
| Today's log | Every logged meal with time, macros, rating; running totals and remaining targets |
| Today's workout | Logged session with completion status and notes |
| 14-day summary table | Per-day: protein (hit/miss), calories (ok/over), gym (yes/no), meal count |
| Recent meals detail | Individual meal entries for last 7 days |
| Workout history | All sessions from last 30 days with notes |
| All-time stats | Total logged days, avg protein, hit rate %, total workouts |
| Daily briefing | AI-generated 3-sentence analysis (see below) |
| Training plan | Full 6-day split with all exercises |
| Food database | All 19 Indian food items with macros |

#### Daily AI Briefing
Once per day, the app makes **1 Gemini call** in the background to generate a 3-sentence coach briefing:
1. Overall trend verdict (last 14 days)
2. Biggest weakness to fix
3. One specific action for today

Cached in `localStorage` under `sc_daily_briefing` with a date key. Re-generated automatically each new day. Injected at the bottom of every coach system prompt so Gemini already "knows" your patterns before you ask anything.

#### Workout modifications
When you ask the coach to modify a workout, it responds in natural text **plus** appends a structured JSON block:
```json
{"workout_mod": {"dayIndex": 1, "exercises": ["Pull-ups 5 × max", "DB rows 4 × 12 @ 10kg"]}}
```
The app parses this and renders a purple **"Apply to Tuesday?"** card in chat. Clicking it writes the new exercise list to `localStorage` key `sc_plan_mods` as `{ "1": [...] }`. The Workout tab immediately shows the modified plan with a "Modified" badge. Dismiss ignores it.

#### Meal logging from coach
When you send a food photo to the coach (or ask it to log what you described), it appends:
```json
{"meal_log": {"summary": "...", "protein_g": 30, "calories": 450, "rating": "good", "feedback": "...", "items": [...]}}
```
The app renders a green **"Log this meal"** button. Clicking it creates a `MealEntry` and saves it to the diet log.

#### API call structure
```js
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=KEY

{
  system_instruction: { parts: [{ text: fullCoachContext }] },
  contents: conversationHistory,   // full session history, Claude-format converted to Gemini-format
  generationConfig: { maxOutputTokens: 1024 }
}
```
Responses stream in real-time via SSE. Conversation history is maintained in React state for the session (not persisted).

#### Quick prompt chips
`What to eat right now?` · `Am I on track?` · `Shorten today's workout` · `I'm tired today` · `3 AM hunger 😅` · `Progress review`

---

## Adaptive Targets Engine

Recalculates on every app load from the full diet log.

```
computeTargets(dietMap) → { cal, pro, week, phase }
```

1. **Week number** — weeks elapsed since first logged meal, capped at 12.
2. **Base calorie taper** — `2000 - (week - 1) × 10` → 2000 kcal week 1 down to 1890 kcal week 12.
3. **Adaptive adjustments** from last 14 logged days:
   - Avg calories > 110% of base → tighten by 5%
   - Protein hit rate < 40% → set protein target to `avg + 20g`
   - Protein hit rate > 70% → bump protein target by 5g
4. **Guard rails** — calories clamped 1750–2100, protein clamped 130–165g.
5. **Phases** — Ramp Up (wk 1–2), Mid Cut (3–6), Deep Cut (7–10), Final Push (11–12).

---

## GitHub Gist Sync

All user data is synced to a **private GitHub Gist** automatically.

### How it works
1. On app load — pulls from gist, merges with localStorage (union by entry ID; local wins on conflict).
2. On any data change — debounced 30-second push to gist.
3. On tab close (`beforeunload`) — immediate push.
4. Header shows `● Syncing…` / `● Synced` / `● Sync failed` + last sync time.

### Gist structure
```json
{
  "version": 3,
  "diet": [ ...MealEntry[] ],
  "work": [ ...WorkoutEntry[] ],
  "planMods": { "1": ["Exercise..."] },
  "lastSync": "2025-03-15T10:00:00Z"
}
```

### Setup
Set `VITE_GITHUB_TOKEN` (PAT with `gist` scope only) in your env. Leave `VITE_GIST_ID` blank — the app auto-creates the gist on first run and stores the ID in `localStorage`. Optionally, after first run copy the gist ID from your GitHub account and set it as `VITE_GIST_ID` in Vercel env vars for faster cold starts.

---

## Storage

| Key | Contents |
|---|---|
| `sc_diet3` | `MealEntry[]` — all meal logs |
| `sc_work3` | `WorkoutEntry[]` — all workout logs |
| `sc_plan_mods` | `{ [dayIndex]: string[] }` — AI workout modifications overlay |
| `sc_daily_briefing` | `{ date, text }` — cached daily AI briefing |
| `sc_gist_id` | GitHub Gist ID (auto-set on first sync) |
| `sc_last_sync` | ISO timestamp of last successful gist push |

**Migration:** On load, legacy keys `sc_diet`, `sc_diet2`, `sc_work`, `sc_work2` are merged into `sc_diet3` / `sc_work3` by entry ID to avoid data loss on schema updates.

---

## Project Structure

```
src/
├── App.jsx                   # Root — data loading, gist sync, daily briefing
├── main.jsx
├── components/
│   ├── Header.jsx            # Phase badge + sync status indicator
│   ├── TabBar.jsx            # Sticky bottom nav
│   ├── DietTab.jsx           # Meal logging (text + photo)
│   ├── WorkoutTab.jsx        # Free-text workout log + plan reference
│   ├── AnalyticsTab.jsx      # Charts, heatmap, streaks
│   ├── CoachTab.jsx          # AI chat, workout mod cards, meal log cards
│   ├── MealCard.jsx          # Individual meal entry
│   ├── ExerciseRow.jsx       # Checkable exercise row (used by coach mod preview)
│   ├── TargetBar.jsx         # Progress bar
│   ├── StatCard.jsx          # Analytics stat tile
│   ├── ImageUpload.jsx       # Camera/gallery picker, canvas resize to 1024px
│   └── ChatBubble.jsx        # Chat message bubble
├── engine/
│   ├── adaptive.js           # computeTargets, getDailyAggregates, getProteinStreak
│   ├── analyzer.js           # Text → macros (regex + Gemini fallback)
│   ├── claude.js             # Gemini API client (callClaude, callClaudeStream)
│   ├── context.js            # Rich coach system prompt builder + daily briefing
│   ├── gistSync.js           # GitHub Gist pull/push/merge
│   └── storage.js            # localStorage helpers + migration
└── data/
    ├── foodDb.js             # 19 Indian food items with macros
    ├── trainingPlan.js       # 6-day PPL split
    └── seeds.js              # Days 1–3 pre-seeded data (IDs 1001–2003)
```

---

## Gemini Request Budget

With 1500 free requests/day, typical usage:

| Usage | Requests |
|---|---|
| Daily briefing (background, once/day) | 1 |
| Meal text analysis (regex matched) | 0 |
| Meal text analysis (no match, Gemini fallback) | 1 per meal |
| Meal photo analysis | 1 per photo |
| Coach message | 1 per message |
| **Worst case daily total** | ~10–15 |

Well within the free tier.

---

## Scripts

```bash
npm run dev       # Dev server on :5173
npm run build     # Production build → dist/
npm run preview   # Preview production build
```

## Deployment

```bash
npm run build
npx vercel --prod
```

Set these in Vercel environment variables:
- `VITE_GEMINI_API_KEY`
- `VITE_GITHUB_TOKEN`
- `VITE_GIST_ID` (optional)
