const DIET_KEY = 'sc_diet3';
const WORK_KEY = 'sc_work3';
const PLAN_MODS_KEY = 'sc_plan_mods';

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
    console.error('saveDiet error:', err);
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
