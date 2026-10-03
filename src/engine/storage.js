const DIET_KEY = 'sc_diet3';
const WORK_KEY = 'sc_work3';
const PLAN_MODS_KEY = 'sc_plan_mods';
const TOMBSTONES_KEY = 'sc_tombstones';
const HEALTH_KEY = 'sc_health';

function readKey(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

function mergeEntries(arrays) {
  const map = new Map();
  for (const arr of arrays) {
    for (const entry of arr) {
      if (entry && entry.id !== undefined) map.set(entry.id, entry);
    }
  }
  return map;
}

/** Migrate legacy keys (sc_diet, sc_diet2 → sc_diet3). No seed injection. */
export function migrate() {
  try {
    const dietLegacyKeys = ['sc_diet', 'sc_diet2'];
    const workLegacyKeys = ['sc_work', 'sc_work2'];

    const dietArrays = dietLegacyKeys.map(readKey);
    const workArrays = workLegacyKeys.map(readKey);

    const existingDiet = readKey(DIET_KEY);
    const existingWork = readKey(WORK_KEY);

    const dietMap = mergeEntries([...dietArrays, existingDiet]);
    const workMap = mergeEntries([...workArrays, existingWork]);

    localStorage.setItem(DIET_KEY, JSON.stringify([...dietMap.values()]));
    localStorage.setItem(WORK_KEY, JSON.stringify([...workMap.values()]));
  } catch (err) {
    console.error('Migration error:', err);
  }
}

export function loadDiet() {
  try {
    const arr = readKey(DIET_KEY);
    const map = new Map();
    for (const entry of arr) map.set(entry.id, entry);
    return map;
  } catch {
    return new Map();
  }
}

export function saveDiet(map) {
  try {
    localStorage.setItem(DIET_KEY, JSON.stringify([...map.values()]));
  } catch (err) {
    console.warn('saveDiet quota error, attempting to prune analyzed image data:', err);
    try {
      // Keep only images of unanalyzed or recent entries
      const sanitized = [...map.values()].map((entry, idx, arr) => {
        // Keep image only if pending analysis or in the 2 most recent entries
        if (entry.analyzed === true && idx < arr.length - 2 && entry.imageData) {
          return { ...entry, imageData: undefined };
        }
        return entry;
      });
      localStorage.setItem(DIET_KEY, JSON.stringify(sanitized));
    } catch (retryErr) {
      console.error('Critical saveDiet quota error:', retryErr);
    }
  }
}

export function loadWork() {
  try {
    const arr = readKey(WORK_KEY);
    const map = new Map();
    for (const entry of arr) map.set(entry.id, entry);
    return map;
  } catch {
    return new Map();
  }
}

export function saveWork(map) {
  try {
    localStorage.setItem(WORK_KEY, JSON.stringify([...map.values()]));
  } catch (err) {
    console.error('saveWork error:', err);
  }
}

export function loadPlanMods() {
  try {
    const raw = localStorage.getItem(PLAN_MODS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function savePlanMods(mods) {
  try {
    localStorage.setItem(PLAN_MODS_KEY, JSON.stringify(mods));
  } catch (err) {
    console.error('savePlanMods error:', err);
  }
}

export function loadTombstones() {
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY);
    return new Set(JSON.parse(raw) || []);
  } catch { return new Set(); }
}

export function saveTombstones(set) {
  try {
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify([...set]));
  } catch {}
}

export function addTombstone(id) {
  const t = loadTombstones();
  t.add(id);
  saveTombstones(t);
}

// health: { [dateStr]: { sleep_h: number, water: number } }
export function loadHealth() {
  try {
    const raw = localStorage.getItem(HEALTH_KEY);
    return JSON.parse(raw) || {};
  } catch { return {}; }
}

export function saveHealth(obj) {
  try {
    localStorage.setItem(HEALTH_KEY, JSON.stringify(obj));
  } catch {}
}

const COACH_HISTORY_KEY = 'sc_coach_history';

/** Strip large image data before saving to localStorage to avoid quota issues. */
function stripImages(messages) {
  return messages.map(m => {
    const out = { ...m, imageData: undefined };
    if (Array.isArray(m.content)) {
      out.content = m.content
        .filter(b => b.type !== 'image')
        .concat(
          m.content.filter(b => b.type === 'image').map(() => ({
            type: 'text',
            text: '[image shared earlier]',
          }))
        );
    }
    return out;
  });
}

export function loadCoachHistory() {
  try {
    const raw = localStorage.getItem(COACH_HISTORY_KEY);
    return JSON.parse(raw) || [];
  } catch { return []; }
}

export function saveCoachHistory(messages) {
  try {
    // Keep last 60 messages max; strip images to save space
    const toSave = stripImages(messages.slice(-60));
    localStorage.setItem(COACH_HISTORY_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.error('saveCoachHistory error:', err);
  }
}

export function clearCoachHistory() {
  try { localStorage.removeItem(COACH_HISTORY_KEY); } catch {}
}

const GOAL_KEY = 'sc_goal';
export const DEFAULT_GOAL = {
  text: "Cut to ~71 kg over 12 weeks with visible muscle definition while maintaining volleyball stamina",
  goalType: "cut", // "cut" | "recomp" | "bulk" | "strength"
  targetWeight_kg: 71,
  startWeight_kg: 78,
  weeklyPace_kg: 0.5,
  priority: "protein_and_strength",
  updatedAt: new Date().toISOString().split('T')[0],
};

export function loadGoal() {
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    if (!raw) return DEFAULT_GOAL;
    return { ...DEFAULT_GOAL, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_GOAL;
  }
}

export function saveGoal(goal) {
  try {
    localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
  } catch (err) {
    console.error('saveGoal error:', err);
  }
}

const USER_KEYS_KEY = 'sc_user_api_keys';
// Shape: { geminiKey?: string, groqKey?: string, openRouterKey?: string }
export function loadUserApiKeys() {
  try {
    const raw = localStorage.getItem(USER_KEYS_KEY);
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function saveUserApiKeys(keys) {
  try {
    localStorage.setItem(USER_KEYS_KEY, JSON.stringify(keys));
  } catch (err) {
    console.error('saveUserApiKeys error:', err);
  }
}

export function clearAllUserData() {
  const keysToClear = [
    DIET_KEY, WORK_KEY, PLAN_MODS_KEY, TOMBSTONES_KEY, HEALTH_KEY,
    COACH_HISTORY_KEY, 'sc_diet', 'sc_diet2', 'sc_work', 'sc_work2',
    'sc_last_sync'
  ];
  for (const k of keysToClear) {
    try {
      localStorage.removeItem(k);
    } catch {}
  }
}

const RESET_USER_FLAG = 'sc_history_cleared_v1';

export function checkOneTimeReset() {
  try {
    if (!localStorage.getItem(RESET_USER_FLAG)) {
      clearAllUserData();
      localStorage.setItem(RESET_USER_FLAG, 'true');
      return true;
    }
  } catch (err) {
    console.error('checkOneTimeReset error:', err);
  }
  return false;
}

