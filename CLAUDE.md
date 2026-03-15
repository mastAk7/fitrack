# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fitrack ("Shred Coach") is a single-user adaptive fitness and nutrition tracker — a React SPA for a 12-week body recomposition cut with AI coaching. All data lives in localStorage; no backend required.

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Dev server at http://localhost:5173
npm run build            # Production build → dist/
npm run preview          # Preview production build locally
```

**Deployment:**
```bash
npx vercel --prod        # Vercel
npx netlify deploy --prod --dir=dist  # Netlify
```

**Environment:** Create `.env` with `VITE_ANTHROPIC_API_KEY=sk-ant-<your-key>` before running.

## Tech Stack

- **React 18 + Vite** — SPA, no router (tab-based navigation in App.jsx)
- **Tailwind CSS** — Dark theme, mobile-first, 520px max-width
- **Recharts** — Analytics charts
- **localStorage** — Persistence (`sc_diet3`, `sc_work3`, `sc_plan_mods`)
- **Anthropic Claude Sonnet 4** (`claude-sonnet-4-20250514`) — AI coaching + Vision for meal photos

## Architecture

### Data Flow

```
User Input (Diet/Workout tabs)
    → localStorage (storage.js)
    → Adaptive Engine (adaptive.js) — weekly calorie/protein targets
    → Analytics Engine (derived stats + charts)
    → Coach Context (system prompt injection → Claude API)
```

### Engine Layer (`src/engine/`)

- **`storage.js`** — localStorage helpers with schema migration from legacy keys
- **`adaptive.js`** — Weekly target computation: 4-phase progression (Ramp Up → Mid Cut → Deep Cut → Final Push) using a 14-day rolling average
- **`analyzer.js`** — Text → macros: regex against Indian food DB (`src/data/foodDb.js`), fallback to Claude API
- **`claude.js`** — Anthropic API wrapper (Vision + chat)

### Data Schemas

**MealEntry** (`sc_diet3`): `{ id, date, time, summary, protein_g, calories, rating, feedback, items[], imageData? }`

**WorkoutEntry** (`sc_work3`): `{ id, date, dayLabel, exercises[], completed, total, notes }`

**Workout modifications** stored as overlay in `sc_plan_mods`.

### Tab Components (`src/components/`)

| Tab | Component | Purpose |
|-----|-----------|---------|
| Diet | `DietTab.jsx` | Meal logging via text or photo (base64 → Claude Vision) |
| Workout | `WorkoutTab.jsx` | 6-day PPL split check-off; plan is mutable via Coach |
| Analytics | `AnalyticsTab.jsx` | 14-day protein/calorie charts, workout heatmap, streaks |
| Coach | `CoachTab.jsx` | AI chat with full context injection; JSON parsing for workout modifications |

### Training Data (`src/data/`)

- `trainingPlan.js` — 6-day PPL split definition
- `foodDb.js` — Indian food macro database
- `seeds.js` — Days 1–3 pre-seeded for demo data

## Key Implementation Notes

- The Coach tab injects full context (user profile, recent logs, adaptive targets, food DB) into the system prompt on each request.
- Workout plan modifications from the Coach arrive as structured JSON in the API response and are overlaid onto the base plan.
- The adaptive algorithm re-runs on every app load; targets are not cached.
- `src/data/seeds.js` pre-populates localStorage on first run — clear localStorage to reset.
