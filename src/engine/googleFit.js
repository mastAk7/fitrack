/**
 * Google Fitness (Google Fit) Integration via Google Identity Services & Fitness REST API.
 * Pulls steps, running/walking distance, and active calories directly into Fitrack.
 */

const GOOGLE_FIT_CLIENT_ID_KEY = 'sc_google_fit_client_id';
const GOOGLE_FIT_TOKEN_KEY = 'sc_google_fit_token';
const GOOGLE_FIT_TOKEN_EXP_KEY = 'sc_google_fit_token_exp';
const GOOGLE_FIT_USER_KEY = 'sc_google_fit_user';

const FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.location.read',
].join(' ');

export function getGoogleFitClientId() {
  return import.meta.env.VITE_GOOGLE_FIT_CLIENT_ID || localStorage.getItem(GOOGLE_FIT_CLIENT_ID_KEY) || '';
}

export function saveGoogleFitClientId(clientId) {
  const trimmed = clientId.trim();
  if (trimmed) {
    localStorage.setItem(GOOGLE_FIT_CLIENT_ID_KEY, trimmed);
  } else {
    localStorage.removeItem(GOOGLE_FIT_CLIENT_ID_KEY);
  }
}

export function getStoredToken() {
  const token = localStorage.getItem(GOOGLE_FIT_TOKEN_KEY);
  const exp = parseInt(localStorage.getItem(GOOGLE_FIT_TOKEN_EXP_KEY) || '0', 10);
  if (!token || Date.now() >= exp) {
    return null;
  }
  return token;
}

export function isGoogleFitConnected() {
  return !!getStoredToken();
}

export function getGoogleFitUser() {
  return localStorage.getItem(GOOGLE_FIT_USER_KEY) || (isGoogleFitConnected() ? 'Connected' : null);
}

export function disconnectGoogleFit() {
  const token = localStorage.getItem(GOOGLE_FIT_TOKEN_KEY);
  if (token && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {});
    } catch {}
  }
  localStorage.removeItem(GOOGLE_FIT_TOKEN_KEY);
  localStorage.removeItem(GOOGLE_FIT_TOKEN_EXP_KEY);
  localStorage.removeItem(GOOGLE_FIT_USER_KEY);
}

/**
 * Loads the official Google Identity Services script asynchronously
 */
function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(new Error('Failed to load Google Identity Services SDK'));
    document.head.appendChild(script);
  });
}

/**
 * Initiates the Google Fit OAuth2 popup flow using Google Identity Services (GIS).
 */
export async function connectGoogleFit(customClientId = null) {
  const clientId = (customClientId || getGoogleFitClientId()).trim();
  if (!clientId) {
    throw new Error('Google OAuth Client ID is required to connect Google Fit.');
  }

  await loadGsiScript();

  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: FIT_SCOPES,
        callback: async (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (response.access_token) {
            const expiresIn = (parseInt(response.expires_in, 10) || 3600) * 1000;
            localStorage.setItem(GOOGLE_FIT_TOKEN_KEY, response.access_token);
            localStorage.setItem(GOOGLE_FIT_TOKEN_EXP_KEY, String(Date.now() + expiresIn));
            localStorage.setItem(GOOGLE_FIT_USER_KEY, 'Google Fit Account');
            resolve(response.access_token);
          } else {
            reject(new Error('No access token returned from Google'));
          }
        },
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Queries Google Fit REST API for daily steps, distance, active calories, and runs
 * for the past `numDays` days.
 */
export async function fetchGoogleFitDailySummary(numDays = 7) {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Google Fit is not connected or token has expired.');
  }

  const now = new Date();
  // End of today
  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  // Start of N days ago
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - numDays + 1, 0, 0, 0, 0).getTime();

  const body = {
    aggregateBy: [
      { dataTypeName: 'com.google.step_count.delta' },
      { dataTypeName: 'com.google.distance.delta' },
      { dataTypeName: 'com.google.calories.expended' },
      { dataTypeName: 'com.google.activity.segment' },
    ],
    bucketByTime: { durationMillis: 86400000 }, // 1 day buckets
    startTimeMillis: startTime,
    endTimeMillis: endTime,
  };

  const res = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    disconnectGoogleFit();
    throw new Error('Google Fit session expired. Please reconnect.');
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Fit API error (${res.status}): ${errText.slice(0, 100)}`);
  }

  const data = await res.json();
  const buckets = data.bucket || [];

  const results = {};

  for (const b of buckets) {
    const startMs = parseInt(b.startTimeMillis, 10);
    const d = new Date(startMs);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    let steps = 0;
    let distanceMeters = 0;
    let calories = 0;
    let runDistanceKm = 0;

    for (const dataset of b.dataset || []) {
      const type = dataset.dataSourceId || '';
      for (const point of dataset.point || []) {
        for (const val of point.value || []) {
          if (type.includes('step_count')) {
            steps += val.intVal || 0;
          } else if (type.includes('distance')) {
            distanceMeters += val.fpVal || 0;
          } else if (type.includes('calories')) {
            calories += val.fpVal || 0;
          } else if (type.includes('activity.segment')) {
            // Activity type 8 = running in Google Fit
            if (val.intVal === 8) {
              const segDurationMin = (parseInt(point.endTimeNanos, 10) - parseInt(point.startTimeNanos, 10)) / 6e10;
              // Approximate run distance if not separately partitioned
              runDistanceKm += Math.round((segDurationMin / 6) * 10) / 10;
            }
          }
        }
      }
    }

    results[dateStr] = {
      date: dateStr,
      steps: Math.round(steps),
      distance_km: Math.round((distanceMeters / 1000) * 10) / 10,
      active_cals: Math.round(calories),
      run_km: runDistanceKm,
    };
  }

  return results;
}

/**
 * Merges freshly fetched Google Fit data into the application's healthMap.
 */
export function mergeFitDataIntoHealthMap(healthMap, fitResults) {
  const newMap = { ...healthMap };

  for (const [date, fit] of Object.entries(fitResults)) {
    const existing = newMap[date] || { sleep_h: 0, water: 0, activities: [] };
    const prevSteps = existing.steps || 0;

    // Use fit steps if higher than manual
    const steps = Math.max(prevSteps, fit.steps || 0);
    const active_cals = Math.max(existing.active_cals || 0, fit.active_cals || 0);

    // If Google Fit detected running and no run activity is recorded yet:
    let activities = [...(existing.activities || [])];
    if (fit.run_km > 0 && !activities.some(a => a.type === 'run' && a.fromGoogleFit)) {
      activities.push({
        id: Date.now() + Math.random(),
        type: 'run',
        name: `Google Fit Run (${fit.run_km} km)`,
        distance_km: fit.run_km,
        duration_min: Math.round(fit.run_km * 6),
        calories: Math.round(fit.run_km * 78 * 1.036),
        fromGoogleFit: true,
        time: 'Tracked',
      });
    }

    newMap[date] = {
      ...existing,
      steps,
      distance_km: Math.max(existing.distance_km || 0, fit.distance_km || 0),
      active_cals,
      activities,
      googleFitSyncedAt: new Date().toISOString(),
    };
  }

  return newMap;
}

/**
 * Synchronizes Google Fit summary for a specific date or recent days.
 * Returns { updated: true, steps, active_cals, distance_km, run_km } or null.
 */
export async function syncGoogleFitForDate(dateStr) {
  if (!isGoogleFitConnected()) return null;
  const summary = await fetchGoogleFitDailySummary(3);
  const dayData = summary[dateStr];
  if (!dayData) return null;
  return {
    updated: true,
    steps: dayData.steps,
    distance_km: dayData.distance_km,
    active_cals: dayData.active_cals,
    run_km: dayData.run_km,
  };
}
