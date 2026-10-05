import { parseExerciseLine, parseWorkoutExercises } from './exerciseParser.js';

/**
 * Normalizes an exercise name for fuzzy historical matching.
 * e.g. "Pull-ups 5xmax (door bar)" -> "pull-up"
 */
function normalizeExerciseName(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/s$/, '')
    .replace(/pushup/g, 'pushup')
    .replace(/pullup/g, 'pullup');
}

/**
 * Searches past workouts for the most recent log of a specific exercise.
 */
export function findLastExercisePerformance(exerciseQuery, workMap) {
  const normQuery = normalizeExerciseName(exerciseQuery);
  const workouts = [...workMap.values()].sort((a, b) => b.id - a.id); // newest first

  for (const w of workouts) {
    if (!w.exercises || !Array.isArray(w.exercises)) continue;
    for (const line of w.exercises) {
      if (line.trim().startsWith('//')) continue;
      const parsed = parseExerciseLine(line);
      if (parsed) {
        const normFound = normalizeExerciseName(parsed.name);
        if (normFound.includes(normQuery) || normQuery.includes(normFound)) {
          return {
            date: w.date,
            dayLabel: w.dayLabel,
            parsed,
            raw: line,
          };
        }
      }
    }
  }
  return null;
}

/**
 * Computes progressive overload targets for today's planned exercises.
 */
export function getOverloadTargets(plannedExercises, workMap, sleep_h = 7) {
  if (!Array.isArray(plannedExercises)) return [];

  const targets = [];
  const lowRecovery = sleep_h > 0 && sleep_h < 6;

  for (const exLine of plannedExercises) {
    if (exLine.trim().startsWith('//')) continue;
    const currentParsed = parseExerciseLine(exLine);
    if (!currentParsed) continue;

    const previous = findLastExercisePerformance(currentParsed.name, workMap);

    let overloadHint = '';
    let targetAction = '';
    let isDeload = lowRecovery;

    if (lowRecovery) {
      targetAction = 'Hold Volume & Perfect Form';
      overloadHint = `Sleep was ${sleep_h}h. Match previous reps without pushing to failure to avoid injury.`;
    } else if (previous) {
      const prev = previous.parsed;
      if (prev.isBodyweight) {
        // Bodyweight progression (e.g. Pull-ups, Push-ups, Dips)
        if (prev.reps >= 15) {
          targetAction = `Add backpack weight or slow 3s eccentric`;
          overloadHint = `Last session (${previous.date}): ${prev.sets}×${prev.reps}. At 15+ bodyweight reps, load a backpack with books/weights or slow the negative down to 3s to spike hypertrophy.`;
        } else {
          const nextTargetReps = prev.reps + 1;
          targetAction = `Aim for ${prev.sets} × ${nextTargetReps} reps`;
          overloadHint = `Last session (${previous.date}): ${prev.sets}×${prev.reps}. Try to add +1 rep on your first 2 sets!`;
        }
      } else {
        // Dumbbell progression (home dumbbells: 6, 8, 10, 12 kg)
        if (prev.weight_kg >= 12) {
          // At max home dumbbell weight (12kg)
          targetAction = `Aim for ${prev.sets} × ${prev.reps + 2} @ 12kg (or 3s eccentric)`;
          overloadHint = `Last session (${previous.date}): ${prev.sets}×${prev.reps} @ 12kg. You are at your max dumbbell! Overload via rep volume (target ${prev.reps + 2} reps) or 3s slow negatives.`;
        } else if (prev.reps >= 12 && prev.weight_kg < 12) {
          const nextWeight = prev.weight_kg + 2;
          targetAction = `Try ${nextWeight}kg for Sets 1–2`;
          overloadHint = `You hit 12 reps at ${prev.weight_kg}kg! Progress to your ${nextWeight}kg dumbbell for your first sets.`;
        } else {
          targetAction = `Aim for ${prev.sets} × ${prev.reps + 2} @ ${prev.weight_kg}kg`;
          overloadHint = `Last session (${previous.date}): ${prev.sets}×${prev.reps} @ ${prev.weight_kg}kg. Push for +1–2 reps.`;
        }
      }
    } else {
      targetAction = 'Set Your Baseline';
      overloadHint = 'First time logging this movement. Focus on controlled form & note your working weight.';
    }

    targets.push({
      exerciseName: currentParsed.name,
      plannedText: exLine,
      previousPerformance: previous ? previous.raw : null,
      previousDate: previous ? previous.date : null,
      targetAction,
      overloadHint,
      isDeload,
    });
  }

  return targets;
}

/**
 * Calculates muscle group volume streaks over recent weeks.
 * Checks if Back has been trained for 4 consecutive weeks.
 */
export function getMuscleConsistencyStreaks(workMap) {
  const workouts = [...workMap.values()];
  const today = new Date();

  let backSessionsCount = 0;
  let chestSessionsCount = 0;

  for (const w of workouts) {
    const text = (w.exercises || []).join(' ').toLowerCase();
    if (/pull[\s-]?up|row|lat pull/i.test(text)) backSessionsCount++;
    if (/push[\s-]?up|press|dip/i.test(text)) chestSessionsCount++;
  }

  return {
    backSessions: backSessionsCount,
    chestSessions: chestSessionsCount,
    hasFourWeekBackBase: backSessionsCount >= 4,
  };
}
