import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import DietTab from './components/DietTab.jsx';
import WorkoutTab from './components/WorkoutTab.jsx';
import AnalyticsTab from './components/AnalyticsTab.jsx';
import CoachTab from './components/CoachTab.jsx';
import { migrate, loadDiet, loadWork, loadPlanMods, saveDiet, saveWork, savePlanMods, loadTombstones, saveTombstones, loadHealth, saveHealth, loadGoal, clearAllUserData, checkOneTimeReset } from './engine/storage.js';
import { computeTargets } from './engine/adaptive.js';
import { pullGist, pushGist, mergeGistData, isGistConfigured, getLastSyncTime } from './engine/gistSync.js';
import { isGoogleFitConnected, fetchGoogleFitDailySummary, mergeFitDataIntoHealthMap } from './engine/googleFit.js';
import SyncSettings from './components/SyncSettings.jsx';
import GoalModal from './components/GoalModal.jsx';
import { getDailyBriefing } from './engine/context.js';

const PUSH_DEBOUNCE_MS = 30_000; // push 30s after last change

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('diet');
  const [dietMap, setDietMap] = useState(new Map());
  const [workMap, setWorkMap] = useState(new Map());
  const [planMods, setPlanMods] = useState({});
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSync, setLastSync] = useState(getLastSyncTime());
  const [dailyBriefing, setDailyBriefing] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [healthMap, setHealthMap] = useState({});
  const [goal, setGoal] = useState(() => loadGoal());
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pushTimer = useRef(null);
  // Store latest maps in refs so beforeunload can access them without stale closure
  const dietRef = useRef(dietMap);
  const workRef = useRef(workMap);
  const modsRef = useRef(planMods);
  const healthRef = useRef(healthMap);

  useEffect(() => { dietRef.current = dietMap; }, [dietMap]);
  useEffect(() => { workRef.current = workMap; }, [workMap]);
  useEffect(() => { modsRef.current = planMods; }, [planMods]);
  useEffect(() => { healthRef.current = healthMap; }, [healthMap]);

  // ── Clear all data handler ─────────────────────────────────
  // ── Clear all data handler ─────────────────────────────────
  const handleClearAll = useCallback(async () => {
    clearAllUserData();
    const emptyDiet = new Map();
    const emptyWork = new Map();
    const emptyMods = {};
    const emptyHealth = {};
    setDietMap(emptyDiet);
    setWorkMap(emptyWork);
    setPlanMods(emptyMods);
    setHealthMap(emptyHealth);
    setDailyBriefing('');
    if (isGistConfigured()) {
      setSyncStatus('syncing');
      await pushGist(emptyDiet, emptyWork, emptyMods, new Set(), emptyHealth);
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, []);

  // ── Initial load ────────────────────────────────────────────
  useEffect(() => {
    const wasReset = checkOneTimeReset();
    if (!wasReset) {
      migrate();
    }
    let diet = wasReset ? new Map() : loadDiet();
    let work = wasReset ? new Map() : loadWork();
    let mods = wasReset ? {} : loadPlanMods();
    let health = wasReset ? {} : loadHealth();

    setDietMap(diet);
    setWorkMap(work);
    setPlanMods(mods);
    setHealthMap(health);

    if (wasReset && isGistConfigured()) {
      pushGist(new Map(), new Map(), {}, new Set(), {}).catch(() => {});
    }

    // Pull from gist and merge (only if not freshly reset)
    if (!wasReset && isGistConfigured()) {
      setSyncStatus('syncing');
      pullGist()
        .then(gistData => {
          if (gistData) {
            const localTombstones = loadTombstones();
            const merged = mergeGistData(diet, work, mods, gistData, localTombstones, health);
            saveDiet(merged.dietMap);
            saveWork(merged.workMap);
            savePlanMods(merged.planMods);
            saveHealth(merged.health);
            saveTombstones(merged.tombstones);
            setDietMap(merged.dietMap);
            setWorkMap(merged.workMap);
            setPlanMods(merged.planMods);
            setHealthMap(merged.health);
            diet = merged.dietMap;
            work = merged.workMap;
            mods = merged.planMods;
            health = merged.health;
          }
          setSyncStatus('synced');
          setLastSync(getLastSyncTime() || new Date().toISOString());
          setTimeout(() => setSyncStatus('idle'), 2500);
        })
        .catch(() => {
          setSyncStatus('error');
          setTimeout(() => setSyncStatus('idle'), 3000);
        });
    }

    // Generate daily briefing (1 Gemini call/day)
    const targets = computeTargets(diet);
    getDailyBriefing(diet, work, targets, health).then(setDailyBriefing).catch(() => {});
  }, []);

  // ── Debounced push on data changes ──────────────────────────
  const schedulePush = useCallback(() => {
    if (!isGistConfigured()) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      setSyncStatus('syncing');
      const ok = await pushGist(dietRef.current, workRef.current, modsRef.current, loadTombstones(), healthRef.current);
      setSyncStatus(ok ? 'synced' : 'error');
      if (ok) setLastSync(new Date().toISOString());
      setTimeout(() => setSyncStatus('idle'), ok ? 2500 : 4000);
    }, PUSH_DEBOUNCE_MS);
  }, []);

  const isInitialized = useRef(false);

  // Trigger push only when data changes after initial load
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }
    schedulePush();
  }, [dietMap, workMap, planMods, healthMap, schedulePush]);

  // Push on tab close
  useEffect(() => {
    function onUnload() {
      if (!isGistConfigured()) return;
      pushGist(dietRef.current, workRef.current, modsRef.current, loadTombstones(), healthRef.current).catch(() => {});
    }
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  // ── Manual / Pull-to-refresh handler ─────────────────────────
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setSyncStatus('syncing');
    if (navigator?.vibrate) {
      try { navigator.vibrate(15); } catch {}
    }

    try {
      let currentHealth = healthRef.current;

      // 1. If Google Fit is connected, sync all recent days (steps, distance, speed, time, heart points, activities)
      if (isGoogleFitConnected()) {
        try {
          const fitSummary = await fetchGoogleFitDailySummary(7);
          currentHealth = mergeFitDataIntoHealthMap(healthRef.current, fitSummary);
          saveHealth(currentHealth);
          setHealthMap(currentHealth);
        } catch (fitErr) {
          console.warn('Google Fit refresh sync error:', fitErr);
        }
      }

      // 2. Pull from gist if configured and merge
      if (isGistConfigured()) {
        const gistData = await pullGist();
        if (gistData) {
          const localTombstones = loadTombstones();
          const merged = mergeGistData(dietRef.current, workRef.current, modsRef.current, gistData, localTombstones, currentHealth);
          saveDiet(merged.dietMap);
          saveWork(merged.workMap);
          savePlanMods(merged.planMods);
          saveHealth(merged.health);
          saveTombstones(merged.tombstones);
          setDietMap(merged.dietMap);
          setWorkMap(merged.workMap);
          setPlanMods(merged.planMods);
          setHealthMap(merged.health);
          currentHealth = merged.health;
        }

        // Push back any fresh Google Fit & local updates to Gist
        await pushGist(dietRef.current, workRef.current, modsRef.current, loadTombstones(), currentHealth).catch(() => {});
        setLastSync(new Date().toISOString());
      }

      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 2500);
    } catch {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } finally {
      setTimeout(() => setIsRefreshing(false), 700);
    }
  }, [isRefreshing]);

  // ── Refresh on returning to foreground (Android PWA resume) ──
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [handleRefresh]);

  const targets = computeTargets(dietMap, goal);

  return (
    <div style={{
      maxWidth: 520,
      margin: '0 auto',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0a0f',
    }}>
      <Header
        phase={targets.phase}
        week={targets.week}
        syncStatus={syncStatus}
        lastSync={lastSync}
        onSettingsOpen={() => setShowSettings(true)}
        goal={goal}
        onGoalOpen={() => setShowGoalModal(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      {showGoalModal && (
        <GoalModal
          goal={goal}
          setGoal={setGoal}
          onClose={() => setShowGoalModal(false)}
        />
      )}
      {showSettings && (
        <SyncSettings
          onClose={() => setShowSettings(false)}
          onClearAll={handleClearAll}
          onSyncNow={() => {
            setSyncStatus('syncing');
            pullGist()
              .then(gistData => {
                if (gistData) {
                  const merged = mergeGistData(dietRef.current, workRef.current, modsRef.current, gistData, loadTombstones(), healthRef.current);
                  saveDiet(merged.dietMap); saveWork(merged.workMap); savePlanMods(merged.planMods); saveHealth(merged.health); saveTombstones(merged.tombstones);
                  setDietMap(merged.dietMap); setWorkMap(merged.workMap); setPlanMods(merged.planMods); setHealthMap(merged.health);
                }
                return pushGist(dietRef.current, workRef.current, modsRef.current, loadTombstones(), healthRef.current);
              })
              .then(ok => {
                setSyncStatus(ok ? 'synced' : 'error');
                if (ok) setLastSync(new Date().toISOString());
                setTimeout(() => setSyncStatus('idle'), 2500);
              })
              .catch(() => {
                setSyncStatus('error');
                setTimeout(() => setSyncStatus('idle'), 3000);
              });
          }}
        />
      )}

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {activeTab === 'diet' && (
          <DietTab
            dietMap={dietMap} setDietMap={setDietMap}
            targets={targets} healthMap={healthMap} setHealthMap={setHealthMap}
          />
        )}
        {activeTab === 'workout' && (
          <WorkoutTab
            workMap={workMap} setWorkMap={setWorkMap}
            planMods={planMods} setPlanMods={setPlanMods}
            healthMap={healthMap} setHealthMap={setHealthMap}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab dietMap={dietMap} workMap={workMap} targets={targets} healthMap={healthMap} />
        )}
        {activeTab === 'coach' && (
          <CoachTab
            dietMap={dietMap} setDietMap={setDietMap}
            workMap={workMap} setWorkMap={setWorkMap}
            planMods={planMods} setPlanMods={setPlanMods}
            targets={targets}
            dailyBriefing={dailyBriefing}
            healthMap={healthMap}
            goal={goal}
          />
        )}
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
