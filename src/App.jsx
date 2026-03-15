import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import DietTab from './components/DietTab.jsx';
import WorkoutTab from './components/WorkoutTab.jsx';
import AnalyticsTab from './components/AnalyticsTab.jsx';
import CoachTab from './components/CoachTab.jsx';
import { migrate, loadDiet, loadWork, loadPlanMods, saveDiet, saveWork, savePlanMods } from './engine/storage.js';
import { computeTargets } from './engine/adaptive.js';
import { pullGist, pushGist, mergeGistData, isGistConfigured, getLastSyncTime } from './engine/gistSync.js';
import SyncSettings from './components/SyncSettings.jsx';
import { getDailyBriefing } from './engine/context.js';

const PUSH_DEBOUNCE_MS = 30_000; // push 30s after last change

export default function App() {
  const [activeTab, setActiveTab] = useState('diet');
  const [dietMap, setDietMap] = useState(new Map());
  const [workMap, setWorkMap] = useState(new Map());
  const [planMods, setPlanMods] = useState({});
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSync, setLastSync] = useState(getLastSyncTime());
  const [dailyBriefing, setDailyBriefing] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const pushTimer = useRef(null);
  // Store latest maps in refs so beforeunload can access them without stale closure
  const dietRef = useRef(dietMap);
  const workRef = useRef(workMap);
  const modsRef = useRef(planMods);

  useEffect(() => { dietRef.current = dietMap; }, [dietMap]);
  useEffect(() => { workRef.current = workMap; }, [workMap]);
  useEffect(() => { modsRef.current = planMods; }, [planMods]);

  // ── Initial load ────────────────────────────────────────────
  useEffect(() => {
    migrate();
    let diet = loadDiet();
    let work = loadWork();
    let mods = loadPlanMods();

    setDietMap(diet);
    setWorkMap(work);
    setPlanMods(mods);

    // Pull from gist and merge
    if (isGistConfigured()) {
      setSyncStatus('syncing');
      pullGist()
        .then(gistData => {
          if (gistData) {
            const merged = mergeGistData(diet, work, mods, gistData);
            // Persist merged data locally
            saveDiet(merged.dietMap);
            saveWork(merged.workMap);
            savePlanMods(merged.planMods);
            setDietMap(merged.dietMap);
            setWorkMap(merged.workMap);
            setPlanMods(merged.planMods);
            diet = merged.dietMap;
            work = merged.workMap;
            mods = merged.planMods;
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
    getDailyBriefing(diet, work, targets).then(setDailyBriefing).catch(() => {});
  }, []);

  // ── Debounced push on data changes ──────────────────────────
  const schedulePush = useCallback(() => {
    if (!isGistConfigured()) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      setSyncStatus('syncing');
      const ok = await pushGist(dietRef.current, workRef.current, modsRef.current);
      setSyncStatus(ok ? 'synced' : 'error');
      if (ok) setLastSync(new Date().toISOString());
      setTimeout(() => setSyncStatus('idle'), ok ? 2500 : 4000);
    }, PUSH_DEBOUNCE_MS);
  }, []);

  // Trigger push whenever data changes
  useEffect(() => { schedulePush(); }, [dietMap, workMap, planMods, schedulePush]);

  // Push on tab close
  useEffect(() => {
    function onUnload() {
      if (!isGistConfigured()) return;
      pushGist(dietRef.current, workRef.current, modsRef.current).catch(() => {});
    }
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const targets = computeTargets(dietMap);

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
      />
      {showSettings && (
        <SyncSettings
          onClose={() => setShowSettings(false)}
          onSyncNow={() => {
            setSyncStatus('syncing');
            pullGist()
              .then(gistData => {
                if (gistData) {
                  const merged = mergeGistData(dietRef.current, workRef.current, modsRef.current, gistData);
                  saveDiet(merged.dietMap); saveWork(merged.workMap); savePlanMods(merged.planMods);
                  setDietMap(merged.dietMap); setWorkMap(merged.workMap); setPlanMods(merged.planMods);
                }
                return pushGist(dietRef.current, workRef.current, modsRef.current);
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
          <DietTab dietMap={dietMap} setDietMap={setDietMap} targets={targets} />
        )}
        {activeTab === 'workout' && (
          <WorkoutTab
            workMap={workMap} setWorkMap={setWorkMap}
            planMods={planMods} setPlanMods={setPlanMods}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab dietMap={dietMap} workMap={workMap} targets={targets} />
        )}
        {activeTab === 'coach' && (
          <CoachTab
            dietMap={dietMap} setDietMap={setDietMap}
            workMap={workMap} setWorkMap={setWorkMap}
            planMods={planMods} setPlanMods={setPlanMods}
            targets={targets}
            dailyBriefing={dailyBriefing}
          />
        )}
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
