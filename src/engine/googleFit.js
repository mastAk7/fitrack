/**
 * Google Fitness (Google Fit) Integration via Google Identity Services & Fitness REST API.
 * Pulls steps, distance, speed, duration, heart points, and activities directly into Fitrack.
 */

import { calculateActivityCalories } from './activity.js';

const GOOGLE_FIT_CLIENT_ID_KEY = 'sc_google_fit_client_id';
const GOOGLE_FIT_TOKEN_KEY = 'sc_google_fit_token';
const GOOGLE_FIT_TOKEN_EXP_KEY = 'sc_google_fit_token_exp';
const GOOGLE_FIT_USER_KEY = 'sc_google_fit_user';

const FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.location.read',
].join(' ');

export const FIT_ACTIVITY_MAP = {
  1:   { id: 'cycling', name: 'Cycling', icon: '🚴', isCardio: true, met: 7.5 },
  7:   { id: 'walk',    name: 'Walking', icon: '🚶', isCardio: false, met: 3.5 },
  8:   { id: 'run',     name: 'Running', icon: '🏃', isCardio: true, met: 9.8 },
  9:   { id: 'aerobics', name: 'Aerobics', icon: '🔥', isCardio: true, met: 7.0 },
  10:  { id: 'badminton', name: 'Badminton', icon: '🏸', isCardio: true, met: 5.5 },
  14:  { id: 'calisthenics', name: 'Calisthenics', icon: '💪', isCardio: false, met: 6.0 },
  15:  { id: 'cricket', name: 'Cricket', icon: '🏏', isCardio: true, met: 5.0 },
  18:  { id: 'dancing', name: 'Dancing', icon: '💃', isCardio: true, met: 6.0 },
  24:  { id: 'football', name: 'Football', icon: '⚽', isCardio: true, met: 7.0 },
  32:  { id: 'hiit', name: 'Cardio / HIIT', icon: '⚡', isCardio: true, met: 8.5 },
  35:  { id: 'hiking', name: 'Hiking', icon: '🥾', isCardio: true, met: 6.5 },
  57:  { id: 'rowing', name: 'Rowing', icon: '🚣', isCardio: true, met: 7.0 },
  80:  { id: 'strength', name: 'Strength Training', icon: '🏋️', isCardio: false, met: 5.0 },
  82:  { id: 'swimming', name: 'Swimming', icon: '🏊', isCardio: true, met: 7.5 },
  84:  { id: 'tennis', name: 'Tennis', icon: '🎾', isCardio: true, met: 7.0 },
  87:  { id: 'treadmill', name: 'Treadmill Run', icon: '🏃', isCardio: true, met: 9.5 },
  107: { id: 'volleyball', name: 'Volleyball', icon: '🏐', isCardio: true, met: 5.5 },
  113: { id: 'crossfit', name: 'Crossfit', icon: '🏋️', isCardio: true, met: 8.0 },
  114: { id: 'yoga', name: 'Yoga', icon: '🧘', isCardio: false, met: 3.0 },
};

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
    script.onerror = () => reject(new Error('Failed to load Google Identity Services SDK'));
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
 * Queries Google Fit REST API for daily steps, distance, active calories, heart points,
 * and activity segments for the past `numDays` days.
 */
export async function fetchGoogleFitDailySummary(numDays = 7) {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Google Fit is not connected or token has expired.');
  }

  const now = new Date();
  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - numDays + 1, 0, 0, 0, 0).getTime();

  // Try querying comprehensive types first; fall back to core if heart_minutes fails
  const aggregateLists = [
    [
      { dataTypeName: 'com.google.step_count.delta' },
      { dataTypeName: 'com.google.distance.delta' },
      { dataTypeName: 'com.google.calories.expended' },
      { dataTypeName: 'com.google.heart_minutes' },
      { dataTypeName: 'com.google.active_minutes' },
      { dataTypeName: 'com.google.activity.segment' },
    ],
    [
      { dataTypeName: 'com.google.step_count.delta' },
      { dataTypeName: 'com.google.distance.delta' },
      { dataTypeName: 'com.google.calories.expended' },
      { dataTypeName: 'com.google.activity.segment' },
    ]
  ];

  let res = null;
  for (const aggregateBy of aggregateLists) {
    const body = {
      aggregateBy,
      bucketByTime: { durationMillis: 86400000 }, // 1 day buckets
      startTimeMillis: startTime,
      endTimeMillis: endTime,
    };

    res = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      disconnectGoogleFit();
      throw new Error('Google Fit session expired. Please reconnect in Settings.');
    }

    if (res.ok) {
      break;
    }
  }

  if (!res || !res.ok) {
    const errText = res ? await res.text() : 'No response';
    throw new Error(`Google Fit API error: ${errText.slice(0, 100)}`);
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
    let heartPoints = 0;
    let moveMinutes = 0;
    const activities = [];

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
          } else if (type.includes('heart_minutes')) {
            heartPoints += val.fpVal || 0;
          } else if (type.includes('active_minutes')) {
            moveMinutes += val.intVal || 0;
          } else if (type.includes('activity.segment')) {
            const actCode = val.intVal;
            // Ignore idle/vehicle/sleep codes
            if (actCode !== 0 && actCode !== 3 && actCode !== 4 && actCode !== 72 && FIT_ACTIVITY_MAP[actCode]) {
              const actInfo = FIT_ACTIVITY_MAP[actCode];
              const pStart = parseInt(point.startTimeNanos, 10);
              const pEnd = parseInt(point.endTimeNanos, 10);
              const durMin = Math.max(1, Math.round((pEnd - pStart) / 6e10));
              const timeStr = new Date(pStart / 1e6).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

              // Estimate distance for running/walking if not individually tagged
              let distKm = 0;
              if (actInfo.id === 'run') {
                distKm = Math.round((durMin / 5.8) * 10) / 10;
              } else if (actInfo.id === 'walk') {
                distKm = Math.round((durMin / 12) * 10) / 10;
              } else if (actInfo.id === 'cycling') {
                distKm = Math.round((durMin / 3.2) * 10) / 10;
              }

              const actCals = calculateActivityCalories(actInfo.id, {
                distance_km: distKm,
                duration_min: durMin,
                weight_kg: 78,
              });

              let speedKmh = 0;
              let paceStr = '';
              if (distKm > 0 && durMin > 0) {
                speedKmh = Math.round((distKm / (durMin / 60)) * 10) / 10;
                const paceDecimal = durMin / distKm;
                const paceM = Math.floor(paceDecimal);
                const paceS = Math.round((paceDecimal % 1) * 60);
                paceStr = `${paceM}'${paceS.toString().padStart(2, '0')}" /km`;
              }

              activities.push({
                id: pStart || Date.now(),
                type: actInfo.id,
                name: actInfo.name,
                icon: actInfo.icon,
                duration_min: durMin,
                distance_km: distKm,
                speed_kmh: speedKmh,
                pace: paceStr,
                calories: actCals,
                time: timeStr,
                fromGoogleFit: true,
              });
            }
          }
        }
      }
    }

    const totalDistKm = Math.round((distanceMeters / 1000) * 10) / 10;
    // If active burn from Google Fit is available, use it; otherwise estimate from steps & activities
    const actTotalCals = activities.reduce((sum, a) => sum + (a.calories || 0), 0);
    const stepCals = Math.round(steps * 0.04);
    const finalActiveCals = Math.max(Math.round(calories), actTotalCals + stepCals);

    results[dateStr] = {
      date: dateStr,
      steps: Math.round(steps),
      distance_km: totalDistKm,
      active_cals: finalActiveCals,
      heart_points: Math.round(heartPoints),
      move_min: Math.round(moveMinutes),
      activities,
    };
  }

  return results;
}

/**
 * Merges freshly fetched Google Fit data into the application's healthMap.
 * Everything for activity, steps, distance, active cals, heart points comes strictly from Fit!
 */
export function mergeFitDataIntoHealthMap(healthMap, fitResults) {
  const newMap = { ...healthMap };

  for (const [date, fit] of Object.entries(fitResults)) {
    const existing = newMap[date] || { sleep_h: 0, water: 0 };

    newMap[date] = {
      ...existing,
      steps: fit.steps || 0,
      distance_km: fit.distance_km || 0,
      active_cals: fit.active_cals || 0,
      heart_points: fit.heart_points || 0,
      move_min: fit.move_min || 0,
      activities: fit.activities || [],
      fit_synced: true,
      fit_synced_at: new Date().toISOString(),
    };
  }

  return newMap;
}

/**
 * Synchronizes Google Fit summary for recent days.
 */
export async function syncGoogleFitForDate(dateStr) {
  if (!isGoogleFitConnected()) return null;
  const summary = await fetchGoogleFitDailySummary(7);
  const dayData = summary[dateStr];
  return {
    updated: true,
    dayData,
    allDays: summary,
  };
}
