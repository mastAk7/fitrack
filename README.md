# Fitrack — Shred Coach

An adaptive AI fitness and nutrition tracker built for a 12-week body recomposition cut. Logs meals (text or photo), tracks workouts, adapts weekly calorie and protein targets, and gives coaching through a context-aware AI chat — all as a client-side React app with no backend.

---

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
```

Create `.env` in the root:

```
VITE_GEMINI_API_KEY_1=your-gemini-key
VITE_GITHUB_TOKEN=your-github-pat   # gist scope only
VITE_GIST_ID=                       # leave blank — auto-created on first run
```

**Get API keys:**
- Gemini (free tier): [aistudio.google.com](https://aistudio.google.com) → Get API key
- GitHub PAT: Settings → Developer settings → Personal access tokens → scope: `gist` only

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS v4 (dark theme, mobile-first, 520px max-width) |
| Charts | Recharts |
| AI | Google Gemini (free tier) |
| Storage | localStorage + GitHub Gist (cross-device sync) |
| Deployment | Vercel |

---

## Features

### Diet Logging

Log meals by typing what you ate or attaching a photo. The AI analyzes each entry for precise macros — understanding Indian vessel sizes (medium bowl, big plate, etc.), specific dishes (chilli paneer, dal makhani, rajma), and preparation styles (watery vs. dense).

- **Text logging** — natural language input; AI identifies the specific dish and calculates macros per ingredient
- **Photo logging** — attach a food photo; AI identifies all visible items and estimates macros from the image
- **Per-item breakdown** — tap "Read more" on any meal card to see a per-ingredient table with weight, calories, protein, carbs, fat, fiber, iron, and calcium. Tap each ingredient to expand its micro breakdown
- **Auto-analysis** — pending meals are analyzed automatically on page load; no button click needed even after a refresh
- **Date selector** — log for today, yesterday, or any past date
- **Daily progress bars** — protein and calorie bars against adaptive targets, updated live
- **Meal rating** — each meal is rated `good`, `ok`, `low protein`, or `high calories` based on contribution to daily target
- **Duplicate detection** — warns if a similar meal was already logged that day
- **History panel** — all logged dates with daily protein, calorie, and meal-count summaries

### Workout Logging

- **Free-text log** — log exactly what you did in natural format (sets × reps @ weight)
- **Section comments** — lines starting with `//` are treated as headers, not exercises
- **6-day PPL split** — plan reference visible in the tab; AI can modify any day's plan
- **Date selector** — log past sessions; day tabs auto-map to the correct split day
- **Muscle heatmap** — AI extracts muscles worked from each logged session; shown in the Analytics silhouette

### Analytics

All stats derived live from logged data.

- **Adaptive targets card** — current week, phase, protein and calorie targets
- **Stat cards** — avg protein, avg calories, protein hit rate, workout sessions (last 14 days)
- **14-day protein trend** — line chart with per-day dots (green = hit target, purple = missed) and a dashed target line
- **14-day calorie bars** — bar chart; red fill if over target
- **28-day workout heatmap** — 7×4 grid, purple = trained
- **Muscle silhouette** — front + back body diagram with per-muscle intensity shading derived from logged exercises
- **Meal quality breakdown** — horizontal bars showing all-time meal rating distribution
- **Streaks** — consecutive protein-target days and total workout count

### AI Coach

A context-aware fitness coach that knows your full log history before you type anything.

- Every message includes a rich system context: today's meals and macros, running totals vs. targets, workout status, 14-day performance table, 7-day trends, sleep and water data, 30-day workout history, your training plan, and an AI-generated daily briefing
- Responses stream in real-time
- **Daily briefing** — one AI call per day (cached) generates a status summary, today's priority, and a watch-out pattern from your logs. Injected into every coach session automatically
- **Workout modifications** — coach can rewrite any day's exercise plan; a confirmation card appears in chat. One tap applies it; the Workout tab updates immediately
- **Meal logging from chat** — describe food or send a photo to the coach; it analyzes and offers a one-tap "Log this meal" button
- **Quick prompts** — pre-built chips for common queries (what to eat, am I on track, shorten workout, progress review)
- **Sleep alerts** — coach automatically reduces recommended workout volume on days with under 6h logged sleep

### Adaptive Targets Engine

Recalculates on every load from your full diet history.

- Starts at 2000 kcal / 130g protein (Week 1) and tapers weekly
- Adjusts based on last 14 days: tightens calories if consistently over, nudges protein up/down based on hit rate
- Guard rails: calories clamped 1750–2100, protein clamped 130–165g
- Four phases: **Ramp Up** (wk 1–2) → **Mid Cut** (3–6) → **Deep Cut** (7–10) → **Final Push** (11–12)

### Health Tracking

- Log sleep hours and water glasses per day
- Last 7 days of sleep and water shown in the coach's context and in a widget on the Diet tab
- Sleep data influences coach recommendations automatically

### Cross-Device Sync (GitHub Gist)

- On load: pulls from a private GitHub Gist, merges with local data (union by entry ID, local wins on conflict)
- On change: debounced 30-second push after any data update
- On tab close: immediate push via `beforeunload`
- Header shows live sync status: `● Syncing` / `● Synced` / `● Sync failed` + last sync timestamp
- Tombstone list prevents deleted entries from re-appearing after sync

---

## Deployment

```bash
npm run build
npx vercel --prod
```

Set in Vercel environment variables:
- `VITE_GEMINI_API_KEY`
- `VITE_GITHUB_TOKEN`
- `VITE_GIST_ID` (optional — auto-created on first run otherwise)

---

## Project Structure

```
src/
├── App.jsx                   # Root — data loading, sync, daily briefing
├── components/
│   ├── Header.jsx            # Phase badge + sync status
│   ├── TabBar.jsx            # Sticky bottom nav
│   ├── DietTab.jsx           # Meal logging, auto-analysis, date selector
│   ├── WorkoutTab.jsx        # Free-text workout log + plan view
│   ├── AnalyticsTab.jsx      # Charts, heatmap, silhouette, streaks
│   ├── CoachTab.jsx          # AI chat, workout mod cards, meal log cards
│   ├── MealCard.jsx          # Meal entry with expandable per-item micro breakdown
│   ├── HealthWidget.jsx      # Sleep + water input
│   ├── ImageUpload.jsx       # Camera/gallery picker, canvas resize
│   ├── TargetBar.jsx         # Progress bar
│   ├── StatCard.jsx          # Analytics stat tile
│   └── SyncSettings.jsx      # Gist sync configuration panel
├── engine/
│   ├── adaptive.js           # computeTargets, getDailyAggregates, getProteinStreak
│   ├── analyzer.js           # Meal text/image → macros (batch + single)
│   ├── claude.js             # AI API client with multi-model rotation and retry
│   ├── context.js            # Coach system prompt builder + daily briefing
│   ├── gistSync.js           # GitHub Gist pull/push/merge
│   └── storage.js            # localStorage helpers + schema migration
└── data/
    ├── foodDb.js             # Indian food macro database
    ├── trainingPlan.js       # 6-day PPL split definition
    └── seeds.js              # Pre-seeded demo data (days 1–3)
```

---

## Scripts

```bash
npm run dev       # Dev server on :5173
npm run build     # Production build → dist/
npm run preview   # Preview production build
```

---

## Data Storage

All data lives in `localStorage`. No backend, no account.

| Key | Contents |
|---|---|
| `sc_diet3` | All meal entries |
| `sc_work3` | All workout entries |
| `sc_plan_mods` | AI workout plan modifications overlay |
| `sc_daily_briefing` | Cached daily AI briefing (regenerates each day) |
| `sc_gist_id` | GitHub Gist ID (auto-set on first sync) |
| `sc_last_sync` | ISO timestamp of last successful sync |

Clear `localStorage` to fully reset the app.
