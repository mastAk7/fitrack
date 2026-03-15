const GIST_ID_KEY = 'sc_gist_id';
const GIST_FILENAME = 'shred-coach-data.json';
const LAST_SYNC_KEY = 'sc_last_sync';

function getToken() {
  return import.meta.env.VITE_GITHUB_TOKEN || '';
}

function getGistId() {
  return import.meta.env.VITE_GIST_ID || localStorage.getItem(GIST_ID_KEY) || '';
}

export function isGistConfigured() {
  return !!getToken();
}

export function getLastSyncTime() {
  return localStorage.getItem(LAST_SYNC_KEY);
}

async function ghFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

async function ensureGistId() {
  let id = getGistId();
  if (id) return id;

  // Auto-create a private gist
  const res = await ghFetch('https://api.github.com/gists', {
    method: 'POST',
    body: JSON.stringify({
      description: 'Shred Coach — fitness data backup',
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify({ version: 3, diet: [], work: [], planMods: {}, lastSync: new Date().toISOString() }, null, 2),
        },
      },
    }),
  });

  if (!res.ok) throw new Error(`Failed to create gist: ${res.status}`);
  const data = await res.json();
  localStorage.setItem(GIST_ID_KEY, data.id);
  return data.id;
}

/**
 * Pulls data from gist. Returns { diet[], work[], planMods } or null.
 */
export async function pullGist() {
  if (!getToken()) return null;
  try {
    const id = await ensureGistId();
    const res = await ghFetch(`https://api.github.com/gists/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.files?.[GIST_FILENAME]?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch (err) {
    console.error('Gist pull error:', err);
    return null;
  }
}

/**
 * Pushes current state to gist. Returns true on success.
 */
export async function pushGist(dietMap, workMap, planMods) {
  if (!getToken()) return false;
  try {
    const id = await ensureGistId();
    const payload = {
      version: 3,
      diet: [...dietMap.values()],
      work: [...workMap.values()],
      planMods,
      lastSync: new Date().toISOString(),
    };
    const res = await ghFetch(`https://api.github.com/gists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        files: { [GIST_FILENAME]: { content: JSON.stringify(payload, null, 2) } },
      }),
    });
    if (!res.ok) return false;
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return true;
  } catch (err) {
    console.error('Gist push error:', err);
    return false;
  }
}

/**
 * Merges gist data into existing Maps. Union by id — local wins on conflict.
 * Returns { dietMap, workMap, planMods }
 */
export function mergeGistData(localDietMap, localWorkMap, localPlanMods, gistData) {
  const dietMap = new Map(localDietMap);
  const workMap = new Map(localWorkMap);

  for (const entry of gistData.diet || []) {
    if (!dietMap.has(entry.id)) dietMap.set(entry.id, entry);
  }
  for (const entry of gistData.work || []) {
    if (!workMap.has(entry.id)) workMap.set(entry.id, entry);
  }

  // Merge planMods: local key wins
  const planMods = { ...(gistData.planMods || {}), ...localPlanMods };

  return { dietMap, workMap, planMods };
}
