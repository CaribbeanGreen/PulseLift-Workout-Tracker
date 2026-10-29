/**
 * PulseLift — 2-Day Full-Body 3D Workout Tracker (Day A & Day B)
 * Features:
 * - Interactive 360° 3D Anatomical Ecorché Models with Live Muscle Callout Pins
 * - Interactive Muscle Tag Spotlighting (hover/click any muscle tag to isolate it on the 3D body)
 * - Clinical White vs. Dark Studio toggle on 3D viewports
 * - Set Pills (1, 2, 3) + Dumbbell Weight (kg) & Reps Logging per set
 * - Full localStorage Persistence (live workout state + saved session history)
 * - Sticky Rest & Recovery Timer (90s, 60s, 3m) with Web Audio API 8-Bit Chime & Visual Alert
 */

const STORAGE_STATE_KEY = 'pulselift_workout_state_v1';
const STORAGE_HISTORY_KEY = 'pulselift_workout_history_v1';
const STORAGE_SHADOW_HISTORY_KEY = 'pulselift_workout_history_shadow_v1';
const STORAGE_SNAPSHOTS_KEY = 'pulselift_backup_snapshots_v1';
const WINDOW_NAME_BACKUP_PREFIX = 'PULSELIFT_VAULT_V1:';
const IDB_DB_NAME = 'PulseLiftVaultDB';
const IDB_STORE_NAME = 'vault';

/* ==========================================================================
   2-Day Full-Body Workout Program Data (with 3D Muscle Keys)
   ========================================================================== */
const WORKOUT_PROGRAM = {
  dayA: {
    id: 'dayA',
    name: 'Day A — Squat, Floor Press, Row & Decompress',
    description:
      'Drag any 3D model to orbit 360°, or hover/tap a muscle badge to spotlight that exact muscle on the 3D body.',
    exercises: [
      {
        id: 'goblet-squats',
        order: 'A1',
        name: 'Goblet Squats',
        scheme: '3 × 10–12',
        defaultWeight: 20,
        defaultReps: 12,
        restSeconds: 90,
        restLabel: '90s Compound',
        defaultYaw: 42,
        muscles: [
          { name: 'Quadriceps', key: 'quads', primary: true },
          { name: 'Gluteus Maximus', key: 'glutes', primary: true },
          { name: 'Core / Abs', key: 'core', primary: false },
          { name: 'Upper Back', key: 'upperBack', primary: false }
        ],
        cues: [
          'Cup the top weight plate tight against your sternum with elbows tucked inside knees.',
          'Sit your hips straight down between your heels while keeping your spine tall and chest proud.',
          'Drive evenly through your mid-foot and squeeze glutes at top lockout.'
        ]
      },
      {
        id: 'floor-press',
        order: 'A2',
        name: 'Dumbbell Floor Press',
        scheme: '3 × 8–12',
        defaultWeight: 18,
        defaultReps: 10,
        restSeconds: 60,
        restLabel: '60s Upper',
        defaultYaw: 52,
        muscles: [
          { name: 'Pectoralis Major', key: 'pecs', primary: true },
          { name: 'Triceps Brachii', key: 'triceps', primary: true },
          { name: 'Anterior Delts', key: 'frontDelts', primary: false }
        ],
        cues: [
          'Lie flat on the floor/bench with knees bent and feet firmly planted for lumbar stability.',
          'Tuck elbows at a 45° angle from your ribs; lower under control until triceps gently pause.',
          'Press both dumbbells vertically over mid-chest to full lockout.'
        ]
      },
      {
        id: 'bent-over-rows',
        order: 'A3',
        name: 'Dumbbell Bent-Over Rows',
        scheme: '3 × 10–12',
        defaultWeight: 18,
        defaultReps: 12,
        restSeconds: 90,
        restLabel: '90s Compound',
        defaultYaw: -42,
        muscles: [
          { name: 'Latissimus Dorsi', key: 'lats', primary: true },
          { name: 'Rhomboids & Traps', key: 'upperBack', primary: true },
          { name: 'Posterior Delts', key: 'rearDelts', primary: false },
          { name: 'Biceps Brachii', key: 'biceps', primary: false }
        ],
        cues: [
          'Hinge hips back to a ~45° torso angle with a braced core and flat neutral spine.',
          'Pull the dumbbells in an arc toward your hip pocket (driving elbows past your torso).',
          'Pause 1 second at peak lat contraction, then lower over 2 seconds.'
        ]
      },
      {
        id: 'core-decompression',
        order: 'A4',
        name: 'Core & Post-Workout Decompression',
        scheme: '3 × 60s Rounds',
        defaultWeight: 0,
        defaultReps: 60,
        unitOverride: 'sec',
        restSeconds: 180,
        restLabel: '3m Decompress',
        defaultYaw: 35,
        muscles: [
          { name: 'Transverse Abdominis', key: 'core', primary: true },
          { name: 'Lumbar Spine', key: 'lowerBack', primary: true },
          { name: 'Hip Flexors / Quads', key: 'quads', primary: false }
        ],
        cues: [
          'Perform slow contralateral Deadbugs followed by 90/90 supine decompression.',
          'Keep your lower back gently imprinted into the mat with 4s nasal inhales and 6s exhales.',
          'Allow axial spinal tension to release completely between sets.'
        ]
      }
    ]
  },

  dayB: {
    id: 'dayB',
    name: 'Day B — RDL, Overhead Press, Lunges & Spinal Hang',
    description:
      'Posterior-chain hip hinge, scapular-plane overhead press, unilateral leg stability, and passive overhead spinal traction in 360° 3D.',
    exercises: [
      {
        id: 'rdls',
        order: 'B1',
        name: 'Romanian Deadlifts (RDLs)',
        scheme: '3 × 10–12',
        defaultWeight: 22,
        defaultReps: 12,
        restSeconds: 90,
        restLabel: '90s Compound',
        defaultYaw: -38,
        muscles: [
          { name: 'Hamstrings', key: 'hamstrings', primary: true },
          { name: 'Gluteus Maximus', key: 'glutes', primary: true },
          { name: 'Erector Spinae', key: 'lowerBack', primary: false },
          { name: 'Forearms / Grip', key: 'forearms', primary: false }
        ],
        cues: [
          'Unlock knees to a fixed 15° soft bend and push your hips horizontally straight back.',
          'Keep lats engaged so the dumbbells shave closely down the front of your thighs and shins.',
          'Pause when hamstring stretch peaks, then snap hips forward to stand tall.'
        ]
      },
      {
        id: 'overhead-press',
        order: 'B2',
        name: 'Dumbbell Overhead Press',
        scheme: '3 × 8–12',
        defaultWeight: 14,
        defaultReps: 10,
        restSeconds: 60,
        restLabel: '60s Upper',
        defaultYaw: 50,
        muscles: [
          { name: 'Ant. & Lat. Delts', key: 'frontDelts', primary: true },
          { name: 'Triceps Brachii', key: 'triceps', primary: true },
          { name: 'Upper Pecs', key: 'pecs', primary: false },
          { name: 'Core Stabilizers', key: 'core', primary: false }
        ],
        cues: [
          'Squeeze glutes and brace your ribcage down so your lower back does not arch.',
          'Press dumbbells upward in the scapular plane (~30° forward of shoulders) to full lockout.',
          'Lower under control back to chin/clavicle level before the next rep.'
        ]
      },
      {
        id: 'reverse-lunges',
        order: 'B3',
        name: 'Dumbbell Reverse Lunges',
        scheme: '3 × 10 / leg',
        defaultWeight: 14,
        defaultReps: 10,
        restSeconds: 60,
        restLabel: '60s Lunges',
        defaultYaw: 32,
        muscles: [
          { name: 'Quadriceps', key: 'quads', primary: true },
          { name: 'Glute Maximus', key: 'glutes', primary: true },
          { name: 'Hamstrings', key: 'hamstrings', primary: false }
        ],
        cues: [
          'Hold dumbbells at your sides and step backward into a clean 90/90 knee bend.',
          'Keep a slight 15° forward torso lean over your front thigh to load the front glute and quad.',
          'Drive firmly through your front heel to return smoothly to standing.'
        ]
      },
      {
        id: 'core-spinal-hang',
        order: 'B4',
        name: "Core & Spinal Decompression (No-Bar Alt: Child's Pose Traction)",
        poseId: 'childs-pose-traction',
        scheme: '3 × 45s Holds',
        defaultWeight: 0,
        defaultReps: 45,
        unitOverride: 'sec',
        restSeconds: 180,
        restLabel: '3m Decompress',
        defaultYaw: 38,
        defaultVariantKey: 'childs-pose',
        variants: [
          {
            key: 'childs-pose',
            label: "🧘 No Bar: Child's Pose & Lat Traction",
            name: "Core & Spinal Traction — Child's Pose (No Bar)",
            poseId: 'childs-pose-traction',
            defaultYaw: 38,
            muscles: [
              { name: 'Lumbar Discs (Traction)', key: 'lowerBack', primary: true },
              { name: 'Latissimus Dorsi', key: 'lats', primary: true },
              { name: 'Transverse Abdominis', key: 'core', primary: false }
            ],
            cues: [
              'Kneel on your exercise mat, walk your hands far forward on the floor, and grip the mat with your fingertips.',
              'Sit your hips slowly back toward your heels while pulling back through your hips to traction your lats and lower back.',
              'Breathe deeply into your lower ribs (4s inhale, 6s exhale) to decompress the lumbar spine after RDLs.'
            ]
          },
          {
            key: 'deadbug-9090',
            label: '🛌 No Bar: Supine Dead Bug & 90/90 Release',
            name: 'Core & Lumbar Release — Supine Dead Bug (No Bar)',
            poseId: 'core-decompression',
            defaultYaw: 35,
            muscles: [
              { name: 'Transverse Abdominis', key: 'core', primary: true },
              { name: 'Lumbar Spine', key: 'lowerBack', primary: true },
              { name: 'Hip Flexors / Quads', key: 'quads', primary: false }
            ],
            cues: [
              'Lie flat on the floor mat with knees bent at 90° and lower back gently imprinted into the floor.',
              'Slowly extend opposite arm and leg toward the floor without letting your lumbar spine arch.',
              'Finish each 45s set by hugging both knees toward your chest to gently open the lower-back facet joints.'
            ]
          },
          {
            key: 'bar-hang',
            label: '🏋️ With Bar: Overhead Spinal Dead Hang',
            name: 'Core & Spinal Hang (Overhead Bar)',
            poseId: 'core-spinal-hang',
            defaultYaw: -45,
            muscles: [
              { name: 'Lumbar Discs (Traction)', key: 'lowerBack', primary: true },
              { name: 'Latissimus Dorsi', key: 'lats', primary: true },
              { name: 'Forearm Grip', key: 'forearms', primary: false }
            ],
            cues: [
              'Grip an overhead bar shoulder-width apart (keep toes lightly touching floor if needed).',
              'Relax your hips and lumbar spine so gravity gently elongates and decompresses the lower back.',
              'Take slow, deep lateral ribcage breaths throughout the hang.'
            ]
          }
        ],
        muscles: [
          { name: 'Lumbar Discs (Traction)', key: 'lowerBack', primary: true },
          { name: 'Latissimus Dorsi', key: 'lats', primary: true },
          { name: 'Transverse Abdominis', key: 'core', primary: false }
        ],
        cues: [
          'Kneel on your exercise mat, walk your hands far forward on the floor, and grip the mat with your fingertips.',
          'Sit your hips slowly back toward your heels while pulling back through your hips to traction your lats and lower back.',
          'Breathe deeply into your lower ribs (4s inhale, 6s exhale) to decompress the lumbar spine after RDLs.'
        ]
      }
    ]
  }
};

function getResolvedExerciseData(ex) {
  if (!ex || !ex.variants || !ex.variants.length) return ex;
  const savedVarKey =
    (appState && appState.exercises && appState.exercises[ex.id] && appState.exercises[ex.id].variantKey) ||
    ex.defaultVariantKey ||
    ex.variants[0].key;
  const activeVar = ex.variants.find((v) => v.key === savedVarKey) || ex.variants[0];
  return {
    ...ex,
    activeVariantKey: activeVar.key,
    name: activeVar.name,
    poseId: activeVar.poseId,
    defaultYaw: activeVar.defaultYaw !== undefined ? activeVar.defaultYaw : ex.defaultYaw,
    muscles: activeVar.muscles,
    cues: activeVar.cues
  };
}

/* ==========================================================================
   Application State & LocalStorage Persistence
   ========================================================================== */
const DEFAULT_AVAILABLE_EQUIPMENT = {
  dumbbell: true,
  bodyweight: true,
  pullup_bar: false,
  bench: false,
  bands_cables: false,
  barbell: false,
  kettlebell: false
};

const EQUIPMENT_LABELS = {
  dumbbell: '🏋️ Dumbbells',
  bodyweight: '🤸 Bodyweight / Floor',
  pullup_bar: '🚪 Pull-Up Bar',
  bench: '🛋️ Workout Bench',
  bands_cables: '🎗️ Bands / Cables',
  barbell: '🧱 Barbell',
  kettlebell: '🔔 Kettlebell'
};

function getDefaultRoutineOrder() {
  return {
    dayA: WORKOUT_PROGRAM.dayA.exercises.map((e) => e.id),
    dayB: WORKOUT_PROGRAM.dayB.exercises.map((e) => e.id)
  };
}

function getInitialTwoDaysHistory() {
  return [
    {
      id: 1792911800000,
      dayKey: 'dayB',
      dayTitle: 'Day B Full-Body Routine',
      isoDate: '2026-10-25',
      weekdayIdx: 6,
      timestamp: 'Oct 25, 03:03 PM',
      completedSets: 12,
      totalSets: 12,
      totalVolume: 1080,
      exercises: [
        {
          id: 'rdls',
          name: 'Romanian Deadlifts (RDLs)',
          sets: [
            { completed: true, weight: 20, reps: 10 },
            { completed: true, weight: 20, reps: 10 },
            { completed: true, weight: 20, reps: 10 }
          ]
        },
        {
          id: 'overhead-press',
          name: 'Dumbbell Overhead Press',
          sets: [
            { completed: true, weight: 12, reps: 10 },
            { completed: true, weight: 12, reps: 10 },
            { completed: true, weight: 12, reps: 10 }
          ]
        },
        {
          id: 'reverse-lunges',
          name: 'Dumbbell Reverse Lunges',
          sets: [
            { completed: true, weight: 14, reps: 10 },
            { completed: true, weight: 14, reps: 10 },
            { completed: true, weight: 14, reps: 10 }
          ]
        },
        {
          id: 'core-spinal-hang',
          name: "Child's Pose & Lat Traction (No Bar)",
          sets: [
            { completed: true, weight: 0, reps: 45 },
            { completed: true, weight: 0, reps: 45 },
            { completed: true, weight: 0, reps: 45 }
          ]
        }
      ]
    },
    {
      id: 1792858000000,
      dayKey: 'dayA',
      dayTitle: 'Day A Full-Body Routine',
      isoDate: '2026-10-24',
      weekdayIdx: 5,
      timestamp: 'Oct 24, 04:10 PM',
      completedSets: 12,
      totalSets: 12,
      totalVolume: 1548,
      exercises: [
        {
          id: 'goblet-squats',
          name: 'Goblet Squats',
          sets: [
            { completed: true, weight: 20, reps: 12 },
            { completed: true, weight: 20, reps: 12 },
            { completed: true, weight: 20, reps: 12 }
          ]
        },
        {
          id: 'floor-press',
          name: 'Dumbbell Floor Press',
          sets: [
            { completed: true, weight: 16, reps: 10 },
            { completed: true, weight: 16, reps: 10 },
            { completed: true, weight: 16, reps: 10 }
          ]
        },
        {
          id: 'bent-over-rows',
          name: 'Dumbbell Bent-Over Rows',
          sets: [
            { completed: true, weight: 16, reps: 10 },
            { completed: true, weight: 16, reps: 10 },
            { completed: true, weight: 16, reps: 10 }
          ]
        },
        {
          id: 'core-decompression',
          name: 'Core & Post-Workout Decompression',
          sets: [
            { completed: true, weight: 0, reps: 45 },
            { completed: true, weight: 0, reps: 45 },
            { completed: true, weight: 0, reps: 45 }
          ]
        }
      ]
    }
  ];
}

function isSyntheticDemoEntry(item) {
  if (!item || typeof item !== 'object') return false;
  // Detect old populateDemo4WeekSchedule entries (volumes 2840+idx*65 or 2620+idx*55)
  const vol = Number(item.totalVolume);
  for (let i = 0; i < 12; i++) {
    if (vol === 2840 + i * 65 || vol === 2620 + i * 55) {
      return true;
    }
  }
  return false;
}

function createDefaultState() {
  const exercisesState = {};
  ['dayA', 'dayB'].forEach((dayKey) => {
    WORKOUT_PROGRAM[dayKey].exercises.forEach((ex) => {
      exercisesState[ex.id] = {
        variantKey: ex.defaultVariantKey || null,
        sets: [
          { completed: false, weight: ex.defaultWeight, reps: ex.defaultReps },
          { completed: false, weight: ex.defaultWeight, reps: ex.defaultReps },
          { completed: false, weight: ex.defaultWeight, reps: ex.defaultReps }
        ]
      };
    });
  });

  return {
    activeDay: 'dayA',
    autoStartTimer: true,
    soundEnabled: true,
    planAssistantOpen: false,
    autoDownloadBackupOnLog: false,
    availableEquipment: { ...DEFAULT_AVAILABLE_EQUIPMENT },
    customRoutine: getDefaultRoutineOrder(),
    exercises: exercisesState
  };
}

const backupVaultStatus = {
  diskSynced: false,
  idbSynced: false,
  lastSavedAt: null,
  lastRecoveredCount: 0,
  lastReason: 'Initial Load'
};

let backupSnapshots = loadBackupSnapshots();
let appState = loadAppState();
let workoutHistory = loadWorkoutHistory();

function mergeWorkoutHistories(...historyArrays) {
  const byKey = new Map();
  historyArrays.forEach((arr) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      if (isSyntheticDemoEntry(item)) return;
      const key =
        item.id !== undefined && item.id !== null
          ? String(item.id)
          : `${item.isoDate || ''}_${item.dayKey || ''}_${item.timestamp || ''}`;
      if (!byKey.has(key)) {
        byKey.set(key, item);
      }
    });
  });
  return Array.from(byKey.values())
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
    .slice(0, 120);
}

function loadBackupSnapshots() {
  try {
    const raw = localStorage.getItem(STORAGE_SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function saveBackupSnapshotsList() {
  try {
    localStorage.setItem(STORAGE_SNAPSHOTS_KEY, JSON.stringify(backupSnapshots.slice(0, 15)));
  } catch (err) {
    console.warn('Could not save backup snapshots list:', err);
  }
}

function createBackupSnapshot(reasonLabel = 'Auto-Backup Snapshot', historyOverride = null) {
  const targetHistory = Array.isArray(historyOverride) ? historyOverride : workoutHistory;
  if (!Array.isArray(targetHistory) || targetHistory.length === 0) return null;

  // Avoid duplicate consecutive snapshot if session count and latest ID are identical
  const topSnap = backupSnapshots[0];
  const latestEntryId = targetHistory[0] ? targetHistory[0].id : null;
  if (
    topSnap &&
    topSnap.sessionCount === targetHistory.length &&
    topSnap.latestEntryId === latestEntryId &&
    reasonLabel === 'Auto-Sync'
  ) {
    return topSnap;
  }

  const now = new Date();
  const snap = {
    snapshotId: `snap-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: now.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    createdAtMs: Date.now(),
    reason: reasonLabel,
    sessionCount: targetHistory.length,
    latestEntryId,
    customRoutine: appState && appState.customRoutine ? JSON.parse(JSON.stringify(appState.customRoutine)) : null,
    workoutHistory: JSON.parse(JSON.stringify(targetHistory))
  };

  backupSnapshots.unshift(snap);
  if (backupSnapshots.length > 15) {
    backupSnapshots = backupSnapshots.slice(0, 15);
  }
  saveBackupSnapshotsList();
  return snap;
}

function writeWindowNameVault() {
  try {
    const payload = {
      updatedAtMs: Date.now(),
      appState,
      workoutHistory,
      snapshots: backupSnapshots.slice(0, 5)
    };
    window.name = WINDOW_NAME_BACKUP_PREFIX + JSON.stringify(payload);
  } catch (_) {}
}

function readWindowNameVault() {
  try {
    if (typeof window.name === 'string' && window.name.startsWith(WINDOW_NAME_BACKUP_PREFIX)) {
      const jsonStr = window.name.slice(WINDOW_NAME_BACKUP_PREFIX.length);
      return JSON.parse(jsonStr);
    }
  } catch (_) {}
  return null;
}

function openVaultIndexedDB() {
  return new Promise((resolve) => {
    if (!('indexedDB' in window)) {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(IDB_DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

async function writeVaultIndexedDB() {
  const db = await openVaultIndexedDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put(
        {
          updatedAtMs: Date.now(),
          updatedAt: new Date().toISOString(),
          appState,
          workoutHistory,
          snapshots: backupSnapshots.slice(0, 12)
        },
        'latest'
      );
      tx.oncomplete = () => {
        backupVaultStatus.idbSynced = true;
        resolve(true);
      };
      tx.onerror = () => resolve(false);
    } catch (_) {
      resolve(false);
    }
  });
}

async function readVaultIndexedDB() {
  const db = await openVaultIndexedDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get('latest');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

async function syncBackupToDiskServer(options = {}) {
  try {
    const res = await fetch('./api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: options.reason || 'auto-sync',
        allowEmptyOverwrite: Boolean(options.allowEmptyOverwrite),
        replaceExactHistory: Boolean(options.replaceExactHistory),
        appState,
        workoutHistory,
        snapshots: backupSnapshots.slice(0, 12)
      })
    });
    if (res && res.ok) {
      const data = await res.json();
      backupVaultStatus.diskSynced = true;
      backupVaultStatus.lastSavedAt = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      // If disk had additional historical sessions that weren't in memory yet, merge them seamlessly
      if (
        !options.allowEmptyOverwrite &&
        !options.replaceExactHistory &&
        Array.isArray(data.workoutHistory) &&
        data.workoutHistory.length > workoutHistory.length
      ) {
        workoutHistory = mergeWorkoutHistories(workoutHistory, data.workoutHistory);
        localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(workoutHistory));
        localStorage.setItem(STORAGE_SHADOW_HISTORY_KEY, JSON.stringify(workoutHistory));
        renderHistoryPanel();
      }
      return true;
    }
  } catch (_) {
    backupVaultStatus.diskSynced = false;
  }
  return false;
}

function loadAppState() {
  try {
    let raw = localStorage.getItem(STORAGE_STATE_KEY);
    if (!raw) {
      const winVault = readWindowNameVault();
      if (winVault && winVault.appState) {
        raw = JSON.stringify(winVault.appState);
      }
    }
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    const defaults = createDefaultState();
    const mergedExercises = { ...defaults.exercises };
    if (parsed.exercises) {
      Object.keys(parsed.exercises).forEach((exId) => {
        const savedEx = parsed.exercises[exId];
        if (!savedEx) return;
        const baseSets = mergedExercises[exId]
          ? mergedExercises[exId].sets
          : [
              { completed: false, weight: 12, reps: 10 },
              { completed: false, weight: 12, reps: 10 },
              { completed: false, weight: 12, reps: 10 }
            ];
        mergedExercises[exId] = {
          variantKey: savedEx.variantKey || (mergedExercises[exId] && mergedExercises[exId].variantKey) || null,
          sets: Array.isArray(savedEx.sets)
            ? baseSets.map((defSet, idx) => {
                const savedSet = savedEx.sets[idx];
                if (!savedSet) return defSet;
                return {
                  completed: Boolean(savedSet.completed),
                  weight: savedSet.weight !== undefined ? Number(savedSet.weight) : defSet.weight,
                  reps: savedSet.reps !== undefined ? Number(savedSet.reps) : defSet.reps
                };
              })
            : baseSets
        };
      });
    }
    const defOrder = getDefaultRoutineOrder();
    const customRoutine = {
      dayA:
        parsed.customRoutine && Array.isArray(parsed.customRoutine.dayA) && parsed.customRoutine.dayA.length > 0
          ? parsed.customRoutine.dayA
          : defOrder.dayA,
      dayB:
        parsed.customRoutine && Array.isArray(parsed.customRoutine.dayB) && parsed.customRoutine.dayB.length > 0
          ? parsed.customRoutine.dayB
          : defOrder.dayB
    };
    const availableEquipment = {
      ...DEFAULT_AVAILABLE_EQUIPMENT,
      ...(parsed.availableEquipment && typeof parsed.availableEquipment === 'object'
        ? parsed.availableEquipment
        : {})
    };
    return {
      activeDay: parsed.activeDay === 'dayB' ? 'dayB' : 'dayA',
      autoStartTimer: parsed.autoStartTimer !== undefined ? Boolean(parsed.autoStartTimer) : true,
      soundEnabled: parsed.soundEnabled !== undefined ? Boolean(parsed.soundEnabled) : true,
      planAssistantOpen: Boolean(parsed.planAssistantOpen),
      autoDownloadBackupOnLog: Boolean(parsed.autoDownloadBackupOnLog),
      availableEquipment,
      customRoutine,
      exercises: mergedExercises
    };
  } catch (err) {
    console.warn('Could not load saved workout state, using defaults:', err);
    return createDefaultState();
  }
}

function saveAppState() {
  try {
    localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(appState));
    writeWindowNameVault();
    writeVaultIndexedDB();
    syncBackupToDiskServer({ reason: 'state-update' });
  } catch (err) {
    console.warn('Failed to persist workout state to localStorage:', err);
  }
}

function loadWorkoutHistory() {
  let primaryList = [];
  let shadowList = [];
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) primaryList = parsed.filter((x) => !isSyntheticDemoEntry(x));
    }
  } catch (_) {}

  try {
    const rawShadow = localStorage.getItem(STORAGE_SHADOW_HISTORY_KEY);
    if (rawShadow) {
      const parsedShadow = JSON.parse(rawShadow);
      if (Array.isArray(parsedShadow)) shadowList = parsedShadow.filter((x) => !isSyntheticDemoEntry(x));
    }
  } catch (_) {}

  const winVault = readWindowNameVault();
  const winList =
    winVault && Array.isArray(winVault.workoutHistory)
      ? winVault.workoutHistory.filter((x) => !isSyntheticDemoEntry(x))
      : [];

  const merged = mergeWorkoutHistories(primaryList, shadowList, winList);
  if (merged.length === 0) {
    const twoDaySeed = getInitialTwoDaysHistory();
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(twoDaySeed));
      localStorage.setItem(STORAGE_SHADOW_HISTORY_KEY, JSON.stringify(twoDaySeed));
    } catch (_) {}
    return twoDaySeed;
  }

  return merged;
}

function saveWorkoutHistory(options = {}) {
  const reason = options.reason || 'Auto-Sync';
  const allowEmptyOverwrite = Boolean(options.allowEmptyOverwrite);
  const replaceExactHistory = Boolean(options.replaceExactHistory);

  try {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(workoutHistory));
    if (workoutHistory.length > 0 || allowEmptyOverwrite) {
      localStorage.setItem(STORAGE_SHADOW_HISTORY_KEY, JSON.stringify(workoutHistory));
    }
    if (workoutHistory.length > 0 && reason !== 'silent-merge') {
      createBackupSnapshot(reason);
    }
    backupVaultStatus.lastSavedAt = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    backupVaultStatus.lastReason = reason;
    writeWindowNameVault();
    writeVaultIndexedDB();
    syncBackupToDiskServer({ reason, allowEmptyOverwrite, replaceExactHistory });
  } catch (err) {
    console.warn('Failed to save workout history:', err);
  }
}

async function initAutoBackupAndRecovery(manualTrigger = false) {
  const initialCount = workoutHistory.length;
  let idbData = null;
  let diskData = null;

  try {
    idbData = await readVaultIndexedDB();
    if (idbData) backupVaultStatus.idbSynced = true;
  } catch (_) {}

  try {
    const res = await fetch('./api/backup', { cache: 'no-store' });
    if (res && res.ok) {
      diskData = await res.json();
      backupVaultStatus.diskSynced = true;
    }
  } catch (_) {
    try {
      const fallbackRes = await fetch('./workout-backup.json', { cache: 'no-store' });
      if (fallbackRes && fallbackRes.ok) {
        diskData = await fallbackRes.json();
      }
    } catch (__) {}
  }

  const idbHistory = idbData && Array.isArray(idbData.workoutHistory) ? idbData.workoutHistory : [];
  const diskHistory = diskData && Array.isArray(diskData.workoutHistory) ? diskData.workoutHistory : [];
  const winVault = readWindowNameVault();
  const winHistory = winVault && Array.isArray(winVault.workoutHistory) ? winVault.workoutHistory : [];

  // Merge snapshots from IndexedDB and Disk so restore points are never lost
  const allSnapshotsMap = new Map();
  [
    ...(backupSnapshots || []),
    ...(idbData && Array.isArray(idbData.snapshots) ? idbData.snapshots : []),
    ...(diskData && Array.isArray(diskData.snapshots) ? diskData.snapshots : [])
  ].forEach((s) => {
    if (s && s.snapshotId && Array.isArray(s.workoutHistory)) {
      allSnapshotsMap.set(s.snapshotId, s);
    }
  });
  backupSnapshots = Array.from(allSnapshotsMap.values())
    .sort((a, b) => Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0))
    .slice(0, 15);
  saveBackupSnapshotsList();

  // Also check top snapshot if current workoutHistory is empty
  const topSnapHistory =
    workoutHistory.length === 0 &&
    idbHistory.length === 0 &&
    diskHistory.length === 0 &&
    backupSnapshots[0] &&
    Array.isArray(backupSnapshots[0].workoutHistory)
      ? backupSnapshots[0].workoutHistory
      : [];

  const mergedHistory = mergeWorkoutHistories(
    workoutHistory,
    idbHistory,
    diskHistory,
    winHistory,
    topSnapHistory
  );

  const recoveredDelta = mergedHistory.length - initialCount;
  if (recoveredDelta > 0) {
    workoutHistory = mergedHistory;
    backupVaultStatus.lastRecoveredCount = recoveredDelta;
    saveWorkoutHistory({ reason: 'Auto-Recovered from Vault' });
    renderHistoryPanel();
    showToast(`🛡️ Auto-Recovery: Restored ${recoveredDelta} workout session${recoveredDelta === 1 ? '' : 's'} from Backup Vault!`);
  } else {
    // Ensure current history is backed up to Disk & IndexedDB on startup
    if (workoutHistory.length > 0 && backupSnapshots.length === 0) {
      createBackupSnapshot('Initial Startup Snapshot');
    }
    writeWindowNameVault();
    await writeVaultIndexedDB();
    await syncBackupToDiskServer({ reason: 'startup-sync' });
    renderHistoryPanel();
    if (manualTrigger) {
      showToast(`🛡️ Backup Vault Verified: ${workoutHistory.length} session${workoutHistory.length === 1 ? '' : 's'} synced across Disk, IndexedDB & LocalStorage.`);
    }
  }
}

function exportBackupJsonFile(customPrefix = 'pulselift-workout-backup') {
  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    appState,
    workoutHistory,
    snapshots: backupSnapshots
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${customPrefix}-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function importBackupJsonData(rawJsonString) {
  try {
    const parsed = JSON.parse(rawJsonString);
    const importedHistory = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.workoutHistory)
      ? parsed.workoutHistory
      : [];

    if (importedHistory.length === 0 && !parsed.appState) {
      showToast('⚠️ Selected file does not contain valid PulseLift workout history.');
      return false;
    }

    createBackupSnapshot('Pre-Import Safety Backup');
    workoutHistory = mergeWorkoutHistories(workoutHistory, importedHistory);

    if (parsed.appState && typeof parsed.appState === 'object') {
      if (parsed.appState.customRoutine) {
        appState.customRoutine = parsed.appState.customRoutine;
      }
      if (parsed.appState.exercises) {
        appState.exercises = { ...appState.exercises, ...parsed.appState.exercises };
      }
      saveAppState();
      updateHeaderAndStats();
      renderExerciseCards();
    }

    saveWorkoutHistory({ reason: `Imported Backup (${importedHistory.length} sessions)` });
    renderHistoryPanel();
    showToast(`✅ Restored & merged ${importedHistory.length} workout sessions from backup file!`);
    return true;
  } catch (err) {
    showToast('⚠️ Could not parse backup JSON file.');
    return false;
  }
}

function restoreFromSnapshot(snapshotId) {
  const snap = backupSnapshots.find((s) => s.snapshotId === snapshotId);
  if (!snap || !Array.isArray(snap.workoutHistory)) {
    showToast('⚠️ Snapshot not found.');
    return;
  }
  if (workoutHistory.length > 0) {
    createBackupSnapshot('Pre-Restore Safety Backup');
  }
  workoutHistory = JSON.parse(JSON.stringify(snap.workoutHistory));
  if (snap.customRoutine) {
    appState.customRoutine = JSON.parse(JSON.stringify(snap.customRoutine));
    saveAppState();
    updateHeaderAndStats();
    renderExerciseCards();
  }
  saveWorkoutHistory({
    reason: `Restored Snapshot (${snap.createdAt})`,
    replaceExactHistory: true
  });
  renderHistoryPanel();
  showToast(`🛡️ Restored ${workoutHistory.length} sessions from snapshot (${snap.createdAt})!`);
}

// Listen for Service Worker updates or page unload to immediately flush all backup layers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_UPDATED') {
      writeWindowNameVault();
      writeVaultIndexedDB();
      syncBackupToDiskServer({ reason: 'pre-sw-update-flush' });
    }
  });
}

window.addEventListener('beforeunload', () => {
  writeWindowNameVault();
});

/* ==========================================================================
   Web Audio API — 8-Bit Retro Chime & Sound Effects
   ========================================================================== */
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function play8BitTimerChime() {
  if (!appState.soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, start: 0.0, duration: 0.11, type: 'square' },
    { freq: 659.25, start: 0.12, duration: 0.11, type: 'square' },
    { freq: 783.99, start: 0.24, duration: 0.11, type: 'square' },
    { freq: 1046.5, start: 0.36, duration: 0.18, type: 'square' },
    { freq: 783.99, start: 0.56, duration: 0.12, type: 'square' },
    { freq: 1046.5, start: 0.7, duration: 0.38, type: 'square' }
  ];

  notes.forEach((n) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type;
    osc.frequency.setValueAtTime(n.freq, now + n.start);

    gain.gain.setValueAtTime(0.0001, now + n.start);
    gain.gain.linearRampToValueAtTime(0.18, now + n.start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + n.start);
    osc.stop(now + n.start + n.duration + 0.02);
  });
}

function playSetCompleteBlip(isCompleted) {
  if (!appState.soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  if (isCompleted) {
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.06);
  } else {
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(329.63, now + 0.06);
  }

  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

/* ==========================================================================
   DOM References & UI Rendering
   ========================================================================== */
const tabDayA = document.getElementById('tabDayA');
const tabDayB = document.getElementById('tabDayB');
const tabDayAProgress = document.getElementById('tabDayAProgress');
const tabDayBProgress = document.getElementById('tabDayBProgress');
const activeDayHeading = document.getElementById('activeDayHeading');
const activeDayDesc = document.getElementById('activeDayDesc');
const setsCompletedStat = document.getElementById('setsCompletedStat');
const dayVolumeStat = document.getElementById('dayVolumeStat');
const dayProgressBar = document.getElementById('dayProgressBar');
const autoStartTimerCheckbox = document.getElementById('autoStartTimerCheckbox');
const workoutContainer = document.getElementById('workoutContainer');
const resetDayBtn = document.getElementById('resetDayBtn');
const logWorkoutBtn = document.getElementById('logWorkoutBtn');
const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
const historyDrawer = document.getElementById('historyDrawer');
const historyList = document.getElementById('historyList');
const historyCountBadge = document.getElementById('historyCountBadge');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const toastBanner = document.getElementById('toastBanner');

let toastTimeout = null;
function showToast(message) {
  toastBanner.textContent = message;
  toastBanner.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastBanner.classList.remove('show');
  }, 2600);
}

const togglePlanAssistantBtn = document.getElementById('togglePlanAssistantBtn');
const moderateCoachWidget = document.getElementById('moderateCoachWidget');

/* ==========================================================================
   Smart Moderate Workout Coach & Day A/B Rearranger Engine
   ========================================================================== */
function findRawExerciseById(exId) {
  for (const dKey of ['dayA', 'dayB']) {
    const found = WORKOUT_PROGRAM[dKey].exercises.find((x) => x.id === exId);
    if (found) return found;
  }
  if (typeof EXERCISE_LIBRARY_DATA !== 'undefined') {
    const lib = EXERCISE_LIBRARY_DATA.find((x) => x.id === exId);
    if (lib) {
      const isTimeBased = /s\s+(hold|round|walk|carry)/i.test(lib.prescription || '');
      return {
        id: lib.id,
        order: lib.order,
        name: lib.name,
        poseId: lib.poseId || lib.id,
        scheme: lib.prescription || '3 × 10–12',
        defaultWeight: lib.category === 'bodyweight' || isTimeBased ? 0 : 12,
        defaultReps: isTimeBased ? 45 : 10,
        unitOverride: isTimeBased ? 'sec' : undefined,
        restSeconds: lib.mechanic === 'Compound' ? 90 : lib.mechanic === 'Core & Mobility' ? 120 : 60,
        restLabel: lib.mechanic === 'Compound' ? '90s Compound' : '60s Moderate',
        defaultYaw: 40,
        muscles: lib.muscleDetails || [],
        cues: lib.cues || [],
        primaryMuscles: lib.primaryMuscles || [],
        secondaryMuscles: lib.secondaryMuscles || [],
        mechanic: lib.mechanic || 'Compound',
        difficulty: lib.difficulty || 'Beginner'
      };
    }
  }
  return null;
}

function ensureExerciseState(ex) {
  if (!appState.exercises[ex.id]) {
    appState.exercises[ex.id] = {
      variantKey: ex.defaultVariantKey || null,
      sets: [
        { completed: false, weight: ex.defaultWeight ?? 12, reps: ex.defaultReps ?? 10 },
        { completed: false, weight: ex.defaultWeight ?? 12, reps: ex.defaultReps ?? 10 },
        { completed: false, weight: ex.defaultWeight ?? 12, reps: ex.defaultReps ?? 10 }
      ]
    };
  }
  return appState.exercises[ex.id];
}

function getDayExercises(dayKey) {
  const prefix = dayKey === 'dayA' ? 'A' : 'B';
  const orderList =
    appState.customRoutine && Array.isArray(appState.customRoutine[dayKey]) && appState.customRoutine[dayKey].length > 0
      ? appState.customRoutine[dayKey]
      : WORKOUT_PROGRAM[dayKey].exercises.map((e) => e.id);

  const resolvedList = [];
  orderList.forEach((exId, idx) => {
    const raw = findRawExerciseById(exId);
    if (!raw) return;
    ensureExerciseState(raw);
    const resolved = getResolvedExerciseData(raw);
    resolvedList.push({
      ...resolved,
      order: `${prefix}${idx + 1}`,
      slotIndex: idx
    });
  });
  return resolvedList;
}

/**
 * Classifies an exercise into one of the 4 Moderate Full-Body Pillars:
 * - 'legs' (Lower Body: Quads / Glutes / Hamstrings / Calves)
 * - 'push' (Upper Push: Chest / Front & Side Delts / Triceps)
 * - 'pull' (Upper Pull: Lats / Upper Back / Rear Delts / Biceps)
 * - 'core' (Core & Spinal Decompression / Mobility)
 */
function classifyExercisePillar(ex) {
  const id = (ex.id || '').toLowerCase();
  if (
    id.includes('decompress') ||
    id.includes('spinal-hang') ||
    id.includes('plank') ||
    id.includes('deadbug') ||
    id.includes('bird-dog') ||
    id.includes('twist') ||
    id.includes('crunch') ||
    id.includes('rollout') ||
    ex.unitOverride === 'sec'
  ) {
    return { key: 'core', label: '🧘 Core & Decompress', sequenceRank: 4, spinalLoad: 0.2 };
  }

  const primaryKeys = (ex.muscles || []).filter((m) => m.primary).map((m) => m.key);
  const allKeys = (ex.muscles || []).map((m) => m.key);
  const hasAny = (keys, targets) => keys.some((k) => targets.includes(k));

  if (hasAny(primaryKeys, ['quads', 'glutes', 'hamstrings', 'calves'])) {
    const isHeavyHingeOrSquat =
      id.includes('squat') || id.includes('rdl') || id.includes('deadlift') || id.includes('swing');
    return {
      key: 'legs',
      label: '🦵 Lower Body',
      sequenceRank: 1,
      spinalLoad: isHeavyHingeOrSquat ? 1.2 : 0.85
    };
  }
  if (hasAny(primaryKeys, ['pecs', 'frontDelts', 'sideDelts', 'triceps'])) {
    const isCompoundPush = !id.includes('fly') && !id.includes('raise') && !id.includes('tricep');
    return {
      key: 'push',
      label: '🫸 Upper Push',
      sequenceRank: isCompoundPush ? 2 : 3,
      spinalLoad: id.includes('overhead') ? 0.8 : 0.45
    };
  }
  if (hasAny(primaryKeys, ['lats', 'upperBack', 'rearDelts', 'biceps', 'forearms'])) {
    const isCompoundPull = !id.includes('curl') && !id.includes('face-pull') && !id.includes('shrug');
    return {
      key: 'pull',
      label: '🫷 Upper Pull',
      sequenceRank: isCompoundPull ? 2 : 3,
      spinalLoad: id.includes('row') ? 0.9 : 0.45
    };
  }
  if (hasAny(allKeys, ['core', 'lowerBack'])) {
    return { key: 'core', label: '🧘 Core & Decompress', sequenceRank: 4, spinalLoad: 0.25 };
  }
  return { key: 'push', label: '🫸 Upper Push', sequenceRank: 2, spinalLoad: 0.5 };
}

/**
 * Determines what equipment an exercise (or its active variant) requires.
 * Returns one of: 'dumbbell' | 'bodyweight' | 'pullup_bar' | 'bench' | 'bands_cables' | 'barbell' | 'kettlebell'
 */
function getExerciseEquipmentKey(exOrId) {
  const ex = typeof exOrId === 'string' ? findRawExerciseById(exOrId) : exOrId;
  if (!ex) return 'bodyweight';
  const id = (ex.id || '').toLowerCase();

  // Check B4 Core & Spinal Hang active variant
  if (id === 'core-spinal-hang') {
    const st = appState && appState.exercises && appState.exercises['core-spinal-hang'];
    const vKey = (st && st.variantKey) || ex.activeVariantKey || ex.defaultVariantKey || 'childs-pose';
    return vKey === 'dead-hang' ? 'pullup_bar' : 'bodyweight';
  }
  if (id === 'core-decompression') return 'bodyweight';
  if (id.includes('pullup') || id.includes('chinup') || id.includes('hanging') || id.includes('muscle-up')) {
    return 'pullup_bar';
  }
  if (id.includes('bench') || id.includes('incline') || id.includes('decline') || id.includes('preacher') || id.includes('pullover') || id.includes('chest-supported') || id.includes('stepup')) {
    return 'bench';
  }
  if (
    id === 'goblet-squats' ||
    id === 'floor-press' ||
    id === 'bent-over-rows' ||
    id === 'rdls' ||
    id === 'overhead-press' ||
    id === 'reverse-lunges' ||
    id.startsWith('db-')
  ) {
    return 'dumbbell';
  }
  if (id.startsWith('bb-')) return 'barbell';
  if (id.startsWith('kb-')) return 'kettlebell';
  if (id.startsWith('bw-')) return 'bodyweight';
  if (id.includes('cable') || id.includes('face-pull') || id.includes('pulldown') || id.includes('band') || id.includes('pallof') || id.includes('pushdown') || id.includes('pullthrough')) {
    return 'bands_cables';
  }
  return 'bodyweight';
}

function isExerciseDoableWithUserEquipment(exOrId) {
  const eq = (appState && appState.availableEquipment) || DEFAULT_AVAILABLE_EQUIPMENT;
  const reqKey = getExerciseEquipmentKey(exOrId);
  if (reqKey === 'bench') {
    return Boolean(eq.bench && (eq.dumbbell || eq.barbell));
  }
  return Boolean(eq[reqKey]);
}

function getEquipmentAwareQuickAddPool() {
  const eq = (appState && appState.availableEquipment) || DEFAULT_AVAILABLE_EQUIPMENT;
  const fullCatalog = [
    // Lower Body
    { id: 'goblet-squats', pillar: 'legs', req: 'dumbbell', name: 'Goblet Squats', label: '🦵 Goblet Squats (Dumbbell)' },
    { id: 'rdls', pillar: 'legs', req: 'dumbbell', name: 'Romanian Deadlifts', label: '🦵 Romanian Deadlifts (Dumbbell)' },
    { id: 'reverse-lunges', pillar: 'legs', req: 'dumbbell', name: 'Dumbbell Reverse Lunges', label: '🦵 Dumbbell Reverse Lunges' },
    { id: 'db-sumo-squat', pillar: 'legs', req: 'dumbbell', name: 'Dumbbell Sumo Squat', label: '🦵 Dumbbell Sumo Squat' },
    { id: 'db-calf-raise', pillar: 'legs', req: 'dumbbell', name: 'Standing Dumbbell Calf Raise', label: '🦵 Standing Dumbbell Calf Raise' },
    { id: 'bw-squat', pillar: 'legs', req: 'bodyweight', name: 'Bodyweight Air Squat', label: '🦵 Bodyweight Air Squat (No Equip)' },
    { id: 'bw-walking-lunge', pillar: 'legs', req: 'bodyweight', name: 'Bodyweight Walking Lunges', label: '🦵 Bodyweight Walking Lunges (No Equip)' },
    { id: 'bw-glute-bridge', pillar: 'legs', req: 'bodyweight', name: 'Floor Glute Bridge', label: '🦵 Floor Glute Bridge (No Equip)' },
    { id: 'bw-calf-raise', pillar: 'legs', req: 'bodyweight', name: 'Bodyweight Calf Raises', label: '🦵 Bodyweight Calf Raises (No Equip)' },
    { id: 'bb-back-squat', pillar: 'legs', req: 'barbell', name: 'Barbell Back Squat', label: '🦵 Barbell Back Squat (Barbell)' },
    { id: 'bb-rdl', pillar: 'legs', req: 'barbell', name: 'Barbell Romanian Deadlift', label: '🦵 Barbell RDL (Barbell)' },
    { id: 'kb-swing', pillar: 'legs', req: 'kettlebell', name: 'Two-Hand Kettlebell Swing', label: '🦵 Kettlebell Swing (Kettlebell)' },
    { id: 'kb-goblet-squat', pillar: 'legs', req: 'kettlebell', name: 'Kettlebell Goblet Squat', label: '🦵 Kettlebell Goblet Squat' },

    // Upper Push
    { id: 'floor-press', pillar: 'push', req: 'dumbbell', name: 'Dumbbell Floor Press', label: '🫸 Dumbbell Floor Press (No Bench)' },
    { id: 'overhead-press', pillar: 'push', req: 'dumbbell', name: 'Dumbbell Overhead Press', label: '🫸 Dumbbell Overhead Press' },
    { id: 'db-lateral-raise', pillar: 'push', req: 'dumbbell', name: 'Dumbbell Lateral Raises', label: '🫸 Dumbbell Lateral Raises' },
    { id: 'db-arnold-press', pillar: 'push', req: 'dumbbell', name: 'Seated / Standing Arnold Press', label: '🫸 Dumbbell Arnold Press' },
    { id: 'db-tricep-overhead', pillar: 'push', req: 'dumbbell', name: 'Overhead Dumbbell Tricep Extension', label: '🫸 Dumbbell Overhead Tricep Extension' },
    { id: 'db-bench-press', pillar: 'push', req: 'bench', name: 'Flat Dumbbell Bench Press', label: '🫸 Flat Dumbbell Bench Press (Bench)' },
    { id: 'bw-pushup', pillar: 'push', req: 'bodyweight', name: 'Classic Floor Push-Ups', label: '🫸 Classic Floor Push-Ups (No Equip)' },
    { id: 'bw-pike-pushup', pillar: 'push', req: 'bodyweight', name: 'Pike Shoulder Push-Ups', label: '🫸 Pike Shoulder Push-Ups (No Equip)' },
    { id: 'bw-diamond-pushup', pillar: 'push', req: 'bodyweight', name: 'Diamond Tricep Push-Ups', label: '🫸 Diamond Tricep Push-Ups (No Equip)' },
    { id: 'bb-overhead-press', pillar: 'push', req: 'barbell', name: 'Standing Barbell Overhead Press', label: '🫸 Barbell Overhead Press (Barbell)' },
    { id: 'kb-clean-press', pillar: 'push', req: 'kettlebell', name: 'Kettlebell Clean & Press', label: '🫸 Kettlebell Clean & Press' },

    // Upper Pull
    { id: 'bent-over-rows', pillar: 'pull', req: 'dumbbell', name: 'Dumbbell Bent-Over Rows', label: '🫷 Dumbbell Bent-Over Rows' },
    { id: 'db-single-arm-row', pillar: 'pull', req: 'dumbbell', name: 'Single-Arm Staggered Dumbbell Row', label: '🫷 Single-Arm Dumbbell Row (No Bench)' },
    { id: 'db-bicep-curl', pillar: 'pull', req: 'dumbbell', name: 'Dumbbell Supinating Bicep Curls', label: '🫷 Dumbbell Supinating Bicep Curls' },
    { id: 'db-hammer-curl', pillar: 'pull', req: 'dumbbell', name: 'Dumbbell Neutral-Grip Hammer Curls', label: '🫷 Dumbbell Hammer Curls' },
    { id: 'db-rear-delt-fly', pillar: 'pull', req: 'dumbbell', name: 'Bent-Over Dumbbell Rear Delt Fly', label: '🫷 Dumbbell Rear Delt Fly' },
    { id: 'db-shrug', pillar: 'pull', req: 'dumbbell', name: 'Standing Dumbbell Shrugs', label: '🫷 Standing Dumbbell Shrugs' },
    { id: 'bw-superman', pillar: 'pull', req: 'bodyweight', name: 'Prone Floor Back & Rear-Delt Raise', label: '🫷 Prone Floor Back & Rear-Delt Raise (No Equip)' },
    { id: 'bw-inverted-row', pillar: 'pull', req: 'bodyweight', name: 'Bodyweight Inverted Row (Sturdy Table)', label: '🫷 Bodyweight Inverted Row (No Equip)' },
    { id: 'bw-pullup', pillar: 'pull', req: 'pullup_bar', name: 'Overhand Pull-Ups', label: '🫷 Overhand Pull-Ups (Pull-Up Bar)' },
    { id: 'bw-chinup', pillar: 'pull', req: 'pullup_bar', name: 'Underhand Chin-Ups', label: '🫷 Underhand Chin-Ups (Pull-Up Bar)' },
    { id: 'other-face-pull', pillar: 'pull', req: 'bands_cables', name: 'Band / Cable Face Pulls', label: '🫷 Band / Cable Face Pulls (Band/Cable)' },
    { id: 'other-band-pullapart', pillar: 'pull', req: 'bands_cables', name: 'Resistance Band Pull-Aparts', label: '🫷 Resistance Band Pull-Aparts (Band)' },
    { id: 'bb-bent-row', pillar: 'pull', req: 'barbell', name: 'Barbell Bent-Over Row', label: '🫷 Barbell Bent-Over Row (Barbell)' },
    { id: 'kb-gorilla-row', pillar: 'pull', req: 'kettlebell', name: 'Alternating Kettlebell Gorilla Rows', label: '🫷 Kettlebell Gorilla Rows' },

    // Core & Decompression
    { id: 'core-decompression', pillar: 'core', req: 'bodyweight', name: 'Core & Supine 90/90 Decompression', label: '🧘 Core & Supine 90/90 Decompression (Floor)' },
    { id: 'core-spinal-hang', pillar: 'core', req: 'bodyweight', name: "Child's Pose & Lat Traction (No Bar)", label: "🧘 Child's Pose & Lat Traction (Floor · No Bar)" },
    { id: 'bw-plank', pillar: 'core', req: 'bodyweight', name: 'Forearm RKC Plank', label: '🧘 Forearm RKC Plank (Floor)' },
    { id: 'bw-dead-bug', pillar: 'core', req: 'bodyweight', name: 'Contralateral Dead Bug', label: '🧘 Contralateral Dead Bug (Floor)' },
    { id: 'bw-bird-dog', pillar: 'core', req: 'bodyweight', name: 'Quadruped Bird-Dog', label: '🧘 Quadruped Bird-Dog (Floor)' }
  ];

  const filtered = fullCatalog.filter((item) => {
    if (item.req === 'bench') return Boolean(eq.bench && (eq.dumbbell || eq.barbell));
    return Boolean(eq[item.req]);
  });

  // Always guarantee at least floor/bodyweight options if user unchecked everything
  return filtered.length > 0 ? filtered : fullCatalog.filter((item) => item.req === 'bodyweight');
}

function getBestPillarRecommendation(pillarKey, dayKey) {
  const pool = getEquipmentAwareQuickAddPool().filter((x) => x.pillar === pillarKey);
  if (pool.length === 0) {
    return { recId: 'bw-squat', recName: 'Bodyweight Exercise' };
  }
  const currentIds = new Set([
    ...((appState.customRoutine && appState.customRoutine.dayA) || []),
    ...((appState.customRoutine && appState.customRoutine.dayB) || [])
  ]);
  const unused = pool.find((x) => !currentIds.has(x.id));
  const chosen = unused || (dayKey === 'dayB' && pool[1] ? pool[1] : pool[0]);
  return { recId: chosen.id, recName: chosen.name };
}

/**
 * Evaluates a Day's routine specifically for a MODERATE, SUSTAINABLE Full-Body Plan
 * AND verifies that every exercise matches the user's available equipment.
 */
function evaluateModeratePlan(dayKey) {
  const exercises = getDayExercises(dayKey);
  const count = exercises.length;
  const totalSets = count * 3;
  const estMinutes = Math.round(count * 9.5);

  const recLegs = getBestPillarRecommendation('legs', dayKey);
  const recPush = getBestPillarRecommendation('push', dayKey);
  const recPull = getBestPillarRecommendation('pull', dayKey);
  const recCore = getBestPillarRecommendation('core', dayKey);

  const pillars = {
    legs: { label: '🦵 Lower Body', count: 0, recId: recLegs.recId, recName: recLegs.recName },
    push: { label: '🫸 Upper Push', count: 0, recId: recPush.recId, recName: recPush.recName },
    pull: { label: '🫷 Upper Pull', count: 0, recId: recPull.recId, recName: recPull.recName },
    core: { label: '🧘 Core / Decompress', count: 0, recId: recCore.recId, recName: recCore.recName }
  };

  let totalSpinalLoad = 0;
  const equipmentMismatches = [];

  const classified = exercises.map((ex, index) => {
    const info = classifyExercisePillar(ex);
    if (pillars[info.key]) pillars[info.key].count += 1;
    totalSpinalLoad += info.spinalLoad;

    const reqEquip = getExerciseEquipmentKey(ex);
    const doable = isExerciseDoableWithUserEquipment(ex);
    if (!doable) {
      const replacement = getBestPillarRecommendation(info.key, dayKey);
      equipmentMismatches.push({
        index,
        exId: ex.id,
        exName: ex.name,
        reqKey: reqEquip,
        reqLabel: EQUIPMENT_LABELS[reqEquip] || reqEquip,
        replacementId: replacement.recId,
        replacementName: replacement.recName
      });
    }

    return { ex, index, reqEquip, doable, ...info };
  });

  // Check if sequence is optimal (rank should be non-decreasing: Legs(1) -> Push/Pull(2) -> Isolation(3) -> Core/Decompress(4))
  let isSequenceOptimal = true;
  let sequenceIssueText = '';
  for (let i = 0; i < classified.length - 1; i++) {
    if (classified[i].sequenceRank > classified[i + 1].sequenceRank) {
      isSequenceOptimal = false;
      if (classified[i].key === 'core') {
        sequenceIssueText = `Move "${classified[i].ex.name}" to the end (#${count}) so you don't pre-fatigue your core stabilizer muscles before "${classified[i + 1].ex.name}".`;
      } else if (classified[i + 1].key === 'legs' && classified[i].key !== 'legs') {
        sequenceIssueText = `Put "${classified[i + 1].ex.name}" earlier (#1) while your legs and lower-back bracing are freshest.`;
      } else {
        sequenceIssueText = `Put heavy compound lifts before smaller isolation/core exercises for better energy and joint safety.`;
      }
      break;
    }
  }

  const missingPillars = Object.entries(pillars)
    .filter(([, p]) => p.count === 0)
    .map(([k, p]) => ({ key: k, ...p }));

  const overloadedPillars = Object.entries(pillars)
    .filter(([, p]) => p.count >= 3)
    .map(([, p]) => p.label);

  const tips = [];
  let statusLevel = 'sweet-spot'; // 'sweet-spot' | 'caution' | 'hardcore-warning'
  let badgeText = '✅ SWEET SPOT · MODERATE & SUSTAINABLE';
  let summaryText = `Ideal moderate load (${count} exercises · ${totalSets} sets · ~${estMinutes} mins). Every exercise matches your selected equipment!`;

  if (equipmentMismatches.length > 0) {
    statusLevel = 'caution';
    badgeText = '🛠️ EQUIPMENT MISMATCH DETECTED';
    equipmentMismatches.forEach((m) => {
      tips.push(
        `Equipment Alert: "${m.exName}" requires ${m.reqLabel} (which you unchecked above). Click "🔄 Swap to Available Equipment" to replace it with "${m.replacementName}".`
      );
    });
  }

  if (count > 5 || totalSets > 15 || totalSpinalLoad > 3.6) {
    statusLevel = 'hardcore-warning';
    badgeText = '⚠️ OVER MODERATE LIMIT · GETTING HARDCORE';
    summaryText = `This day has ${count} exercises (${totalSets} sets, ~${estMinutes} mins). For a moderate full-body plan, 4–5 exercises (12–15 sets) is the upper limit before recovery & form quality drop.`;
    tips.push(
      `Trim ${count - 5 > 0 ? count - 5 : 1} exercise(s) or move one to ${dayKey === 'dayA' ? 'Day B' : 'Day A'} to stay in the 12–15 set Moderate Sweet Spot.`
    );
  } else if (count < 3) {
    statusLevel = 'caution';
    badgeText = '💡 LIGHT / EXPRESS SESSION';
    summaryText = `Currently ${count} exercise(s) (${totalSets} sets, ~${estMinutes} mins). Great for a quick recovery day, or add ${4 - count} more for a complete 4-pillar moderate workout.`;
  }

  if (overloadedPillars.length > 0) {
    if (statusLevel === 'sweet-spot') statusLevel = 'caution';
    tips.push(
      `High overlap on ${overloadedPillars.join(', ')} (3+ exercises). On a moderate full-body plan, 1–2 exercises per movement pattern prevents local joint overuse.`
    );
  }

  if (missingPillars.length > 0) {
    if (statusLevel === 'sweet-spot') {
      statusLevel = 'caution';
      badgeText = '💡 MODERATE LOAD · MISSING MOVEMENT PILLAR';
    }
    tips.push(
      `Missing ${missingPillars.map((m) => m.label).join(' & ')} on ${dayKey === 'dayA' ? 'Day A' : 'Day B'}. Click a "+ Add" pill below (filtered to your equipment) to balance all 4 full-body pillars.`
    );
  }

  if (!isSequenceOptimal && sequenceIssueText) {
    if (statusLevel === 'sweet-spot') {
      statusLevel = 'caution';
      badgeText = '💡 GOOD MODERATE VOLUME · ORDER TIP';
    }
    tips.push(`Order Suggestion: ${sequenceIssueText}`);
  }

  if (tips.length === 0) {
    tips.push(
      'Sequence & Equipment Check Passed: Compound Lower Body first → Upper Push & Pull in the middle → Core & Spinal Decompression last, using only your available equipment.'
    );
  }

  // Load meter percentage (4 exercises / 12 sets = 72% right inside the 60%–85% Moderate Sweet Spot)
  const loadPct = Math.min(100, Math.round((count / 6) * 85 + (totalSpinalLoad / 4.2) * 15));

  return {
    dayKey,
    count,
    totalSets,
    estMinutes,
    loadPct,
    statusLevel,
    badgeText,
    summaryText,
    pillars,
    missingPillars,
    equipmentMismatches,
    isSequenceOptimal,
    tips,
    classified
  };
}

function renderModerateCoachWidget() {
  if (!moderateCoachWidget) return;
  const dayKey = appState.activeDay;
  const evalA = evaluateModeratePlan('dayA');
  const evalB = evaluateModeratePlan('dayB');
  const cur = dayKey === 'dayA' ? evalA : evalB;

  if (togglePlanAssistantBtn) {
    togglePlanAssistantBtn.classList.toggle('active', Boolean(appState.planAssistantOpen));
  }

  const eq = (appState && appState.availableEquipment) || DEFAULT_AVAILABLE_EQUIPMENT;
  const equipPillsHtml = Object.entries(EQUIPMENT_LABELS)
    .map(([eqKey, eqLabel]) => {
      const isChecked = Boolean(eq[eqKey]);
      return `
        <button
          type="button"
          class="lib-filter-pill equip-selector-pill ${isChecked ? 'active' : ''}"
          data-action="toggle-user-equipment"
          data-equip-key="${eqKey}"
          aria-pressed="${isChecked}"
          title="Toggle whether you have ${eqLabel}"
        >
          <span>${isChecked ? '✓' : '+'}</span>
          <span>${eqLabel}</span>
        </button>
      `;
    })
    .join('');

  const pillarChipsHtml = Object.entries(cur.pillars)
    .map(([, p]) => {
      const covered = p.count > 0;
      const overloaded = p.count >= 3;
      return `
        <div class="coach-pillar-chip ${covered ? (overloaded ? 'pillar-over' : 'pillar-ok') : 'pillar-missing'}">
          <span>${p.label}</span>
          <strong>${covered ? `${p.count}× ✓` : 'Missing'}</strong>
          ${
            !covered
              ? `<button type="button" class="coach-quick-add-btn" data-action="coach-add-exercise" data-day="${dayKey}" data-ex-id="${p.recId}" title="Add ${p.recName} (Matches your equipment)">+ Add ${p.recName}</button>`
              : ''
          }
        </div>
      `;
    })
    .join('');

  const tipsHtml = cur.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('');

  // Quick-add options strictly filtered to the user's selected equipment!
  const quickAddPool = getEquipmentAwareQuickAddPool();

  const buildDayBuilderColumn = (dKey, dLabel, dEval) => {
    const otherDay = dKey === 'dayA' ? 'dayB' : 'dayA';
    const otherLabel = dKey === 'dayA' ? 'Day B' : 'Day A';
    const rows = dEval.classified
      .map(
        (item, idx) => `
        <div class="builder-ex-row ${!item.doable ? 'builder-row-mismatch' : ''}">
          <div class="builder-ex-left">
            <span class="builder-order-tag">${dKey === 'dayA' ? 'A' : 'B'}${idx + 1}</span>
            <div>
              <div class="builder-ex-name">
                ${escapeHtml(item.ex.name)}
                ${!item.doable ? `<span class="equip-mismatch-tag" title="Requires ${EQUIPMENT_LABELS[item.reqEquip] || item.reqEquip}">⚠️ No ${EQUIPMENT_LABELS[item.reqEquip] || item.reqEquip}</span>` : ''}
              </div>
              <div class="builder-ex-meta">${item.label} · ${escapeHtml(item.ex.scheme)}</div>
            </div>
          </div>
          <div class="builder-ex-actions">
            <button type="button" class="builder-icon-btn" data-action="move-ex-up" data-day="${dKey}" data-index="${idx}" ${idx === 0 ? 'disabled' : ''} title="Move Up earlier in workout">↑</button>
            <button type="button" class="builder-icon-btn" data-action="move-ex-down" data-day="${dKey}" data-index="${idx}" ${idx === dEval.classified.length - 1 ? 'disabled' : ''} title="Move Down later in workout">↓</button>
            <button type="button" class="builder-icon-btn" data-action="transfer-ex-day" data-from-day="${dKey}" data-index="${idx}" title="Move to ${otherLabel}">⇄ ${otherLabel}</button>
            <button type="button" class="builder-icon-btn danger" data-action="remove-ex-day" data-day="${dKey}" data-index="${idx}" ${dEval.classified.length <= 1 ? 'disabled' : ''} title="Remove from ${dLabel}">✕</button>
          </div>
        </div>
      `
      )
      .join('');

    const optionsHtml = quickAddPool
      .map((opt) => `<option value="${opt.id}">${opt.label}</option>`)
      .join('');

    return `
      <div class="builder-day-col ${appState.activeDay === dKey ? 'active-builder-col' : ''}">
        <div class="builder-col-header">
          <div>
            <span class="builder-day-title">${dLabel}</span>
            <span class="builder-day-sub">${dEval.count} exercises · ${dEval.totalSets} sets (~${dEval.estMinutes}m)</span>
          </div>
          <span class="builder-status-dot status-${dEval.statusLevel}">${
            dEval.statusLevel === 'sweet-spot'
              ? 'Moderate ✓'
              : dEval.statusLevel === 'hardcore-warning'
              ? 'Too Heavy ⚠️'
              : 'Tip 💡'
          }</span>
        </div>
        <div class="builder-ex-list">${rows}</div>
        <div class="builder-add-bar">
          <select id="quickAddSelect-${dKey}" class="builder-select" aria-label="Add doable exercise to ${dLabel}">
            ${optionsHtml}
          </select>
          <button type="button" class="btn-ghost btn-xs" data-action="builder-select-add" data-day="${dKey}">+ Add to ${dLabel}</button>
        </div>
      </div>
    `;
  };

  moderateCoachWidget.innerHTML = `
    <!-- Dedicated Page Hero Header -->
    <section class="analysis-hero-card">
      <div class="analysis-hero-top">
        <div>
          <span class="exercise-order-badge">MODERATE FULL-BODY PLANNER &amp; AI COACH</span>
          <h2 class="library-main-heading">Day A &amp; Day B — Plan Rearranger &amp; Moderate Coach</h2>
          <p class="library-main-desc">
            First select the equipment you own below so the Coach only recommends exercises you can do. Then customize your <strong>Day A</strong> and <strong>Day B</strong> routines while staying inside the <strong>Moderate Sweet Spot (3–5 exercises · 9–15 sets · ~35–45 mins)</strong>.
          </p>
        </div>
        <div class="analysis-hero-actions">
          <button type="button" class="btn-secondary btn-sm" data-action="back-to-tracker">
            ← Back to 2-Day Workout Tracker
          </button>
          <button type="button" class="btn-accent btn-sm" data-action="coach-auto-order-both">
            ✨ Auto-Order Day A &amp; B
          </button>
          <button type="button" class="btn-danger-outline btn-sm" data-action="coach-reset-default-plan">
            ↺ Restore Default Plan
          </button>
        </div>
      </div>

      <!-- Step 1: Ask First What Equipment the User Has -->
      <div class="coach-equipment-bar" role="region" aria-label="Select Your Available Workout Equipment">
        <div class="coach-equip-prompt">
          <span class="coach-equip-badge">🤖 STEP 1 · YOUR EQUIPMENT</span>
          <span class="coach-equip-question">What equipment do you have available? (Click to toggle — suggestions &amp; quick-add only show exercises you can do):</span>
        </div>
        <div class="coach-equip-pills">
          ${equipPillsHtml}
        </div>
      </div>
    </section>

    <!-- Step 2: Moderate Coach Evaluation for Active Day (with Day A / Day B Switcher) -->
    <section class="analysis-panel-card">
      <div class="analysis-panel-header">
        <div>
          <span class="exercise-order-badge">STEP 2 · MODERATE LOAD &amp; 4-PILLAR CHECK</span>
          <h3 class="analysis-panel-title">🩺 Moderate Workout Evaluation (${dayKey === 'dayA' ? '🟦 Day A Routine' : '🟪 Day B Routine'})</h3>
        </div>
        <div class="library-filter-pills" role="group" aria-label="Switch Coach Evaluation Day">
          <button type="button" class="lib-filter-pill ${dayKey === 'dayA' ? 'active' : ''}" data-action="coach-switch-day" data-day="dayA">
            🟦 Inspect Day A (${evalA.count} Ex · ${evalA.totalSets} Sets)
          </button>
          <button type="button" class="lib-filter-pill ${dayKey === 'dayB' ? 'active' : ''}" data-action="coach-switch-day" data-day="dayB">
            🟪 Inspect Day B (${evalB.count} Ex · ${evalB.totalSets} Sets)
          </button>
        </div>
      </div>

      <div class="coach-summary-bar status-${cur.statusLevel}">
        <div class="coach-summary-left">
          <div class="coach-badge-row">
            <span class="coach-verdict-badge status-${cur.statusLevel}">${cur.badgeText}</span>
            <span class="coach-time-pill">⏱ ~${cur.estMinutes} min · ${cur.totalSets} total sets (Moderate Cap: 15 sets)</span>
          </div>
          <p class="coach-summary-text">${escapeHtml(cur.summaryText)}</p>
          <ul class="coach-tips-list">${tipsHtml}</ul>
        </div>

        <div class="coach-summary-right">
          <div class="coach-meter-box">
            <div class="coach-meter-labels">
              <span>Light</span>
              <span class="sweet-spot-label">🎯 Moderate Sweet Spot (3–5 Ex)</span>
              <span>Hardcore ⚠️</span>
            </div>
            <div class="coach-meter-track">
              <div class="coach-sweet-zone" title="Ideal Moderate Zone: 3 to 5 exercises (9–15 sets)"></div>
              <div class="coach-meter-fill status-${cur.statusLevel}" style="width: ${cur.loadPct}%"></div>
            </div>
          </div>

          <div class="coach-action-btns">
            ${
              cur.equipmentMismatches.length > 0
                ? `<button type="button" class="btn-accent btn-xs" data-action="coach-swap-equipment" data-day="${dayKey}" title="Automatically swap exercises that need missing equipment with alternatives you can do">🔄 Swap to Available Equipment (${cur.equipmentMismatches.length})</button>`
                : ''
            }
            ${
              !cur.isSequenceOptimal
                ? `<button type="button" class="btn-accent btn-xs" data-action="coach-auto-order" data-day="${dayKey}" title="Put Compound Legs first, Upper Push/Pull second, and Core/Decompression last">✨ Auto-Order ${dayKey === 'dayA' ? 'Day A' : 'Day B'}</button>`
                : ''
            }
            ${
              cur.count > 5
                ? `<button type="button" class="btn-accent btn-xs" data-action="coach-trim-moderate" data-day="${dayKey}" title="Trim excess exercises to stay within the 5-exercise moderate limit">⚖️ Trim to Moderate Cap (5)</button>`
                : ''
            }
          </div>
        </div>
      </div>

      <div class="coach-pillars-bar" style="margin-top: 0.9rem;" aria-label="4 Moderate Full-Body Pillars Check">
        ${pillarChipsHtml}
      </div>
    </section>

    <!-- Step 3: Always-Visible Side-by-Side Day A & Day B Plan Rearranger Board -->
    <section class="analysis-panel-card">
      <div class="analysis-panel-header">
        <div>
          <span class="exercise-order-badge">STEP 3 · SIDE-BY-SIDE ROUTINE REARRANGER</span>
          <h3 class="analysis-panel-title">🧭 Rearrange Day A &amp; Day B Exercises (Filtered to Your Equipment)</h3>
          <p class="coach-builder-desc">
            Use <strong>↑ / ↓</strong> to change exercise order, <strong>⇄ Day A / B</strong> to move an exercise to the other day, or pick from the dropdown below (which only lists exercises matching your equipment from Step 1).
          </p>
        </div>
      </div>
      <div class="builder-two-col">
        ${buildDayBuilderColumn('dayA', '🟦 Day A Routine', evalA)}
        ${buildDayBuilderColumn('dayB', '🟪 Day B Routine', evalB)}
      </div>
    </section>
  `;
}

function calculateDayStats(dayKey) {
  const exercises = getDayExercises(dayKey);
  let completedSets = 0;
  let totalSets = 0;
  let totalVolume = 0;

  exercises.forEach((ex) => {
    const exState = ensureExerciseState(ex);
    exState.sets.forEach((s) => {
      totalSets += 1;
      if (s.completed) {
        completedSets += 1;
        const w = Number(s.weight) || 0;
        const r = Number(s.reps) || 0;
        if (w > 0 && r > 0) {
          totalVolume += w * r;
        }
      }
    });
  });

  return { completedSets, totalSets, totalVolume: Math.round(totalVolume * 10) / 10 };
}

function updateHeaderAndStats() {
  const statsA = calculateDayStats('dayA');
  const statsB = calculateDayStats('dayB');

  tabDayAProgress.textContent = `${statsA.completedSets}/${statsA.totalSets}`;
  tabDayBProgress.textContent = `${statsB.completedSets}/${statsB.totalSets}`;

  const isDayA = appState.activeDay === 'dayA';
  tabDayA.classList.toggle('active', isDayA);
  tabDayA.setAttribute('aria-selected', String(isDayA));
  tabDayB.classList.toggle('active', !isDayA);
  tabDayB.setAttribute('aria-selected', String(!isDayA));

  const currentProgram = WORKOUT_PROGRAM[appState.activeDay];
  const currentStats = isDayA ? statsA : statsB;

  activeDayHeading.textContent = currentProgram.name;
  activeDayDesc.textContent = currentProgram.description;
  setsCompletedStat.textContent = `${currentStats.completedSets} / ${currentStats.totalSets}`;
  dayVolumeStat.textContent = `${currentStats.totalVolume.toLocaleString()} kg`;

  const pct =
    currentStats.totalSets > 0
      ? Math.round((currentStats.completedSets / currentStats.totalSets) * 100)
      : 0;
  dayProgressBar.style.width = `${pct}%`;

  autoStartTimerCheckbox.checked = appState.autoStartTimer;
  updateSoundToggleUI();
  renderModerateCoachWidget();
}

function renderExerciseCards() {
  if (window.PulseLift3D) {
    window.PulseLift3D.destroyAllCardViewers();
  }

  const dayKey = appState.activeDay;
  const exercises = getDayExercises(dayKey);
  const otherDayLabel = dayKey === 'dayA' ? 'Day B' : 'Day A';

  workoutContainer.innerHTML = exercises
    .map((ex, idx) => {
      const exState = ensureExerciseState(ex);
      const allSetsDone = exState.sets.every((s) => s.completed);
      const repUnitLabel = ex.unitOverride || 'reps';
      const canvasId = `canvas3d-${ex.id}`;
      const pillarInfo = classifyExercisePillar(ex);

      const variantsHtml =
        ex.variants && ex.variants.length
          ? `
          <div class="variant-switcher-bar" role="group" aria-label="Choose Exercise Equipment / Alternative">
            <span class="variant-switcher-label">EQUIPMENT / NO-BAR ALTERNATIVE:</span>
            <div class="variant-pills-row">
              ${ex.variants
                .map(
                  (v) => `
                <button
                  type="button"
                  class="lib-filter-pill ${ex.activeVariantKey === v.key ? 'active' : ''}"
                  data-action="swap-variant"
                  data-exercise-id="${ex.id}"
                  data-variant-key="${v.key}"
                >
                  ${v.label}
                </button>`
                )
                .join('')}
            </div>
          </div>`
          : '';

      const musclesHtml = ex.muscles
        .map(
          (m) => `
          <button
            type="button"
            class="muscle-tag ${m.primary ? 'primary-muscle' : ''}"
            data-action="spotlight-muscle"
            data-exercise-id="${ex.id}"
            data-muscle-key="${m.key}"
            title="Hover or tap to spotlight ${m.name} on the 3D model"
          >
            <span class="muscle-dot ${m.primary ? 'primary-dot' : 'secondary-dot'}"></span>
            <span>${m.name}</span>
          </button>`
        )
        .join('');

      const cuesHtml = ex.cues.map((c) => `<li>${c}</li>`).join('');

      const setPillsHtml = exState.sets
        .map(
          (s, idx) => `
          <button
            type="button"
            class="set-pill ${s.completed ? 'completed' : ''}"
            data-action="toggle-set"
            data-exercise-id="${ex.id}"
            data-set-index="${idx}"
            aria-pressed="${s.completed}"
            title="Toggle Set ${idx + 1} completion"
          >
            <span>Set ${idx + 1}</span>
            <span>${s.completed ? '✓' : '○'}</span>
          </button>
        `
        )
        .join('');

      const setRowsHtml = exState.sets
        .map(
          (s, idx) => `
          <div class="set-log-row ${s.completed ? 'row-completed' : ''}" data-row-exercise="${ex.id}" data-row-index="${idx}">
            <span class="set-row-badge">#${idx + 1}</span>
            <div class="input-with-unit">
              <input
                type="number"
                class="log-input"
                min="0"
                max="500"
                step="0.5"
                value="${s.weight}"
                data-action="input-weight"
                data-exercise-id="${ex.id}"
                data-set-index="${idx}"
                aria-label="${ex.name} Set ${idx + 1} Weight in kilograms"
              />
              <span class="input-unit">kg</span>
            </div>
            <div class="input-with-unit">
              <input
                type="number"
                class="log-input"
                min="0"
                max="999"
                step="1"
                value="${s.reps}"
                data-action="input-reps"
                data-exercise-id="${ex.id}"
                data-set-index="${idx}"
                aria-label="${ex.name} Set ${idx + 1} ${repUnitLabel}"
              />
              <span class="input-unit">${repUnitLabel}</span>
            </div>
            <button
              type="button"
              class="set-check-btn ${s.completed ? 'completed' : ''}"
              data-action="toggle-set"
              data-exercise-id="${ex.id}"
              data-set-index="${idx}"
              aria-label="Mark Set ${idx + 1} complete"
              title="Mark Set ${idx + 1} complete"
            >
              ✓
            </button>
          </div>
        `
        )
        .join('');

      return `
        <article class="exercise-card ${allSetsDone ? 'card-completed' : ''}" data-day="${dayKey}" data-card-exercise="${ex.id}">
          <div class="card-top-bar">
            <div>
              <span class="exercise-order-badge">${ex.order} · ${pillarInfo.label} · ${allSetsDone ? 'COMPLETED' : '3D MUSCLE MAP'}</span>
              <h3 class="exercise-title">${ex.name}</h3>
            </div>
            <div class="exercise-prescription">
              <span class="rep-scheme-badge">${ex.scheme}</span>
              <button
                type="button"
                class="quick-rest-trigger"
                data-action="start-exercise-rest"
                data-rest-seconds="${ex.restSeconds}"
                data-rest-label="${ex.name.toUpperCase()} (${ex.restLabel})"
                title="Start recommended ${ex.restLabel} rest timer"
              >
                ⏱ Rest ${ex.restSeconds === 180 ? '3m' : ex.restSeconds + 's'}
              </button>
            </div>
          </div>

          ${variantsHtml}

          <div class="visual-stage">
            <div class="stage-3d-column">
              <div class="canvas-3d-box" title="Drag left/right to rotate 360° around the 3D athlete">
                <canvas id="${canvasId}" class="exercise-3d-canvas"></canvas>
                <button
                  type="button"
                  class="clinical-light-btn"
                  data-action="toggle-clinical-bg"
                  data-exercise-id="${ex.id}"
                  title="Switch between White Clinical Ecorché Studio and Dark Studio"
                >
                  ☀️/🌙
                </button>
                <button
                  type="button"
                  class="expand-3d-btn"
                  data-action="open-3d-studio"
                  data-exercise-id="${ex.id}"
                  title="Open Full 360° 3D Studio Inspector"
                >
                  ⤢ 360° Studio
                </button>
              </div>
              <div class="card-360-toolbar" role="group" aria-label="360° Camera Presets for ${ex.name}">
                <button type="button" class="mini-cam-btn" data-action="card-cam" data-exercise-id="${ex.id}" data-yaw="48" data-pitch="18">45°</button>
                <button type="button" class="mini-cam-btn" data-action="card-cam" data-exercise-id="${ex.id}" data-yaw="0" data-pitch="12">Side</button>
                <button type="button" class="mini-cam-btn" data-action="card-cam" data-exercise-id="${ex.id}" data-yaw="90" data-pitch="12">Front</button>
                <button type="button" class="mini-cam-btn" data-action="card-cam" data-exercise-id="${ex.id}" data-yaw="270" data-pitch="12">Back</button>
                <button type="button" class="mini-cam-btn active" data-action="card-spin" data-exercise-id="${ex.id}" title="Toggle continuous 360° rotation">↻ 360°</button>
              </div>
            </div>

            <div class="cues-and-muscles">
              <div class="muscle-tags" aria-label="Target Muscles (Hover or tap to spotlight on 3D figure)">
                ${musclesHtml}
              </div>
              <ul class="form-cues-list" aria-label="Key Form Cues">
                ${cuesHtml}
              </ul>
            </div>
          </div>

          <div class="tracker-section">
            <div class="set-pills-bar">
              <span class="set-pills-label">Quick Set Pills</span>
              <div class="set-pills-group">
                ${setPillsHtml}
              </div>
            </div>

            <div class="set-log-table">
              <div class="set-log-header">
                <span>Set</span>
                <span>Weight (kg)</span>
                <span>${ex.unitOverride ? 'Duration (sec)' : 'Reps Completed'}</span>
                <span style="text-align:right">Done</span>
              </div>
              ${setRowsHtml}
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  if (window.PulseLift3D) {
    exercises.forEach((ex) => {
      const canvasId = `canvas3d-${ex.id}`;
      const cardEl = workoutContainer.querySelector(`[data-card-exercise="${ex.id}"]`);
      const spinBtn = cardEl ? cardEl.querySelector('[data-action="card-spin"]') : null;

      window.PulseLift3D.createViewer(canvasId, ex.id, {
        poseId: ex.poseId || ex.id,
        activeMuscles: typeof buildExerciseActiveMusclesMap === 'function' ? buildExerciseActiveMusclesMap(ex) : null,
        initialYaw: ex.defaultYaw !== undefined ? ex.defaultYaw : 42,
        initialPitch: 16,
        autoSpin: true,
        showLabels: true,
        onSpinStateChange: (isSpinning) => {
          if (spinBtn) {
            spinBtn.classList.toggle('active', isSpinning);
          }
        }
      });
    });
  }
}

const WEEKDAY_NAMES_MON_FIRST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAY_NAMES_FULL = WEEKDAY_NAMES_MON_FIRST;
const WEEKDAY_SHORT_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toLocalIsoDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonFirstWeekdayIdx(dateObj) {
  // JS getDay(): 0=Sun, 1=Mon...6=Sat -> convert to 0=Mon...6=Sun
  return (dateObj.getDay() + 6) % 7;
}

function normalizeHistoryEntry(entry) {
  const dt = entry.isoDate
    ? new Date(`${entry.isoDate}T12:00:00`)
    : new Date(typeof entry.id === 'number' ? entry.id : Date.now());
  const validDt = Number.isNaN(dt.getTime()) ? new Date() : dt;
  const isoDate = entry.isoDate || toLocalIsoDate(validDt);
  const weekdayIdx =
    typeof entry.weekdayIdx === 'number' ? entry.weekdayIdx : getMonFirstWeekdayIdx(validDt);
  const weekdayShort = WEEKDAY_SHORT_MON_FIRST[weekdayIdx] || 'Mon';
  const weekdayFull = WEEKDAY_NAMES_MON_FIRST[weekdayIdx] || 'Monday';
  const dayKey =
    entry.dayKey === 'dayB' || (entry.dayTitle && entry.dayTitle.includes('Day B'))
      ? 'dayB'
      : 'dayA';
  const planCode = dayKey === 'dayB' ? 'B' : 'A';
  const totalSets =
    entry.totalSets ||
    (Array.isArray(entry.exercises) ? entry.exercises.length * 3 : 12);

  return {
    ...entry,
    isoDate,
    weekdayIdx,
    weekdayShort,
    weekdayFull,
    dayKey,
    planCode,
    totalSets,
    completedSets: entry.completedSets ?? totalSets,
    totalVolume: entry.totalVolume ?? 0
  };
}

let historyFilterPlan = 'all'; // 'all' | 'dayA' | 'dayB'

function renderHistoryPanel() {
  const countStr = String(workoutHistory.length);
  if (historyCountBadge) historyCountBadge.textContent = countStr;
  const navHistBadge = document.getElementById('navHistoryCountBadge');
  if (navHistBadge) navHistBadge.textContent = countStr;

  renderHistoryAnalysisPage();

  const latestSnap = backupSnapshots[0] || null;
  const canRestoreSnap =
    latestSnap &&
    Array.isArray(latestSnap.workoutHistory) &&
    latestSnap.workoutHistory.length > workoutHistory.length;

  const drawerVaultBar = `
    <div class="drawer-backup-bar">
      <div class="drawer-backup-status">
        <span class="vault-pill vault-ok">🛡️ Auto-Backup ON</span>
        <span class="drawer-backup-meta">${
          backupVaultStatus.diskSynced ? 'Disk + IndexedDB + Local' : 'IndexedDB + Local Vault'
        }${backupVaultStatus.lastSavedAt ? ` · Saved ${backupVaultStatus.lastSavedAt}` : ''}</span>
      </div>
      <div class="drawer-backup-actions">
        ${
          canRestoreSnap
            ? `<button type="button" class="btn-accent btn-xs" data-drawer-backup="restore-latest" data-snapshot-id="${latestSnap.snapshotId}">↺ Restore ${latestSnap.workoutHistory.length} Sessions (${escapeHtml(latestSnap.reason)})</button>`
            : ''
        }
        <button type="button" class="btn-secondary btn-xs" data-drawer-backup="sync-recover" title="Auto-recover and merge from Disk & IndexedDB Vault">🔄 Sync / Recover</button>
        <button type="button" class="btn-secondary btn-xs" data-drawer-backup="export-json" title="Download backup JSON file">📥 Export .json</button>
      </div>
    </div>
  `;

  if (workoutHistory.length === 0) {
    historyList.innerHTML = `
      ${drawerVaultBar}
      <div class="history-empty">
        No logged workouts in current view. Complete your sets and click <strong>Save Workout Log</strong>, click <strong>🔄 Sync / Recover</strong> above, or open the <button type="button" class="btn-accent btn-xs" data-open-history-analysis="true">📊 History &amp; Plan A/B Analysis Page</button> to manage backups &amp; schedule!
      </div>
    `;
    return;
  }

  const normalized = workoutHistory.map(normalizeHistoryEntry);
  const countA = normalized.filter((e) => e.planCode === 'A').length;
  const countB = normalized.filter((e) => e.planCode === 'B').length;

  const itemsHtml = normalized
    .slice(0, 8)
    .map((entry) => {
      const exSummary = (entry.exercises || [])
        .map((e) => {
          const setsStr = (e.sets || [])
            .map((s) => `${s.weight}kg×${s.reps}${s.completed ? '✓' : ''}`)
            .join(', ');
          return `<span class="history-ex-pill"><strong>${escapeHtml(e.name)}:</strong> ${escapeHtml(setsStr)}</span>`;
        })
        .join('');

      return `
        <div class="history-item">
          <div class="history-item-top">
            <div class="history-item-title-group">
              <span class="plan-code-pill plan-${entry.planCode.toLowerCase()}">PLAN ${entry.planCode}</span>
              <span class="history-weekday-tag">${entry.weekdayFull} (${entry.isoDate})</span>
              <span class="history-item-title">${escapeHtml(entry.dayTitle)}</span>
            </div>
            <span class="history-item-meta">${entry.completedSets}/${entry.totalSets} sets · ${entry.totalVolume.toLocaleString()} kg vol</span>
          </div>
          <div class="history-exercises-summary">
            ${exSummary}
          </div>
        </div>
      `;
    })
    .join('');

  historyList.innerHTML = `
    ${drawerVaultBar}
    <div class="drawer-analysis-banner">
      <div>
        <strong>📊 Plan Split:</strong> <span class="plan-code-pill plan-a">Plan A: ${countA}×</span> <span class="plan-code-pill plan-b">Plan B: ${countB}×</span>
      </div>
      <div class="drawer-banner-btns">
        <button type="button" class="btn-ghost btn-xs forgot-data-trigger-btn" data-open-backfill-modal="true">
          📅 Forgot to key in data?
        </button>
        <button type="button" class="btn-accent btn-xs" data-open-history-analysis="true">
          📊 Open Full Plan A/B Schedule &amp; Backup Vault →
        </button>
      </div>
    </div>
    ${itemsHtml}
  `;
}

function renderHistoryAnalysisPage() {
  const container = document.getElementById('historyAnalysisPageContainer');
  if (!container) return;

  const normalized = workoutHistory
    .map(normalizeHistoryEntry)
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate) || (b.id || 0) - (a.id || 0));

  const totalSessions = normalized.length;
  const countA = normalized.filter((e) => e.planCode === 'A').length;
  const countB = normalized.filter((e) => e.planCode === 'B').length;
  const pctA = totalSessions > 0 ? Math.round((countA / totalSessions) * 100) : 50;
  const pctB = totalSessions > 0 ? 100 - pctA : 50;

  const totalVolA = Math.round(
    normalized.filter((e) => e.planCode === 'A').reduce((acc, e) => acc + (Number(e.totalVolume) || 0), 0)
  );
  const totalVolB = Math.round(
    normalized.filter((e) => e.planCode === 'B').reduce((acc, e) => acc + (Number(e.totalVolume) || 0), 0)
  );
  const totalSetsAll = normalized.reduce((acc, e) => acc + (Number(e.completedSets) || 0), 0);

  // Determine Next Recommended Plan based on most recent session
  const latestEntry = normalized[0] || null;
  const nextPlanCode = latestEntry ? (latestEntry.planCode === 'A' ? 'B' : 'A') : 'A';
  const nextDayKey = nextPlanCode === 'B' ? 'dayB' : 'dayA';
  const nextPlanDesc =
    nextPlanCode === 'A'
      ? 'Plan A (Squat · Floor Press · Row · Decompress)'
      : 'Plan B (RDL · Overhead Press · Lunge · Traction)';

  // Build Day-of-Week Breakdown (Monday=0 .. Sunday=6)
  const weekdayCounts = WEEKDAY_NAMES_MON_FIRST.map((name, idx) => ({
    idx,
    name,
    short: WEEKDAY_SHORT_MON_FIRST[idx],
    planA: 0,
    planB: 0,
    total: 0
  }));
  normalized.forEach((e) => {
    const bucket = weekdayCounts[e.weekdayIdx];
    if (bucket) {
      if (e.planCode === 'A') bucket.planA += 1;
      else bucket.planB += 1;
      bucket.total += 1;
    }
  });
  const maxWeekdayTotal = Math.max(1, ...weekdayCounts.map((w) => w.total));

  const topDaysA = weekdayCounts
    .filter((w) => w.planA > 0)
    .sort((a, b) => b.planA - a.planA)
    .slice(0, 2)
    .map((w) => w.short);
  const topDaysB = weekdayCounts
    .filter((w) => w.planB > 0)
    .sort((a, b) => b.planB - a.planB)
    .slice(0, 2)
    .map((w) => w.short);

  // Build 28-Day Schedule Calendar (4 weeks ending this week, Mon -> Sun)
  const today = new Date();
  const todayIso = toLocalIsoDate(today);
  const todayMonIdx = getMonFirstWeekdayIdx(today);
  // Start of current week (Monday)
  const currentWeekMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - todayMonIdx);
  // Start 3 weeks before current week Monday (28 days total = 4 full Mon-Sun weeks)
  const startCalDate = new Date(
    currentWeekMonday.getFullYear(),
    currentWeekMonday.getMonth(),
    currentWeekMonday.getDate() - 21
  );

  const byDateMap = new Map();
  normalized.forEach((e) => {
    if (!byDateMap.has(e.isoDate)) byDateMap.set(e.isoDate, []);
    byDateMap.get(e.isoDate).push(e);
  });

  // Count sessions in current week (Monday -> Sunday)
  let thisWeekSessions = 0;
  const calendarCellsHtml = [];
  for (let i = 0; i < 28; i++) {
    const cellDate = new Date(
      startCalDate.getFullYear(),
      startCalDate.getMonth(),
      startCalDate.getDate() + i
    );
    const cellIso = toLocalIsoDate(cellDate);
    const isToday = cellIso === todayIso;
    const isFuture = cellIso > todayIso;
    const daySessions = byDateMap.get(cellIso) || [];
    if (i >= 21 && daySessions.length > 0) {
      thisWeekSessions += daySessions.length;
    }

    const hasA = daySessions.some((s) => s.planCode === 'A');
    const hasB = daySessions.some((s) => s.planCode === 'B');
    const dayVol = daySessions.reduce((acc, s) => acc + (Number(s.totalVolume) || 0), 0);
    const daySets = daySessions.reduce((acc, s) => acc + (Number(s.completedSets) || 0), 0);

    const monthShort = cellDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const wkShort = WEEKDAY_SHORT_MON_FIRST[i % 7];

    let badgeHtml = `<span class="cal-rest-dot">${isFuture ? 'Upcoming' : 'Rest Day'}</span>`;
    let cellClass = 'cal-day-rest';
    if (hasA && hasB) {
      cellClass = 'cal-day-both';
      badgeHtml = `
        <div class="cal-plan-badges">
          <span class="plan-code-pill plan-a">PLAN A</span>
          <span class="plan-code-pill plan-b">PLAN B</span>
        </div>
        <span class="cal-day-vol">${daySets} sets · ${Math.round(dayVol)} kg</span>
      `;
    } else if (hasA) {
      cellClass = 'cal-day-a';
      badgeHtml = `
        <span class="plan-code-pill plan-a">🟦 PLAN A</span>
        <span class="cal-day-vol">${daySets} sets · ${Math.round(dayVol)} kg</span>
      `;
    } else if (hasB) {
      cellClass = 'cal-day-b';
      badgeHtml = `
        <span class="plan-code-pill plan-b">🟪 PLAN B</span>
        <span class="cal-day-vol">${daySets} sets · ${Math.round(dayVol)} kg</span>
      `;
    }

    calendarCellsHtml.push(`
      <div class="cal-day-cell ${cellClass} ${isToday ? 'cal-today' : ''} ${isFuture ? 'cal-future' : ''}" data-history-action="open-backfill-date" data-date="${cellIso}" title="${wkShort}, ${monthShort} (${cellIso}) — Click to key in workout data for this date">
        <div class="cal-cell-top">
          <span class="cal-wk-name">${wkShort}</span>
          <span class="cal-date-num">${monthShort}${isToday ? ' · TODAY' : ''}</span>
        </div>
        <div class="cal-cell-body">
          ${badgeHtml}
        </div>
      </div>
    `);
  }

  // Balance Coach Verdict
  let balanceVerdict = '✅ Perfectly balanced 1:1 alternation between Plan A and Plan B!';
  if (totalSessions === 0) {
    balanceVerdict = '💡 Log your workout (or click "📅 Forgot to key in data?" above) to track your Plan A & Plan B day patterns.';
  } else if (Math.abs(countA - countB) >= 2) {
    const lagging = countA < countB ? 'Plan A (Squat · Floor Press · Row)' : 'Plan B (RDL · Overhead Press · Lunge)';
    balanceVerdict = `⚖️ You have logged Plan A ${countA}× and Plan B ${countB}×. Prioritize ${lagging} on your next session to keep front & back muscles balanced!`;
  }

  const weekdayRowsHtml = weekdayCounts
    .map((w) => {
      const widthA = Math.round((w.planA / maxWeekdayTotal) * 100);
      const widthB = Math.round((w.planB / maxWeekdayTotal) * 100);
      let dominantTag = '<span class="wk-dom-rest">Rest / Recovery</span>';
      if (w.planA > 0 && w.planB > 0) {
        dominantTag = `<span class="wk-dom-mix">🟦 Plan A (${w.planA}×) &amp; 🟪 Plan B (${w.planB}×)</span>`;
      } else if (w.planA > 0) {
        dominantTag = `<span class="wk-dom-a">🟦 Usually Plan A (${w.planA}×)</span>`;
      } else if (w.planB > 0) {
        dominantTag = `<span class="wk-dom-b">🟪 Usually Plan B (${w.planB}×)</span>`;
      }

      return `
        <div class="weekday-stat-row">
          <div class="weekday-name-col">
            <strong>${w.name}</strong>
            ${dominantTag}
          </div>
          <div class="weekday-bar-track">
            ${w.planA > 0 ? `<div class="weekday-bar-seg seg-a" style="width: ${widthA}%" title="Plan A: ${w.planA} sessions">${w.planA}× A</div>` : ''}
            ${w.planB > 0 ? `<div class="weekday-bar-seg seg-b" style="width: ${widthB}%" title="Plan B: ${w.planB} sessions">${w.planB}× B</div>` : ''}
          </div>
          <div class="weekday-count-col">${w.total} sess.</div>
        </div>
      `;
    })
    .join('');

  // Filtered History List
  const filteredEntries =
    historyFilterPlan === 'all'
      ? normalized
      : normalized.filter((e) => e.dayKey === historyFilterPlan);

  const logCardsHtml =
    filteredEntries.length === 0
      ? `
      <div class="history-empty">
        <p>No ${historyFilterPlan === 'all' ? '' : historyFilterPlan === 'dayA' ? 'Plan A ' : 'Plan B '}workout sessions logged in this view.</p>
        <button type="button" class="btn-accent btn-sm" data-history-action="restore-two-days">↺ Restore My 2-Day History (Plan A &amp; Plan B)</button>
      </div>`
      : filteredEntries
          .map((entry) => {
            const exSummary = (entry.exercises || [])
              .map((e) => {
                const setsStr = (e.sets || [])
                  .map((s) => `${s.weight}kg×${s.reps}${s.completed ? '✓' : ''}`)
                  .join(', ');
                return `<span class="history-ex-pill"><strong>${escapeHtml(e.name)}:</strong> ${escapeHtml(setsStr)}</span>`;
              })
              .join('');

            return `
              <div class="history-item analysis-log-item plan-border-${entry.planCode.toLowerCase()}">
                <div class="history-item-top">
                  <div class="history-item-title-group">
                    <span class="plan-code-pill plan-${entry.planCode.toLowerCase()}">${entry.planCode === 'A' ? '🟦 PLAN A' : '🟪 PLAN B'}</span>
                    <span class="history-weekday-tag">📅 ${entry.weekdayFull} · ${entry.isoDate}</span>
                    <span class="history-item-title">${escapeHtml(entry.dayTitle)}</span>
                  </div>
                  <div class="history-item-right">
                    <span class="history-item-meta">${entry.completedSets}/${entry.totalSets} sets · <strong>${entry.totalVolume.toLocaleString()} kg</strong></span>
                    <button type="button" class="card-order-btn danger" data-history-action="delete-entry" data-entry-id="${entry.id}" title="Delete this log entry">✕</button>
                  </div>
                </div>
                <div class="history-exercises-summary">
                  ${exSummary}
                </div>
              </div>
            `;
          })
          .join('');

  container.innerHTML = `
    <!-- Top Hero Banner -->
    <section class="analysis-hero-card">
      <div class="analysis-hero-top">
        <div>
          <span class="exercise-order-badge">WORKOUT SCHEDULE &amp; CONSISTENCY ANALYTICS</span>
          <h2 class="library-main-heading">Plan A &amp; Plan B — Day &amp; Schedule Analysis</h2>
          <p class="library-main-desc">
            Track which days of the week and calendar dates you perform <strong>🟦 Plan A (Squat · Push · Row)</strong> vs. <strong>🟪 Plan B (RDL · Press · Lunge)</strong>, monitor your moderate weekly frequency, and keep your full-body split balanced.
          </p>
        </div>
        <div class="analysis-hero-actions">
          <button type="button" class="btn-accent btn-sm" data-history-action="jump-next-plan" data-day="${nextDayKey}">
            👉 Do Next: Plan ${nextPlanCode}
          </button>
          <button type="button" class="btn-ghost btn-sm forgot-data-trigger-btn" data-history-action="open-backfill-modal" title="Forgot to key in a past workout? Click to pop out the Quick-Log & Backfill window">
            📅 Forgot to key in data?
          </button>
          <button type="button" class="btn-ghost btn-sm" data-history-action="restore-two-days" title="Ensure only your real 2 logged days (Plan A & Plan B) are in history">
            ↺ Keep Only My 2 Logged Days
          </button>
          <button type="button" class="btn-danger-outline btn-sm" data-history-action="clear-all">
            🗑️ Clear All
          </button>
        </div>
      </div>
    </section>

    <!-- 4 KPI Summary Cards -->
    <section class="analysis-kpi-grid" aria-label="Plan A and Plan B Summary Metrics">
      <div class="analysis-kpi-card">
        <span class="kpi-label">PLAN A vs. PLAN B SPLIT</span>
        <div class="kpi-main-row">
          <strong class="kpi-big-val">${countA} <span class="kpi-sub-a">Plan A</span> · ${countB} <span class="kpi-sub-b">Plan B</span></strong>
        </div>
        <div class="split-ratio-bar">
          <div class="split-seg-a" style="width: ${pctA}%">${pctA}% A</div>
          <div class="split-seg-b" style="width: ${pctB}%">${pctB}% B</div>
        </div>
        <span class="kpi-foot">${escapeHtml(balanceVerdict)}</span>
      </div>

      <div class="analysis-kpi-card">
        <span class="kpi-label">NEXT RECOMMENDED SESSION</span>
        <div class="kpi-main-row">
          <strong class="kpi-big-val">${nextPlanCode === 'A' ? '🟦 Plan A' : '🟪 Plan B'}</strong>
          <span class="plan-code-pill plan-${nextPlanCode.toLowerCase()}">NEXT UP</span>
        </div>
        <p class="kpi-desc">${escapeHtml(nextPlanDesc)}</p>
        <span class="kpi-foot">${
          latestEntry
            ? `Last session: Plan ${latestEntry.planCode} on ${latestEntry.weekdayFull} (${latestEntry.isoDate})`
            : 'Start with Plan A to kick off your 2-day cycle'
        }</span>
      </div>

      <div class="analysis-kpi-card">
        <span class="kpi-label">USUAL TRAINING DAYS OF WEEK</span>
        <div class="kpi-main-row">
          <strong class="kpi-big-val">${thisWeekSessions} / 3 <span class="kpi-unit">This Week</span></strong>
        </div>
        <p class="kpi-desc">
          🟦 <strong>Plan A Days:</strong> ${topDaysA.length ? topDaysA.join(', ') : 'None yet'}<br/>
          🟪 <strong>Plan B Days:</strong> ${topDaysB.length ? topDaysB.join(', ') : 'None yet'}
        </p>
        <span class="kpi-foot">Moderate Sweet Spot: 2 to 3 alternating sessions / week</span>
      </div>

      <div class="analysis-kpi-card">
        <span class="kpi-label">CUMULATIVE VOLUME BY PLAN</span>
        <div class="kpi-main-row">
          <strong class="kpi-big-val">${(totalVolA + totalVolB).toLocaleString()} kg</strong>
        </div>
        <p class="kpi-desc">
          🟦 <strong>Plan A Vol:</strong> ${totalVolA.toLocaleString()} kg<br/>
          🟪 <strong>Plan B Vol:</strong> ${totalVolB.toLocaleString()} kg
        </p>
        <span class="kpi-foot">${totalSetsAll} total sets completed across ${totalSessions} sessions</span>
      </div>
    </section>

    <!-- Two-Column Calendar & Day-of-Week Breakdown -->
    <section class="analysis-two-col">
      <!-- Left: 28-Day Schedule Calendar -->
      <div class="analysis-panel-card">
        <div class="analysis-panel-header">
          <div>
            <span class="exercise-order-badge">4-WEEK CALENDAR SCHEDULE</span>
            <h3 class="analysis-panel-title">🗓️ Which Days You Did Plan A vs. Plan B (Last 28 Days)</h3>
          </div>
          <div class="cal-legend">
            <span><i class="legend-box box-a"></i> Plan A</span>
            <span><i class="legend-box box-b"></i> Plan B</span>
            <span><i class="legend-box box-rest"></i> Rest</span>
          </div>
        </div>
        <div class="calendar-28-grid">
          ${calendarCellsHtml.join('')}
        </div>
      </div>

      <!-- Right: Day-of-Week Habit Distribution -->
      <div class="analysis-panel-card">
        <div class="analysis-panel-header">
          <div>
            <span class="exercise-order-badge">WEEKDAY HABIT PATTERN</span>
            <h3 class="analysis-panel-title">📊 Day-of-Week Breakdown (Mon – Sun)</h3>
          </div>
        </div>
        <div class="weekday-bars-list">
          ${weekdayRowsHtml}
        </div>
      </div>
    </section>

    <!-- Bottom: Filterable Session History Log -->
    <section class="analysis-panel-card">
      <div class="analysis-panel-header">
        <div>
          <span class="exercise-order-badge">DETAILED WORKOUT LOG</span>
          <h3 class="analysis-panel-title">📋 Logged Sessions (${filteredEntries.length})</h3>
        </div>
        <div class="library-filter-pills" role="group" aria-label="Filter History by Plan">
          <button type="button" class="lib-filter-pill ${historyFilterPlan === 'all' ? 'active' : ''}" data-history-filter="all">All Sessions (${totalSessions})</button>
          <button type="button" class="lib-filter-pill ${historyFilterPlan === 'dayA' ? 'active' : ''}" data-history-filter="dayA">🟦 Plan A Only (${countA})</button>
          <button type="button" class="lib-filter-pill ${historyFilterPlan === 'dayB' ? 'active' : ''}" data-history-filter="dayB">🟪 Plan B Only (${countB})</button>
        </div>
      </div>
      <div class="history-list">
        ${logCardsHtml}
      </div>
    </section>

    <!-- Auto-Backup & Data Recovery Vault -->
    <section class="analysis-panel-card backup-vault-card" aria-label="Auto-Backup and Data Recovery Vault">
      <div class="analysis-panel-header">
        <div>
          <span class="exercise-order-badge">ZERO-DATA-LOSS PROTECTION SYSTEM</span>
          <h3 class="analysis-panel-title">🛡️ Auto-Backup &amp; Recovery Vault (Survives Code Updates &amp; Cache Resets)</h3>
          <p class="backup-vault-desc">
            Every logged workout and custom routine change is automatically backed up across <strong>4 independent layers</strong>: Disk File (<code>workout-backup.json</code>), Browser <code>IndexedDB</code>, Rolling Restore Snapshots, and Cross-Reload Session Memory. On every startup or code update, missing sessions are automatically recovered and merged.
          </p>
        </div>
        <div class="vault-status-badges">
          <span class="vault-pill ${backupVaultStatus.diskSynced ? 'vault-ok' : 'vault-warn'}">
            ${backupVaultStatus.diskSynced ? '🟢 Disk File Auto-Backup (workout-backup.json)' : '🟡 Disk Sync Standby'}
          </span>
          <span class="vault-pill ${backupVaultStatus.idbSynced ? 'vault-ok' : 'vault-warn'}">
            ${backupVaultStatus.idbSynced ? '🟢 IndexedDB Vault Active' : '🟡 IndexedDB Standby'}
          </span>
          <span class="vault-pill vault-ok">
            📸 ${backupSnapshots.length} Restore Point${backupSnapshots.length === 1 ? '' : 's'}
          </span>
          <span class="vault-pill">
            🕒 Last Saved: ${escapeHtml(backupVaultStatus.lastSavedAt || 'Synced on load')}
          </span>
        </div>
      </div>

      <div class="backup-vault-toolbar">
        <div class="backup-vault-btn-group">
          <button type="button" class="btn-accent btn-sm" data-history-action="force-recover">
            🔄 Sync &amp; Auto-Recover from Disk / Vaults
          </button>
          <button type="button" class="btn-secondary btn-sm" data-history-action="create-snapshot">
            📸 Create Manual Restore Point
          </button>
          <button type="button" class="btn-secondary btn-sm" data-history-action="export-backup">
            📥 Download Backup (.json)
          </button>
          <button type="button" class="btn-secondary btn-sm" data-history-action="trigger-import">
            📤 Import / Restore Backup File (.json)
          </button>
          <input type="file" id="backupFileInput" accept=".json,application/json" class="hidden" />
        </div>

        <label class="backup-autodownload-toggle">
          <input type="checkbox" data-history-action="toggle-auto-download" ${appState.autoDownloadBackupOnLog ? 'checked' : ''} />
          <span>Auto-download <code>.json</code> backup file whenever I click "Save Workout Log"</span>
        </label>
      </div>

      <div class="snapshots-list-wrap">
        <div class="snapshots-list-header">
          <strong>🕒 Automatic &amp; Manual Restore Points (Click "↺ Restore" to roll back anytime)</strong>
          <span>Up to 15 rolling snapshots preserved across code updates &amp; accidental clears</span>
        </div>
        ${
          backupSnapshots.length === 0
            ? `<div class="snapshot-empty">No restore snapshots yet — log a workout or click <strong>📸 Create Manual Restore Point</strong> to lock in a snapshot.</div>`
            : `<div class="snapshots-grid">
                ${backupSnapshots
                  .slice(0, 6)
                  .map(
                    (snap) => `
                  <div class="snapshot-row-card">
                    <div class="snapshot-info">
                      <div class="snapshot-top-line">
                        <span class="snapshot-reason-badge">${escapeHtml(snap.reason || 'Auto-Backup')}</span>
                        <span class="snapshot-time">${escapeHtml(snap.createdAt || '')}</span>
                      </div>
                      <span class="snapshot-meta">Contains <strong>${snap.sessionCount || (snap.workoutHistory ? snap.workoutHistory.length : 0)}</strong> logged workout session${(snap.sessionCount || 0) === 1 ? '' : 's'} + custom Day A/B routine</span>
                    </div>
                    <button type="button" class="btn-accent btn-xs" data-history-action="restore-snapshot" data-snapshot-id="${escapeHtml(snap.snapshotId)}">
                      ↺ Restore (${snap.sessionCount || (snap.workoutHistory ? snap.workoutHistory.length : 0)})
                    </button>
                  </div>
                `
                  )
                  .join('')}
              </div>`
        }
      </div>
    </section>
  `;
}

/* ==========================================================================
   Full-Screen 360° 3D Studio Modal Logic
   ========================================================================== */
const modal3DStudio = document.getElementById('modal3DStudio');
const modal3DCanvas = document.getElementById('modal3DCanvas');
const modal3DTitle = document.getElementById('modal3DTitle');
const modal3DOrderBadge = document.getElementById('modal3DOrderBadge');
const modal3DMuscles = document.getElementById('modal3DMuscles');
const modal3DCues = document.getElementById('modal3DCues');
const modal3DAngleBadge = document.getElementById('modal3DAngleBadge');
const closeModal3DBtn = document.getElementById('closeModal3DBtn');
const modalSpinToggleBtn = document.getElementById('modalSpinToggleBtn');
const modalSpeedBtn = document.getElementById('modalSpeedBtn');
const modalPauseBtn = document.getElementById('modalPauseBtn');
const modalRepScrubber = document.getElementById('modalRepScrubber');
const modalCamButtons = document.querySelectorAll('[data-modal-cam]');

let modalViewerInstance = null;

function open3DStudioModal(exId) {
  const ex = findExerciseProgramData(exId);
  if (!ex || !window.PulseLift3D) return;

  const exMuscles = ex.muscles || ex.muscleDetails || [];
  const exScheme = ex.scheme || ex.prescription || '';
  modal3DOrderBadge.textContent = `${ex.order} · 360° 3D ANATOMICAL STUDIO (${exScheme})`;
  modal3DTitle.textContent = ex.name;
  modal3DMuscles.innerHTML = exMuscles
    .map(
      (m) => `
      <button
        type="button"
        class="muscle-tag ${m.primary ? 'primary-muscle' : ''}"
        data-modal-muscle-key="${m.key}"
      >
        <span class="muscle-dot ${m.primary ? 'primary-dot' : 'secondary-dot'}"></span>
        <span>${m.name}</span>
      </button>`
    )
    .join('');
  modal3DCues.innerHTML = ex.cues.map((c) => `<li>${c}</li>`).join('');

  modal3DStudio.classList.remove('hidden');

  if (modalViewerInstance) {
    window.PulseLift3D.removeViewer(modal3DCanvas);
  }

  modalViewerInstance = window.PulseLift3D.createViewer(modal3DCanvas, ex.id, {
    poseId: ex.poseId || ex.id,
    activeMuscles: typeof buildExerciseActiveMusclesMap === 'function' ? buildExerciseActiveMusclesMap(ex) : null,
    initialYaw: ex.defaultYaw !== undefined ? ex.defaultYaw : 42,
    initialPitch: 16,
    initialZoom: 1.08,
    autoSpin: true,
    showLabels: true,
    onPhaseUpdate: (repT, phaseName, activeCycle, yawDeg) => {
      modal3DAngleBadge.textContent = `${phaseName} · Orbit ${yawDeg}°`;
      if (modalViewerInstance && modalViewerInstance.manualCycle === null) {
        modalRepScrubber.value = String(Math.round(activeCycle * 100));
      }
    },
    onSpinStateChange: (isSpinning) => {
      modalSpinToggleBtn.classList.toggle('active', isSpinning);
    }
  });

  modalSpinToggleBtn.classList.add('active');
  modalSpeedBtn.textContent = 'Speed: 1x';
  modalPauseBtn.textContent = '⏸ Pause';
}

function close3DStudioModal() {
  modal3DStudio.classList.add('hidden');
  if (modalViewerInstance && window.PulseLift3D) {
    window.PulseLift3D.removeViewer(modal3DCanvas);
    modalViewerInstance = null;
  }
}

closeModal3DBtn.addEventListener('click', close3DStudioModal);
modal3DStudio.addEventListener('click', (e) => {
  if (e.target === modal3DStudio) close3DStudioModal();
});

modal3DMuscles.addEventListener('mouseover', (e) => {
  const tag = e.target.closest('[data-modal-muscle-key]');
  if (tag && modalViewerInstance) {
    modalViewerInstance.setSpotlightMuscle(tag.getAttribute('data-modal-muscle-key'));
  }
});
modal3DMuscles.addEventListener('mouseout', () => {
  if (modalViewerInstance) modalViewerInstance.setSpotlightMuscle(null);
});
modal3DMuscles.addEventListener('click', (e) => {
  const tag = e.target.closest('[data-modal-muscle-key]');
  if (tag && modalViewerInstance) {
    const key = tag.getAttribute('data-modal-muscle-key');
    const next = modalViewerInstance.spotlightMuscleKey === key ? null : key;
    modalViewerInstance.setSpotlightMuscle(next);
  }
});

modalCamButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!modalViewerInstance) return;
    const [yaw, pitch] = btn.getAttribute('data-modal-cam').split(',').map(Number);
    modalViewerInstance.setCameraAngle(yaw, pitch);
    modalCamButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

modalSpinToggleBtn.addEventListener('click', () => {
  if (!modalViewerInstance) return;
  const spinning = modalViewerInstance.toggleAutoSpin();
  modalSpinToggleBtn.classList.toggle('active', spinning);
  if (spinning) {
    modalCamButtons.forEach((b) => b.classList.remove('active'));
  }
});

modalSpeedBtn.addEventListener('click', () => {
  if (!modalViewerInstance) return;
  modalViewerInstance.speed = modalViewerInstance.speed === 1.0 ? 0.45 : 1.0;
  modalSpeedBtn.textContent =
    modalViewerInstance.speed === 1.0 ? 'Speed: 1x' : 'Speed: 0.5x Slow-Mo';
});

modalPauseBtn.addEventListener('click', () => {
  if (!modalViewerInstance) return;
  modalViewerInstance.manualCycle = null;
  modalViewerInstance.paused = !modalViewerInstance.paused;
  modalPauseBtn.textContent = modalViewerInstance.paused ? '▶ Play' : '⏸ Pause';
});

modalRepScrubber.addEventListener('input', (e) => {
  if (!modalViewerInstance) return;
  const val = Number(e.target.value) / 100;
  modalViewerInstance.paused = true;
  modalViewerInstance.manualCycle = val;
  modalPauseBtn.textContent = '▶ Play';
});

/* ==========================================================================
   Event Handlers for Tracker, Set Pills, 3D Card Controls & History
   ========================================================================== */
function switchDay(dayKey) {
  if (appState.activeDay === dayKey) return;
  appState.activeDay = dayKey;
  saveAppState();
  updateHeaderAndStats();
  renderExerciseCards();
}

tabDayA.addEventListener('click', () => switchDay('dayA'));
tabDayB.addEventListener('click', () => switchDay('dayB'));

autoStartTimerCheckbox.addEventListener('change', (e) => {
  appState.autoStartTimer = e.target.checked;
  saveAppState();
});

// Hovering a Muscle Tag spotlights that muscle on the card's 3D figure
workoutContainer.addEventListener('mouseover', (e) => {
  const muscleTag = e.target.closest('[data-action="spotlight-muscle"]');
  if (!muscleTag || !window.PulseLift3D) return;
  const exId = muscleTag.getAttribute('data-exercise-id');
  const muscleKey = muscleTag.getAttribute('data-muscle-key');
  const viewer = window.PulseLift3D.getViewer(document.getElementById(`canvas3d-${exId}`));
  if (viewer) viewer.setSpotlightMuscle(muscleKey);
});

workoutContainer.addEventListener('mouseout', (e) => {
  const muscleTag = e.target.closest('[data-action="spotlight-muscle"]');
  if (!muscleTag || !window.PulseLift3D) return;
  const exId = muscleTag.getAttribute('data-exercise-id');
  const viewer = window.PulseLift3D.getViewer(document.getElementById(`canvas3d-${exId}`));
  if (viewer) viewer.setSpotlightMuscle(null);
});

workoutContainer.addEventListener('click', (e) => {
  // 1. Toggle Clinical Light / Dark Studio Background on 3D Canvas
  const lightBtn = e.target.closest('[data-action="toggle-clinical-bg"]');
  if (lightBtn && window.PulseLift3D) {
    const exId = lightBtn.getAttribute('data-exercise-id');
    const viewer = window.PulseLift3D.getViewer(document.getElementById(`canvas3d-${exId}`));
    if (viewer) {
      const isLight = viewer.toggleClinicalLight();
      showToast(isLight ? '☀️ Clinical White Ecorché View' : '🌙 Dark Studio View');
    }
    return;
  }

  // 2. Spotlight Muscle Tag on Click/Tap
  const muscleTag = e.target.closest('[data-action="spotlight-muscle"]');
  if (muscleTag && window.PulseLift3D) {
    const exId = muscleTag.getAttribute('data-exercise-id');
    const muscleKey = muscleTag.getAttribute('data-muscle-key');
    const viewer = window.PulseLift3D.getViewer(document.getElementById(`canvas3d-${exId}`));
    if (viewer) {
      const next = viewer.spotlightMuscleKey === muscleKey ? null : muscleKey;
      viewer.setSpotlightMuscle(next);
    }
    return;
  }

  // 3. Card 360° Camera Preset Button
  const camBtn = e.target.closest('[data-action="card-cam"]');
  if (camBtn && window.PulseLift3D) {
    const exId = camBtn.getAttribute('data-exercise-id');
    const yaw = Number(camBtn.getAttribute('data-yaw'));
    const pitch = Number(camBtn.getAttribute('data-pitch'));
    const canvas = document.getElementById(`canvas3d-${exId}`);
    const viewer = window.PulseLift3D.getViewer(canvas);
    if (viewer) {
      viewer.setCameraAngle(yaw, pitch);
      const toolbar = camBtn.closest('.card-360-toolbar');
      if (toolbar) {
        toolbar.querySelectorAll('.mini-cam-btn').forEach((b) => b.classList.remove('active'));
        camBtn.classList.add('active');
      }
    }
    return;
  }

  // 4. Card 360° Auto-Spin Toggle Button
  const spinBtn = e.target.closest('[data-action="card-spin"]');
  if (spinBtn && window.PulseLift3D) {
    const exId = spinBtn.getAttribute('data-exercise-id');
    const canvas = document.getElementById(`canvas3d-${exId}`);
    const viewer = window.PulseLift3D.getViewer(canvas);
    if (viewer) {
      const isSpinning = viewer.toggleAutoSpin();
      const toolbar = spinBtn.closest('.card-360-toolbar');
      if (toolbar && isSpinning) {
        toolbar.querySelectorAll('.mini-cam-btn').forEach((b) => b.classList.remove('active'));
      }
      spinBtn.classList.toggle('active', isSpinning);
    }
    return;
  }

  // 5. Open Full-Screen 360° 3D Studio Modal
  const studioBtn = e.target.closest('[data-action="open-3d-studio"]');
  if (studioBtn) {
    const exId = studioBtn.getAttribute('data-exercise-id');
    open3DStudioModal(exId);
    return;
  }

  // 6. Toggle Set Pill / Set Check Row
  const toggleBtn = e.target.closest('[data-action="toggle-set"]');
  if (toggleBtn) {
    const exId = toggleBtn.getAttribute('data-exercise-id');
    const setIdx = Number(toggleBtn.getAttribute('data-set-index'));
    const exState = appState.exercises[exId];
    if (!exState || !exState.sets[setIdx]) return;

    const newCompleted = !exState.sets[setIdx].completed;
    exState.sets[setIdx].completed = newCompleted;
    saveAppState();

    playSetCompleteBlip(newCompleted);
    updateSingleExerciseCardDOM(exId);
    updateHeaderAndStats();

    if (newCompleted && appState.autoStartTimer) {
      const programEx = findExerciseProgramData(exId);
      if (programEx) {
        startRestTimer(
          programEx.restSeconds,
          `REST · ${programEx.name.toUpperCase()} (${programEx.restLabel})`
        );
      }
    }
    return;
  }

  // 7. Start Exercise Rest Timer
  const restBtn = e.target.closest('[data-action="start-exercise-rest"]');
  if (restBtn) {
    const secs = Number(restBtn.getAttribute('data-rest-seconds')) || 90;
    const label = restBtn.getAttribute('data-rest-label') || 'REST TIMER';
    startRestTimer(secs, label);
    showToast(`Timer started: ${secs === 180 ? '3m' : secs + 's'}`);
    return;
  }

  // 8. Swap Exercise Alternative (e.g., No-Bar Floor Traction vs. Bar Hang on B4)
  const varBtn = e.target.closest('[data-action="swap-variant"]');
  if (varBtn) {
    const exId = varBtn.getAttribute('data-exercise-id');
    const varKey = varBtn.getAttribute('data-variant-key');
    if (appState.exercises[exId]) {
      appState.exercises[exId].variantKey = varKey;
      saveAppState();
      renderExerciseCards();
      const resolved = findExerciseProgramData(exId);
      showToast(`Switched to: ${resolved ? resolved.name : varKey}`);
    }
    return;
  }

  // 9. Card Rearrange Actions (Move Up, Move Down, Move to Other Day, Remove)
  handleRoutineRearrangeClick(e);
});

function autoOrderRoutineDay(dayKey) {
  const list = getDayExercises(dayKey);
  const sorted = [...list].sort((a, b) => {
    const rankA = classifyExercisePillar(a).sequenceRank;
    const rankB = classifyExercisePillar(b).sequenceRank;
    return rankA - rankB;
  });
  appState.customRoutine[dayKey] = sorted.map((x) => x.id);
}

function addExerciseToRoutineDay(dayKey, exId) {
  if (!appState.customRoutine || !Array.isArray(appState.customRoutine[dayKey])) {
    appState.customRoutine = getDefaultRoutineOrder();
  }
  const dayList = appState.customRoutine[dayKey];
  const dayLabel = dayKey === 'dayA' ? 'Day A' : 'Day B';
  if (dayList.includes(exId)) {
    showToast(`Already in ${dayLabel}!`);
    return false;
  }
  const raw = findRawExerciseById(exId);
  if (!raw) return false;
  ensureExerciseState(raw);

  // Insert right before the final Core/Decompression slot if one is at the end
  const lastId = dayList[dayList.length - 1];
  const lastEx = lastId ? findRawExerciseById(lastId) : null;
  if (lastEx && classifyExercisePillar(lastEx).key === 'core' && classifyExercisePillar(raw).key !== 'core') {
    dayList.splice(dayList.length - 1, 0, exId);
  } else {
    dayList.push(exId);
  }

  saveAppState();
  updateHeaderAndStats();
  renderExerciseCards();
  const evalNow = evaluateModeratePlan(dayKey);
  if (evalNow.count > 5) {
    showToast(`⚠️ Added "${raw.name}" (${evalNow.count} exercises on ${dayLabel} — above 5-exercise moderate cap)`);
  } else {
    showToast(`✓ Added "${raw.name}" to ${dayLabel} (${evalNow.count} exercises · Moderate Load)`);
  }
  return true;
}

function handleRoutineRearrangeClick(e) {
  const backTrackerBtn = e.target.closest('[data-action="back-to-tracker"]');
  if (backTrackerBtn) {
    window.location.hash = 'tracker';
    switchPageView('tracker');
    return true;
  }

  const switchCoachDayBtn = e.target.closest('[data-action="coach-switch-day"]');
  if (switchCoachDayBtn) {
    const targetDay = switchCoachDayBtn.getAttribute('data-day');
    if (targetDay === 'dayA' || targetDay === 'dayB') {
      appState.activeDay = targetDay;
      saveAppState();
      updateHeaderAndStats();
      renderExerciseCards();
    }
    return true;
  }

  const equipToggleBtn = e.target.closest('[data-action="toggle-user-equipment"]');
  if (equipToggleBtn) {
    const eqKey = equipToggleBtn.getAttribute('data-equip-key');
    if (eqKey) {
      if (!appState.availableEquipment) {
        appState.availableEquipment = { ...DEFAULT_AVAILABLE_EQUIPMENT };
      }
      appState.availableEquipment[eqKey] = !appState.availableEquipment[eqKey];
      // Ensure at least Bodyweight/Floor stays enabled if everything else is turned off
      const anyEnabled = Object.values(appState.availableEquipment).some(Boolean);
      if (!anyEnabled) {
        appState.availableEquipment.bodyweight = true;
      }
      // If user unchecked Pull-Up Bar while B4 is set to dead-hang, automatically switch B4 to Child's Pose (No Bar)
      if (
        eqKey === 'pullup_bar' &&
        !appState.availableEquipment.pullup_bar &&
        appState.exercises['core-spinal-hang'] &&
        appState.exercises['core-spinal-hang'].variantKey === 'dead-hang'
      ) {
        appState.exercises['core-spinal-hang'].variantKey = 'childs-pose';
      }
      saveAppState();
      updateHeaderAndStats();
      renderExerciseCards();
      const statusStr = appState.availableEquipment[eqKey] ? 'Available ✓' : 'Not Available ✕';
      showToast(`🛠️ ${EQUIPMENT_LABELS[eqKey] || eqKey}: ${statusStr} (Suggestions updated)`);
    }
    return true;
  }

  const swapEquipBtn = e.target.closest('[data-action="coach-swap-equipment"]');
  if (swapEquipBtn) {
    const dKey = swapEquipBtn.getAttribute('data-day') || appState.activeDay;
    const evalNow = evaluateModeratePlan(dKey);
    const arr = appState.customRoutine[dKey];
    if (arr && evalNow.equipmentMismatches.length > 0) {
      evalNow.equipmentMismatches.forEach((m) => {
        if (m.exId === 'core-spinal-hang' && m.reqKey === 'pullup_bar') {
          if (appState.exercises['core-spinal-hang']) {
            appState.exercises['core-spinal-hang'].variantKey = 'childs-pose';
          }
        } else if (m.replacementId && !arr.includes(m.replacementId)) {
          arr[m.index] = m.replacementId;
          const rawRep = findRawExerciseById(m.replacementId);
          if (rawRep) ensureExerciseState(rawRep);
        }
      });
      saveAppState();
      updateHeaderAndStats();
      renderExerciseCards();
      showToast('🔄 Swapped exercises to match your available equipment!');
    }
    return true;
  }

  const moveUpBtn = e.target.closest('[data-action="move-ex-up"]');
  if (moveUpBtn) {
    const dKey = moveUpBtn.getAttribute('data-day');
    const idx = Number(moveUpBtn.getAttribute('data-index'));
    const arr = appState.customRoutine[dKey];
    if (arr && idx > 0 && idx < arr.length) {
      const tmp = arr[idx - 1];
      arr[idx - 1] = arr[idx];
      arr[idx] = tmp;
      saveAppState();
      updateHeaderAndStats();
      renderExerciseCards();
      showToast('Moved exercise earlier in sequence.');
    }
    return true;
  }

  const moveDownBtn = e.target.closest('[data-action="move-ex-down"]');
  if (moveDownBtn) {
    const dKey = moveDownBtn.getAttribute('data-day');
    const idx = Number(moveDownBtn.getAttribute('data-index'));
    const arr = appState.customRoutine[dKey];
    if (arr && idx >= 0 && idx < arr.length - 1) {
      const tmp = arr[idx + 1];
      arr[idx + 1] = arr[idx];
      arr[idx] = tmp;
      saveAppState();
      updateHeaderAndStats();
      renderExerciseCards();
      showToast('Moved exercise later in sequence.');
    }
    return true;
  }

  const transferBtn = e.target.closest('[data-action="transfer-ex-day"]');
  if (transferBtn) {
    const fromDay = transferBtn.getAttribute('data-from-day');
    const toDay = fromDay === 'dayA' ? 'dayB' : 'dayA';
    const idx = Number(transferBtn.getAttribute('data-index'));
    const fromArr = appState.customRoutine[fromDay];
    const toArr = appState.customRoutine[toDay];
    if (fromArr && toArr && fromArr.length > 1 && idx >= 0 && idx < fromArr.length) {
      const [movedId] = fromArr.splice(idx, 1);
      if (!toArr.includes(movedId)) {
        toArr.push(movedId);
      }
      saveAppState();
      updateHeaderAndStats();
      renderExerciseCards();
      const movedEx = findRawExerciseById(movedId);
      showToast(`Moved "${movedEx ? movedEx.name : movedId}" to ${toDay === 'dayA' ? 'Day A' : 'Day B'}`);
    } else if (fromArr && fromArr.length <= 1) {
      showToast('Keep at least 1 exercise on each workout day.');
    }
    return true;
  }

  const removeBtn = e.target.closest('[data-action="remove-ex-day"]');
  if (removeBtn) {
    const dKey = removeBtn.getAttribute('data-day');
    const idx = Number(removeBtn.getAttribute('data-index'));
    const arr = appState.customRoutine[dKey];
    if (arr && arr.length > 1 && idx >= 0 && idx < arr.length) {
      const [removedId] = arr.splice(idx, 1);
      saveAppState();
      updateHeaderAndStats();
      renderExerciseCards();
      const remEx = findRawExerciseById(removedId);
      showToast(`Removed "${remEx ? remEx.name : removedId}" from ${dKey === 'dayA' ? 'Day A' : 'Day B'}`);
    }
    return true;
  }

  const toggleBuilderBtn = e.target.closest('[data-action="toggle-plan-builder"]');
  if (toggleBuilderBtn) {
    appState.planAssistantOpen = !appState.planAssistantOpen;
    saveAppState();
    renderModerateCoachWidget();
    return true;
  }

  const autoOrderBtn = e.target.closest('[data-action="coach-auto-order"]');
  if (autoOrderBtn) {
    const dKey = autoOrderBtn.getAttribute('data-day') || appState.activeDay;
    autoOrderRoutineDay(dKey);
    saveAppState();
    updateHeaderAndStats();
    renderExerciseCards();
    showToast('✨ Auto-ordered: Compound Legs → Upper Push/Pull → Core & Decompression!');
    return true;
  }

  const autoOrderBothBtn = e.target.closest('[data-action="coach-auto-order-both"]');
  if (autoOrderBothBtn) {
    autoOrderRoutineDay('dayA');
    autoOrderRoutineDay('dayB');
    saveAppState();
    updateHeaderAndStats();
    renderExerciseCards();
    showToast('✨ Auto-ordered both Day A & Day B for optimal energy & spine safety!');
    return true;
  }

  const trimBtn = e.target.closest('[data-action="coach-trim-moderate"]');
  if (trimBtn) {
    const dKey = trimBtn.getAttribute('data-day') || appState.activeDay;
    autoOrderRoutineDay(dKey);
    const arr = appState.customRoutine[dKey];
    if (arr && arr.length > 5) {
      // Keep the first 4 core compounds + the final decompression exercise
      const lastCore = arr[arr.length - 1];
      appState.customRoutine[dKey] = [...arr.slice(0, 4), lastCore];
      saveAppState();
      updateHeaderAndStats();
      renderExerciseCards();
      showToast('⚖️ Trimmed to 5 exercises (15 sets) — back in the Moderate Sweet Spot!');
    }
    return true;
  }

  const quickAddPillarBtn = e.target.closest('[data-action="coach-add-exercise"]');
  if (quickAddPillarBtn) {
    const dKey = quickAddPillarBtn.getAttribute('data-day') || appState.activeDay;
    const exId = quickAddPillarBtn.getAttribute('data-ex-id');
    if (exId) addExerciseToRoutineDay(dKey, exId);
    return true;
  }

  const selectAddBtn = e.target.closest('[data-action="builder-select-add"]');
  if (selectAddBtn) {
    const dKey = selectAddBtn.getAttribute('data-day');
    const sel = document.getElementById(`quickAddSelect-${dKey}`);
    if (sel && sel.value) {
      addExerciseToRoutineDay(dKey, sel.value);
    }
    return true;
  }

  const resetDefaultBtn = e.target.closest('[data-action="coach-reset-default-plan"]');
  if (resetDefaultBtn) {
    appState.customRoutine = getDefaultRoutineOrder();
    saveAppState();
    updateHeaderAndStats();
    renderExerciseCards();
    showToast('↺ Restored Default Moderate 2-Day Full-Body Plan!');
    return true;
  }

  return false;
}

if (togglePlanAssistantBtn) {
  togglePlanAssistantBtn.addEventListener('click', () => {
    window.location.hash = 'planner';
    switchPageView('planner');
  });
}

if (moderateCoachWidget) {
  moderateCoachWidget.addEventListener('click', (e) => {
    handleRoutineRearrangeClick(e);
  });
}

workoutContainer.addEventListener('input', (e) => {
  const target = e.target;
  const action = target.getAttribute('data-action');
  if (action !== 'input-weight' && action !== 'input-reps') return;

  const exId = target.getAttribute('data-exercise-id');
  const setIdx = Number(target.getAttribute('data-set-index'));
  const exState = appState.exercises[exId];
  if (!exState || !exState.sets[setIdx]) return;

  const val = Math.max(0, Number(target.value) || 0);
  if (action === 'input-weight') {
    exState.sets[setIdx].weight = val;
  } else {
    exState.sets[setIdx].reps = val;
  }

  saveAppState();
  updateHeaderAndStats();
});

function findExerciseProgramData(exId) {
  for (const dayKey of ['dayA', 'dayB']) {
    const dayExs = getDayExercises(dayKey);
    const foundInRoutine = dayExs.find((x) => x.id === exId);
    if (foundInRoutine) return foundInRoutine;
  }
  const raw = findRawExerciseById(exId);
  if (raw) return getResolvedExerciseData(raw);
  return null;
}

function updateSingleExerciseCardDOM(exId) {
  const card = workoutContainer.querySelector(`[data-card-exercise="${exId}"]`);
  if (!card) return;
  const exState = appState.exercises[exId];
  const programEx = findExerciseProgramData(exId);
  const allSetsDone = exState.sets.every((s) => s.completed);

  card.classList.toggle('card-completed', allSetsDone);
  const badge = card.querySelector('.exercise-order-badge');
  if (badge && programEx) {
    const pillarInfo = classifyExercisePillar(programEx);
    badge.textContent = `${programEx.order} · ${pillarInfo.label} · ${allSetsDone ? 'COMPLETED' : '3D MUSCLE MAP'}`;
  }

  const pills = card.querySelectorAll('.set-pill');
  pills.forEach((pill, idx) => {
    const isDone = exState.sets[idx].completed;
    pill.classList.toggle('completed', isDone);
    pill.setAttribute('aria-pressed', String(isDone));
    pill.innerHTML = `<span>Set ${idx + 1}</span><span>${isDone ? '✓' : '○'}</span>`;
  });

  const rows = card.querySelectorAll('.set-log-row');
  rows.forEach((row, idx) => {
    const isDone = exState.sets[idx].completed;
    row.classList.toggle('row-completed', isDone);
    const checkBtn = row.querySelector('.set-check-btn');
    if (checkBtn) {
      checkBtn.classList.toggle('completed', isDone);
    }
  });
}

resetDayBtn.addEventListener('click', () => {
  const dayKey = appState.activeDay;
  const exercises = getDayExercises(dayKey);
  exercises.forEach((ex) => {
    const exState = ensureExerciseState(ex);
    exState.sets.forEach((s) => {
      s.completed = false;
    });
  });
  saveAppState();
  updateHeaderAndStats();
  renderExerciseCards();
  showToast(`${dayKey === 'dayA' ? 'Day A' : 'Day B'} completed sets reset.`);
});

logWorkoutBtn.addEventListener('click', () => {
  const dayKey = appState.activeDay;
  const exercises = getDayExercises(dayKey);
  const stats = calculateDayStats(dayKey);

  const now = new Date();
  const formattedDate = now.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const entry = {
    id: Date.now(),
    dayKey,
    dayTitle: dayKey === 'dayA' ? 'Day A Full-Body Routine' : 'Day B Full-Body Routine',
    isoDate: toLocalIsoDate(now),
    weekdayIdx: getMonFirstWeekdayIdx(now),
    timestamp: formattedDate,
    completedSets: stats.completedSets,
    totalSets: stats.totalSets,
    totalVolume: stats.totalVolume,
    exercises: exercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      sets: ensureExerciseState(ex).sets.map((s) => ({ ...s }))
    }))
  };

  workoutHistory.unshift(entry);
  if (workoutHistory.length > 100) {
    workoutHistory = workoutHistory.slice(0, 100);
  }
  saveWorkoutHistory({
    reason: `Logged ${dayKey === 'dayA' ? 'Plan A' : 'Plan B'} (${entry.isoDate})`
  });
  if (appState.autoDownloadBackupOnLog) {
    exportBackupJsonFile(`pulselift-auto-backup-${dayKey}`);
  }
  renderHistoryPanel();
  historyDrawer.classList.remove('hidden');
  toggleHistoryBtn.setAttribute('aria-expanded', 'true');
  showToast(`🛡️ Logged & Auto-Backed Up ${dayKey === 'dayA' ? 'Plan A' : 'Plan B'} (${WEEKDAY_NAMES_FULL[entry.weekdayIdx]})!`);
});

function backfillWorkoutOnDate(dayKey, isoDateStr, customExercisesList = null) {
  const targetDayKey = dayKey === 'dayB' ? 'dayB' : 'dayA';
  const exercises = getDayExercises(targetDayKey);
  const stats = calculateDayStats(targetDayKey);

  // Parse YYYY-MM-DD in local time at 18:00
  let dateObj = new Date();
  if (isoDateStr && /^\d{4}-\d{2}-\d{2}$/.test(isoDateStr)) {
    const [y, m, d] = isoDateStr.split('-').map(Number);
    dateObj = new Date(y, m - 1, d, 18, 0, 0);
  }

  const formattedDate = dateObj.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const resolvedExercises = Array.isArray(customExercisesList) && customExercisesList.length > 0
    ? customExercisesList
    : exercises.map((ex) => ({
        id: ex.id,
        name: ex.name,
        sets: ensureExerciseState(ex).sets.map((s) => ({ ...s, completed: true }))
      }));

  let totalSets = 0;
  let completedSets = 0;
  let calcVol = 0;
  resolvedExercises.forEach((ex) => {
    (ex.sets || []).forEach((s) => {
      totalSets += 1;
      if (s.completed !== false) {
        completedSets += 1;
        const w = Number(s.weight) || 0;
        const r = Number(s.reps) || 0;
        if (w > 0 && r > 0) calcVol += w * r;
      }
    });
  });

  const entry = {
    id: dateObj.getTime() + Math.floor(Math.random() * 900),
    dayKey: targetDayKey,
    dayTitle: targetDayKey === 'dayA' ? 'Day A Full-Body Routine' : 'Day B Full-Body Routine',
    isoDate: toLocalIsoDate(dateObj),
    weekdayIdx: getMonFirstWeekdayIdx(dateObj),
    timestamp: formattedDate,
    completedSets: completedSets || totalSets || stats.totalSets,
    totalSets: totalSets || stats.totalSets,
    totalVolume: Math.round(calcVol),
    exercises: resolvedExercises
  };

  workoutHistory.unshift(entry);
  workoutHistory.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  if (workoutHistory.length > 100) {
    workoutHistory = workoutHistory.slice(0, 100);
  }
  saveWorkoutHistory({
    reason: `Backfilled ${targetDayKey === 'dayA' ? 'Plan A' : 'Plan B'} (${entry.isoDate})`
  });
  renderHistoryPanel();
  showToast(
    `📅 Logged & Backed Up ${targetDayKey === 'dayA' ? '🟦 Plan A' : '🟪 Plan B'} on ${WEEKDAY_NAMES_FULL[entry.weekdayIdx]} (${entry.isoDate})`
  );
}

/* ==========================================================================
   "Forgot to Key In Data?" Pop-Out Modal (Quick-Log & Custom Backfill)
   ========================================================================== */
const backfillWorkoutModal = document.getElementById('backfillWorkoutModal');
const backfillModalContent = document.getElementById('backfillModalContent');
const openBackfillModalBtn = document.getElementById('openBackfillModalBtn');
const closeBackfillModalBtn = document.getElementById('closeBackfillModalBtn');

const backfillModalState = {
  isoDate: toLocalIsoDate(new Date()),
  dayKey: 'dayA',
  draftExercises: {} // { dayA: [...], dayB: [...] }
};

function buildBackfillDraftForDay(dayKey) {
  const exercises = getDayExercises(dayKey);
  return exercises.map((ex) => {
    const st = ensureExerciseState(ex);
    return {
      id: ex.id,
      name: ex.name,
      scheme: ex.scheme || ex.prescription || '3 sets',
      sets: st.sets.map((s) => ({
        weight: Number(s.weight) || 0,
        reps: Number(s.reps) || 10,
        completed: true
      }))
    };
  });
}

function openBackfillModal(initialIsoDate = null, initialDayKey = null) {
  if (!backfillWorkoutModal) return;
  backfillModalState.isoDate =
    initialIsoDate && /^\d{4}-\d{2}-\d{2}$/.test(initialIsoDate)
      ? initialIsoDate
      : toLocalIsoDate(new Date());
  backfillModalState.dayKey =
    initialDayKey === 'dayB' || initialDayKey === 'dayA'
      ? initialDayKey
      : appState.activeDay || 'dayA';
  backfillModalState.draftExercises = {
    dayA: buildBackfillDraftForDay('dayA'),
    dayB: buildBackfillDraftForDay('dayB')
  };
  renderBackfillModalContent();
  backfillWorkoutModal.classList.remove('hidden');
}

function closeBackfillModal() {
  if (!backfillWorkoutModal) return;
  backfillWorkoutModal.classList.add('hidden');
}

function getRelativeIsoDate(daysAgo) {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  return toLocalIsoDate(dt);
}

function renderBackfillModalContent() {
  if (!backfillModalContent) return;
  const iso = backfillModalState.isoDate;
  const dKey = backfillModalState.dayKey;
  const todayIso = toLocalIsoDate(new Date());
  const yestIso = getRelativeIsoDate(1);
  const twoDaysAgoIso = getRelativeIsoDate(2);
  const threeDaysAgoIso = getRelativeIsoDate(3);

  const [y, m, d] = iso.split('-').map(Number);
  const selDateObj = new Date(y, m - 1, d, 12, 0, 0);
  const wkName = WEEKDAY_NAMES_FULL[getMonFirstWeekdayIdx(selDateObj)] || 'Day';

  if (!backfillModalState.draftExercises[dKey]) {
    backfillModalState.draftExercises[dKey] = buildBackfillDraftForDay(dKey);
  }
  const draftList = backfillModalState.draftExercises[dKey];

  let totalVol = 0;
  let totalSets = 0;
  draftList.forEach((ex) => {
    ex.sets.forEach((s) => {
      totalSets += 1;
      const w = Number(s.weight) || 0;
      const r = Number(s.reps) || 0;
      if (w > 0 && r > 0) totalVol += w * r;
    });
  });

  const exercisesEditorHtml = draftList
    .map(
      (ex, exIdx) => `
      <div class="backfill-ex-card">
        <div class="backfill-ex-header">
          <strong>${escapeHtml(ex.name)}</strong>
          <span class="rep-scheme-badge">${escapeHtml(ex.scheme)}</span>
        </div>
        <div class="backfill-sets-row">
          ${ex.sets
            .map(
              (s, setIdx) => `
              <div class="backfill-set-chip">
                <span class="backfill-set-num">Set ${setIdx + 1}</span>
                <label class="backfill-mini-field">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value="${s.weight}"
                    data-backfill-input="weight"
                    data-ex-idx="${exIdx}"
                    data-set-idx="${setIdx}"
                  />
                  <span>kg</span>
                </label>
                <span class="backfill-mult">×</span>
                <label class="backfill-mini-field">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value="${s.reps}"
                    data-backfill-input="reps"
                    data-ex-idx="${exIdx}"
                    data-set-idx="${setIdx}"
                  />
                  <span>reps</span>
                </label>
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    `
    )
    .join('');

  backfillModalContent.innerHTML = `
    <!-- Quick 1-Click Bar (Matches the Quick-Log bar from before, now inside the pop-out) -->
    <div class="quick-backfill-bar modal-quick-bar">
      <div class="backfill-date-group">
        <span class="backfill-label">📅 WORKOUT DATE:</span>
        <input type="date" id="backfillDateInput" class="backfill-date-input" value="${iso}" aria-label="Select date to log workout" />
        <span class="history-weekday-tag">🗓️ ${wkName} (${iso})</span>
      </div>
      <div class="backfill-date-presets">
        <button type="button" class="lib-filter-pill ${iso === todayIso ? 'active' : ''}" data-backfill-date="${todayIso}">Today</button>
        <button type="button" class="lib-filter-pill ${iso === yestIso ? 'active' : ''}" data-backfill-date="${yestIso}">Yesterday</button>
        <button type="button" class="lib-filter-pill ${iso === twoDaysAgoIso ? 'active' : ''}" data-backfill-date="${twoDaysAgoIso}">2 Days Ago</button>
        <button type="button" class="lib-filter-pill ${iso === threeDaysAgoIso ? 'active' : ''}" data-backfill-date="${threeDaysAgoIso}">3 Days Ago</button>
      </div>
    </div>

    <!-- Fast 1-Click Log Buttons -->
    <div class="backfill-instant-row">
      <span class="backfill-instant-label">⚡ 1-Click Quick-Log (Uses Saved Weights):</span>
      <div class="backfill-instant-btns">
        <button type="button" class="lib-filter-pill plan-a-btn" data-backfill-action="instant-log" data-day="dayA">
          + Log 🟦 Plan A on ${iso}
        </button>
        <button type="button" class="lib-filter-pill plan-b-btn" data-backfill-action="instant-log" data-day="dayB">
          + Log 🟪 Plan B on ${iso}
        </button>
      </div>
    </div>

    <!-- Or Key In / Customize Weights & Reps for Selected Plan -->
    <div class="backfill-custom-section">
      <div class="backfill-custom-header">
        <div>
          <span class="exercise-order-badge">OPTIONAL: REVIEW OR ADJUST WEIGHTS &amp; REPS</span>
          <h3 class="backfill-sub-title">Key In Exact Sets for ${wkName} (${iso})</h3>
        </div>
        <div class="library-filter-pills" role="group" aria-label="Select Plan to Edit">
          <button type="button" class="lib-filter-pill ${dKey === 'dayA' ? 'active' : ''}" data-backfill-action="select-plan" data-day="dayA">
            🟦 Edit Plan A Sets
          </button>
          <button type="button" class="lib-filter-pill ${dKey === 'dayB' ? 'active' : ''}" data-backfill-action="select-plan" data-day="dayB">
            🟪 Edit Plan B Sets
          </button>
        </div>
      </div>

      <div class="backfill-ex-grid">
        ${exercisesEditorHtml}
      </div>

      <div class="backfill-modal-footer">
        <div class="backfill-vol-summary">
          <span>Selected: <strong>${dKey === 'dayA' ? '🟦 Plan A' : '🟪 Plan B'}</strong> on <strong>${wkName}, ${iso}</strong></span>
          <span>· <strong>${totalSets} sets</strong> · <strong id="backfillLiveVolText">${Math.round(totalVol).toLocaleString()} kg</strong> total volume</span>
        </div>
        <div class="backfill-footer-btns">
          <button type="button" class="btn-secondary btn-sm" data-backfill-action="close">Cancel</button>
          <button type="button" class="btn-accent btn-sm" data-backfill-action="save-custom">
            ✅ Save &amp; Key In ${dKey === 'dayA' ? 'Plan A' : 'Plan B'} on ${iso}
          </button>
        </div>
      </div>
    </div>
  `;
}

if (openBackfillModalBtn) {
  openBackfillModalBtn.addEventListener('click', () => {
    openBackfillModal(null, appState.activeDay);
  });
}

if (closeBackfillModalBtn) {
  closeBackfillModalBtn.addEventListener('click', closeBackfillModal);
}

if (backfillWorkoutModal) {
  backfillWorkoutModal.addEventListener('click', (e) => {
    if (e.target === backfillWorkoutModal) {
      closeBackfillModal();
      return;
    }

    const datePresetBtn = e.target.closest('[data-backfill-date]');
    if (datePresetBtn) {
      backfillModalState.isoDate = datePresetBtn.getAttribute('data-backfill-date');
      renderBackfillModalContent();
      return;
    }

    const actBtn = e.target.closest('[data-backfill-action]');
    if (!actBtn) return;
    const act = actBtn.getAttribute('data-backfill-action');

    if (act === 'close') {
      closeBackfillModal();
    } else if (act === 'select-plan') {
      backfillModalState.dayKey = actBtn.getAttribute('data-day') || 'dayA';
      renderBackfillModalContent();
    } else if (act === 'instant-log') {
      const targetDay = actBtn.getAttribute('data-day') || 'dayA';
      const dateInput = document.getElementById('backfillDateInput');
      const isoVal = dateInput ? dateInput.value : backfillModalState.isoDate;
      backfillWorkoutOnDate(targetDay, isoVal);
      closeBackfillModal();
    } else if (act === 'save-custom') {
      const dateInput = document.getElementById('backfillDateInput');
      const isoVal = dateInput ? dateInput.value : backfillModalState.isoDate;
      const targetDay = backfillModalState.dayKey;
      const customExs = backfillModalState.draftExercises[targetDay] || null;
      backfillWorkoutOnDate(targetDay, isoVal, customExs);
      closeBackfillModal();
    }
  });

  backfillWorkoutModal.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'backfillDateInput' && e.target.value) {
      backfillModalState.isoDate = e.target.value;
      renderBackfillModalContent();
    }
  });

  backfillWorkoutModal.addEventListener('input', (e) => {
    const inp = e.target;
    const field = inp.getAttribute('data-backfill-input');
    if (!field) return;
    const exIdx = Number(inp.getAttribute('data-ex-idx'));
    const setIdx = Number(inp.getAttribute('data-set-idx'));
    const dKey = backfillModalState.dayKey;
    const list = backfillModalState.draftExercises[dKey];
    if (!list || !list[exIdx] || !list[exIdx].sets[setIdx]) return;
    const val = Math.max(0, Number(inp.value) || 0);
    if (field === 'weight') {
      list[exIdx].sets[setIdx].weight = val;
    } else if (field === 'reps') {
      list[exIdx].sets[setIdx].reps = val;
    }
    let totalVol = 0;
    list.forEach((ex) => {
      ex.sets.forEach((s) => {
        const w = Number(s.weight) || 0;
        const r = Number(s.reps) || 0;
        if (w > 0 && r > 0) totalVol += w * r;
      });
    });
    const volEl = document.getElementById('backfillLiveVolText');
    if (volEl) volEl.textContent = `${Math.round(totalVol).toLocaleString()} kg`;
  });
}

function resetToTwoDayRealHistory() {
  workoutHistory = getInitialTwoDaysHistory();
  saveWorkoutHistory({
    reason: 'Restored 2-Day History (Plan A & Plan B)',
    replaceExactHistory: true
  });
  renderHistoryPanel();
  showToast('✅ Restored your 2 days of workout history (1× Plan A, 1× Plan B)!');
}

toggleHistoryBtn.addEventListener('click', () => {
  const isHidden = historyDrawer.classList.toggle('hidden');
  toggleHistoryBtn.setAttribute('aria-expanded', String(!isHidden));
  if (!isHidden) {
    renderHistoryPanel();
    historyDrawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});

closeHistoryBtn.addEventListener('click', () => {
  historyDrawer.classList.add('hidden');
  toggleHistoryBtn.setAttribute('aria-expanded', 'false');
});

clearHistoryBtn.addEventListener('click', () => {
  if (workoutHistory.length > 0) {
    createBackupSnapshot('Pre-Clear Safety Backup');
  }
  workoutHistory = [];
  saveWorkoutHistory({ reason: 'Cleared History', allowEmptyOverwrite: true });
  renderHistoryPanel();
  showToast('Workout history cleared (Safety Snapshot saved in Backup Vault — click Restore anytime).');
});

historyDrawer.addEventListener('click', (e) => {
  const openBackfillBtn = e.target.closest('[data-open-backfill-modal]');
  if (openBackfillBtn) {
    openBackfillModal(null, appState.activeDay);
    return;
  }

  const openAnalysisBtn = e.target.closest('[data-open-history-analysis]');
  if (openAnalysisBtn) {
    historyDrawer.classList.add('hidden');
    toggleHistoryBtn.setAttribute('aria-expanded', 'false');
    window.location.hash = 'history';
    switchPageView('history');
    return;
  }

  const backupActBtn = e.target.closest('[data-drawer-backup]');
  if (backupActBtn) {
    const act = backupActBtn.getAttribute('data-drawer-backup');
    if (act === 'restore-latest') {
      const snapId = backupActBtn.getAttribute('data-snapshot-id');
      if (snapId) restoreFromSnapshot(snapId);
    } else if (act === 'sync-recover') {
      initAutoBackupAndRecovery(true);
    } else if (act === 'export-json') {
      exportBackupJsonFile();
      showToast('📥 Downloaded workout backup JSON file!');
    }
  }
});

/* ==========================================================================
   Rest & Recovery Countdown Timer Widget
   ========================================================================== */
const restTimerWidget = document.getElementById('restTimerWidget');
const timerDisplay = document.getElementById('timerDisplay');
const timerModeLabel = document.getElementById('timerModeLabel');
const timerRingProgress = document.getElementById('timerRingProgress');
const timerPlayPauseBtn = document.getElementById('timerPlayPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const timerMinus15Btn = document.getElementById('timerMinus15Btn');
const timerPlus15Btn = document.getElementById('timerPlus15Btn');
const timerResetBtn = document.getElementById('timerResetBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundIconOn = document.getElementById('soundIconOn');
const soundIconOff = document.getElementById('soundIconOff');
const timerFlashOverlay = document.getElementById('timerFlashOverlay');
const presetButtons = document.querySelectorAll('.preset-btn');

const RING_CIRCUMFERENCE = 2 * Math.PI * 27;

let timerTotalSeconds = 90;
let timerRemainingSeconds = 90;
let timerIntervalId = null;
let timerIsRunning = false;

function formatTimeMMSS(totalSecs) {
  const clamped = Math.max(0, Math.ceil(totalSecs));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateTimerUI() {
  timerDisplay.textContent = formatTimeMMSS(timerRemainingSeconds);

  const fraction =
    timerTotalSeconds > 0
      ? Math.max(0, Math.min(1, timerRemainingSeconds / timerTotalSeconds))
      : 0;
  const offset = RING_CIRCUMFERENCE * (1 - fraction);
  timerRingProgress.style.strokeDashoffset = `${offset}`;

  if (timerRemainingSeconds <= 10 && timerRemainingSeconds > 0) {
    timerRingProgress.style.stroke = '#fb7185';
  } else {
    timerRingProgress.style.stroke = '#2dd4bf';
  }

  playIcon.classList.toggle('hidden', timerIsRunning);
  pauseIcon.classList.toggle('hidden', !timerIsRunning);
  restTimerWidget.classList.toggle('timer-running', timerIsRunning);
}

function startRestTimer(seconds, customLabel) {
  if (typeof seconds === 'number' && seconds > 0) {
    timerTotalSeconds = seconds;
    timerRemainingSeconds = seconds;
  }
  if (customLabel) {
    timerModeLabel.textContent = customLabel;
  }

  presetButtons.forEach((btn) => {
    const btnSecs = Number(btn.getAttribute('data-seconds'));
    btn.classList.toggle('active', btnSecs === timerTotalSeconds);
  });

  restTimerWidget.classList.remove('timer-alert');
  timerFlashOverlay.classList.remove('active');

  if (timerIntervalId) clearInterval(timerIntervalId);
  timerIsRunning = true;
  updateTimerUI();

  const targetEndTime = Date.now() + timerRemainingSeconds * 1000;

  timerIntervalId = setInterval(() => {
    const msLeft = targetEndTime - Date.now();
    timerRemainingSeconds = Math.max(0, Math.ceil(msLeft / 1000));
    updateTimerUI();

    if (msLeft <= 0) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
      timerIsRunning = false;
      timerRemainingSeconds = 0;
      updateTimerUI();
      triggerTimerFinishedAlert();
    }
  }, 200);
}

function toggleTimerPlayPause() {
  getAudioContext();
  if (timerIsRunning) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
    timerIsRunning = false;
    updateTimerUI();
  } else {
    if (timerRemainingSeconds <= 0) {
      timerRemainingSeconds = timerTotalSeconds;
    }
    startRestTimer(timerRemainingSeconds);
  }
}

function resetTimer() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  timerIsRunning = false;
  timerRemainingSeconds = timerTotalSeconds;
  restTimerWidget.classList.remove('timer-alert');
  timerFlashOverlay.classList.remove('active');
  updateTimerUI();
}

function nudgeTimer(deltaSeconds) {
  timerRemainingSeconds = Math.max(0, timerRemainingSeconds + deltaSeconds);
  timerTotalSeconds = Math.max(timerTotalSeconds, timerRemainingSeconds);
  if (timerIsRunning) {
    startRestTimer(timerRemainingSeconds);
  } else {
    updateTimerUI();
  }
}

function triggerTimerFinishedAlert() {
  restTimerWidget.classList.add('timer-alert');
  timerFlashOverlay.classList.remove('active');
  void timerFlashOverlay.offsetWidth;
  timerFlashOverlay.classList.add('active');

  play8BitTimerChime();

  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([140, 70, 140, 70, 280]);
    } catch (_) {}
  }

  showToast('⏰ Rest complete! Ready for your next set.');
}

function updateSoundToggleUI() {
  soundIconOn.classList.toggle('hidden', !appState.soundEnabled);
  soundIconOff.classList.toggle('hidden', appState.soundEnabled);
}

timerPlayPauseBtn.addEventListener('click', toggleTimerPlayPause);
timerResetBtn.addEventListener('click', resetTimer);
timerMinus15Btn.addEventListener('click', () => nudgeTimer(-15));
timerPlus15Btn.addEventListener('click', () => nudgeTimer(15));

soundToggleBtn.addEventListener('click', () => {
  appState.soundEnabled = !appState.soundEnabled;
  saveAppState();
  updateSoundToggleUI();
  if (appState.soundEnabled) {
    play8BitTimerChime();
    showToast('🔊 8-Bit Chime Enabled (Preview played)');
  } else {
    showToast('🔇 Timer Audio Muted');
  }
});

presetButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    getAudioContext();
    const secs = Number(btn.getAttribute('data-seconds'));
    const label = btn.getAttribute('data-label');
    startRestTimer(secs, label);
  });
});

/* ==========================================================================
   PWA Service Worker & Install Prompt Registration
   ========================================================================== */
const installPwaBtn = document.getElementById('installPwaBtn');
const pwaStatusText = document.getElementById('pwaStatusText');
let deferredInstallPrompt = null;

if ('serviceWorker' in navigator) {
  let reloadingForSw = false;
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_UPDATED' && !reloadingForSw) {
      reloadingForSw = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    // Purge any stale v1-v6 caches so updated 3D models always load fresh
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((k) => {
          if (k !== 'pulselift-workout-v10') {
            caches.delete(k);
          }
        });
      });
    }

    navigator.serviceWorker
      .register('./sw.js?v=10', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update();
        pwaStatusText.textContent = navigator.onLine ? 'Offline Ready' : 'Offline Mode';
      })
      .catch((err) => {
        console.warn('Service worker registration warning:', err);
      });
  });
}

window.addEventListener('online', () => {
  pwaStatusText.textContent = 'Offline Ready';
});

window.addEventListener('offline', () => {
  pwaStatusText.textContent = 'Offline Active';
  showToast('Running offline — all progress saved locally.');
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installPwaBtn.classList.remove('hidden');
});

installPwaBtn.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installPwaBtn.classList.add('hidden');
});

/* ==========================================================================
   How to Use / Interactive Tutorial Modal & Guided Spotlight Tour
   ========================================================================== */
const openTutorialBtn = document.getElementById('openTutorialBtn');
const tutorialModal = document.getElementById('tutorialModal');
const closeTutorialBtn = document.getElementById('closeTutorialBtn');
const gotItTutorialBtn = document.getElementById('gotItTutorialBtn');
const startGuidedTourBtn = document.getElementById('startGuidedTourBtn');

const guidedTourPopover = document.getElementById('guidedTourPopover');
const tourStepCounter = document.getElementById('tourStepCounter');
const tourStepTitle = document.getElementById('tourStepTitle');
const tourStepText = document.getElementById('tourStepText');
const tourPrevBtn = document.getElementById('tourPrevBtn');
const tourNextBtn = document.getElementById('tourNextBtn');
const tourCloseBtn = document.getElementById('tourCloseBtn');

function openTutorialModal() {
  endGuidedTour();
  tutorialModal.classList.remove('hidden');
}

function closeTutorialModal() {
  tutorialModal.classList.add('hidden');
}

if (openTutorialBtn) openTutorialBtn.addEventListener('click', openTutorialModal);
if (closeTutorialBtn) closeTutorialBtn.addEventListener('click', closeTutorialModal);
if (gotItTutorialBtn) gotItTutorialBtn.addEventListener('click', closeTutorialModal);
if (tutorialModal) {
  tutorialModal.addEventListener('click', (e) => {
    if (e.target === tutorialModal) closeTutorialModal();
  });
}

const GUIDED_TOUR_STEPS = [
  {
    selector: '.stage-3d-column',
    title: '1. Hover Muscles & Rotate 360°',
    text: 'Move your cursor directly over any muscle on the 3D body (or hover a muscle pill) to pop up its name without clutter. Drag left/right to orbit 360°, or click "⤢ 360° Studio" to scrub reps!'
  },
  {
    selector: '.tracker-section',
    title: '2. Log Weight (kg), Reps & Set Pills',
    text: 'Enter your dumbbell weight (kg) and completed reps for Sets 1, 2, and 3. Click Set 1 / Set 2 / Set 3 (or ✓) to mark sets complete—everything saves automatically.'
  },
  {
    selector: '.day-overview-card',
    title: '3. Day A / B Progress & Save Workout Log',
    text: 'Track total completed sets and lifted volume (kg). Click "Save Workout Log" when finished to store your session in History, or "Reset Day" for your next workout.'
  },
  {
    selector: '#restTimerWidget',
    title: '4. Smart Rest Timer & 8-Bit Chime',
    text: 'Checking off a set automatically starts the recommended rest countdown (90s Compound, 60s Upper/Lunges, 3m Decompress). At 00:00, it flashes and plays an 8-bit chime!'
  }
];

let currentTourStep = -1;

function clearTourHighlights() {
  document.querySelectorAll('.tour-highlight-ring').forEach((el) => {
    el.classList.remove('tour-highlight-ring');
  });
}

function renderTourStep(idx) {
  clearTourHighlights();
  if (idx < 0 || idx >= GUIDED_TOUR_STEPS.length) {
    endGuidedTour();
    return;
  }
  currentTourStep = idx;
  const step = GUIDED_TOUR_STEPS[idx];
  const targetEl = document.querySelector(step.selector);

  if (targetEl) {
    targetEl.classList.add('tour-highlight-ring');
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  tourStepCounter.textContent = `TOUR ${idx + 1} / ${GUIDED_TOUR_STEPS.length}`;
  tourStepTitle.textContent = step.title;
  tourStepText.textContent = step.text;
  tourPrevBtn.disabled = idx === 0;
  tourNextBtn.textContent = idx === GUIDED_TOUR_STEPS.length - 1 ? 'Finish ✓' : 'Next →';
  guidedTourPopover.classList.remove('hidden');
}

function endGuidedTour() {
  clearTourHighlights();
  currentTourStep = -1;
  if (guidedTourPopover) guidedTourPopover.classList.add('hidden');
}

if (startGuidedTourBtn) {
  startGuidedTourBtn.addEventListener('click', () => {
    closeTutorialModal();
    renderTourStep(0);
  });
}

if (tourPrevBtn) {
  tourPrevBtn.addEventListener('click', () => {
    if (currentTourStep > 0) renderTourStep(currentTourStep - 1);
  });
}

if (tourNextBtn) {
  tourNextBtn.addEventListener('click', () => {
    if (currentTourStep < GUIDED_TOUR_STEPS.length - 1) {
      renderTourStep(currentTourStep + 1);
    } else {
      endGuidedTour();
      showToast('🎉 Tour completed! Hover any 3D muscle to try it out.');
    }
  });
}

if (tourCloseBtn) {
  tourCloseBtn.addEventListener('click', endGuidedTour);
}

/* ==========================================================================
   Exercise Library (5 Equipment Sections + GUI Muscle Mannequin Filter)
   ========================================================================== */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const MUSCLE_FRIENDLY_LABELS = {
  pecs: 'Pectorals (Chest)',
  frontDelts: 'Front Delts',
  sideDelts: 'Side Delts',
  rearDelts: 'Rear Delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms & Grip',
  core: 'Core / Abs',
  quads: 'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  lats: 'Lats',
  upperBack: 'Upper Back & Traps',
  lowerBack: 'Lower Back'
};

const EXERCISE_LIBRARY_SECTIONS = [
  {
    key: 'dumbbell',
    title: '1. Dumbbell Exercises',
    icon: '🏋️',
    subtitle: 'Complete free-weight dumbbell encyclopedia: presses, flyes, rows, raises, curls, extensions, squats, hinges, lunges, and rotational core work.'
  },
  {
    key: 'barbell',
    title: '2. Barbell Exercises',
    icon: '🧱',
    subtitle: 'Complete barbell & EZ-bar encyclopedia: powerlifting compounds, Olympic lifts, squats, deadlifts, presses, rows, and isolation movements.'
  },
  {
    key: 'kettlebell',
    title: '3. Kettlebell Exercises',
    icon: '🔔',
    subtitle: 'Complete kettlebell encyclopedia: ballistic swings, snatches, cleans, presses, goblet & rack squats, Turkish get-ups, and loaded carries.'
  },
  {
    key: 'bodyweight',
    title: '4. Bodyweight Exercises',
    icon: '🤸',
    subtitle: 'Complete calisthenics & bodyweight encyclopedia: push-up progressions, pull-ups, dips, single-leg squats, gymnastics core, and spinal decompression.'
  },
  {
    key: 'other',
    title: '5. Other Equipment Exercises',
    icon: '⚙️',
    subtitle: 'Complete gym & specialty equipment encyclopedia: Cable Pulleys, Gym Machines, Dip Stations, Resistance Bands, Medicine Balls, Battle Ropes, and Sleds.'
  }
];

function makeEx(section, order, id, poseId, equipmentLabel, name, prescription, mechanic, difficulty, primaryKeys, secondaryKeys, cues) {
  const muscleDetails = [
    ...primaryKeys.map((k) => ({
      name: MUSCLE_FRIENDLY_LABELS[k] || k,
      key: k,
      primary: true
    })),
    ...secondaryKeys.map((k) => ({
      name: MUSCLE_FRIENDLY_LABELS[k] || k,
      key: k,
      primary: false
    }))
  ];
  return {
    id,
    poseId,
    section,
    equipmentLabel,
    order,
    name,
    prescription,
    mechanic,
    difficulty,
    muscleDetails,
    cues
  };
}

function buildExerciseActiveMusclesMap(ex) {
  const list = ex.muscles || ex.muscleDetails || [];
  if (!list.length) return null;
  const map = {};
  list.forEach((m) => {
    map[m.key] = m.primary ? 1.0 : 0.68;
  });
  return map;
}

const EXERCISE_LIBRARY_DATA = [
  /* ==========================================================================
     SECTION 1: DUMBBELL EXERCISES (45 Exercises)
     ========================================================================== */
  makeEx('dumbbell', 'DB-01', 'goblet-squats', 'goblet-squats', 'Dumbbell', 'Dumbbell Goblet Squat', '3 × 10–12 reps', 'Compound', 'Beginner', ['quads', 'glutes'], ['core', 'upperBack'], [
    'Cup top plates of the dumbbell vertically against your sternum with elbows tucked.',
    'Sit hips down and back between your knees while keeping your chest tall.',
    'Drive through mid-foot and heels to stand tall and squeeze glutes at lockout.'
  ]),
  makeEx('dumbbell', 'DB-02', 'floor-press', 'floor-press', 'Dumbbell', 'Dumbbell Floor Press', '3 × 8–12 reps', 'Compound', 'Beginner', ['pecs', 'triceps'], ['frontDelts', 'core'], [
    'Lie flat on the solid floor mat with knees bent and upper back planted.',
    'Lower dumbbells with elbows at a 45° tuck until triceps pause gently on the mat.',
    'Press explosively to lockout over mid-chest without bouncing elbows.'
  ]),
  makeEx('dumbbell', 'DB-03', 'bent-over-rows', 'bent-over-rows', 'Dumbbell', 'Dumbbell Bent-Over Row', '3 × 10–12 reps', 'Compound', 'Intermediate', ['lats', 'upperBack'], ['rearDelts', 'biceps', 'lowerBack'], [
    'Hinge hips back to a ~45° torso angle with a flat, neutral spine.',
    'Pull dumbbells toward your hip pockets in a smooth arc, squeezing shoulder blades.',
    'Lower under full control to a deep lat stretch without rounding shoulders.'
  ]),
  makeEx('dumbbell', 'DB-04', 'rdls', 'rdls', 'Dumbbell', 'Dumbbell Romanian Deadlift (RDL)', '3 × 10–12 reps', 'Compound', 'Intermediate', ['hamstrings', 'glutes'], ['lowerBack', 'forearms'], [
    'Keep a soft ~15° knee bend and push hips straight backward toward the wall.',
    'Shave the dumbbells down the front of your thighs and shins with lats packed.',
    'Stop at mid-shin when hamstrings reach full stretch, then snap hips forward.'
  ]),
  makeEx('dumbbell', 'DB-05', 'overhead-press', 'overhead-press', 'Dumbbell', 'Standing Dumbbell Overhead Press', '3 × 8–12 reps', 'Compound', 'Intermediate', ['frontDelts', 'sideDelts', 'triceps'], ['core', 'upperBack'], [
    'Squeeze glutes and brace abs so your lower back stays neutral (no rib flare).',
    'Press dumbbells vertically from shoulder height in a slight scapular-plane arc.',
    'Lock out directly stacked over shoulders, ears, and mid-foot.'
  ]),
  makeEx('dumbbell', 'DB-06', 'reverse-lunges', 'reverse-lunges', 'Dumbbell', 'Dumbbell Reverse Lunges', '3 × 10 / leg', 'Compound', 'Beginner', ['quads', 'glutes'], ['hamstrings', 'calves', 'forearms'], [
    'Step backward hip-width apart and lower until both knees form ~90° angles.',
    'Keep your front shin vertical and slight forward torso lean to load the front glute.',
    'Drive firmly through your front heel to return to the standing stance.'
  ]),
  makeEx('dumbbell', 'DB-07', 'db-flat-bench', 'db-bench-press', 'Dumbbell', 'Dumbbell Flat Bench Press', '4 × 8–12 reps', 'Compound', 'Beginner', ['pecs', 'triceps'], ['frontDelts'], [
    'Retract shoulder blades into the flat bench pad with feet planted firmly.',
    'Lower dumbbells with a 45° elbow angle for a deep pectoral stretch at chest level.',
    'Press up and slightly inward until dumbbells almost touch over mid-chest.'
  ]),
  makeEx('dumbbell', 'DB-08', 'db-incline-press', 'db-bench-press', 'Dumbbell', 'Dumbbell Incline Bench Press (30°)', '4 × 8–12 reps', 'Compound', 'Intermediate', ['pecs', 'frontDelts'], ['triceps'], [
    'Set bench to a 30°–45° incline to bias the clavicular (upper) pectoral fibers.',
    'Lower dumbbells under control to the sides of your upper chest.',
    'Drive vertically overhead without letting shoulders roll forward off the pad.'
  ]),
  makeEx('dumbbell', 'DB-09', 'db-decline-press', 'db-bench-press', 'Dumbbell', 'Dumbbell Decline Bench Press', '3 × 10–12 reps', 'Compound', 'Intermediate', ['pecs', 'triceps'], ['frontDelts'], [
    'Secure feet on a slight 15° decline bench to emphasize lower sternal pec fibers.',
    'Lower dumbbells to the lower chest line while keeping wrists stacked over elbows.',
    'Press smoothly to lockout and squeeze the lower chest.'
  ]),
  makeEx('dumbbell', 'DB-10', 'db-flat-fly', 'db-chest-fly', 'Dumbbell', 'Dumbbell Flat Chest Fly', '3 × 12–15 reps', 'Isolation', 'Beginner', ['pecs'], ['frontDelts', 'biceps'], [
    'Start with dumbbells above chest, palms facing each other and a soft 20° elbow bend.',
    'Open arms in a wide hugging arc until you feel a deep stretch across the chest.',
    'Squeeze pecs together to bring the dumbbells back up along the same arc.'
  ]),
  makeEx('dumbbell', 'DB-11', 'db-incline-fly', 'db-chest-fly', 'Dumbbell', 'Dumbbell Incline Chest Fly', '3 × 12–15 reps', 'Isolation', 'Beginner', ['pecs', 'frontDelts'], ['biceps'], [
    'Perform on a 30° incline bench to isolate the upper chest clavicular head.',
    'Keep elbow angle fixed as you lower into a controlled stretch.',
    'Bring hands together above your collarbone by contracting the upper pecs.'
  ]),
  makeEx('dumbbell', 'DB-12', 'db-crush-press', 'db-bench-press', 'Dumbbell', 'Dumbbell Squeeze (Hex) Press', '3 × 12–15 reps', 'Compound', 'Beginner', ['pecs', 'triceps'], ['frontDelts'], [
    'Press two hexagonal dumbbells tightly against each other with neutral palms.',
    'Maintain constant inward crushing pressure as you lower to your sternum and press up.',
    'Maximizes peak inner-pectoral and tricep contraction throughout the entire rep.'
  ]),
  makeEx('dumbbell', 'DB-13', 'db-pullover', 'db-chest-fly', 'Dumbbell', 'Dumbbell Bench Pullover', '3 × 10–12 reps', 'Compound', 'Intermediate', ['lats', 'pecs'], ['triceps', 'core'], [
    'Lie perpendicular or flat on the bench holding one dumbbell with both hands overhead.',
    'Keep a slight elbow bend and arc the weight backward behind your head for a lat/ribcage stretch.',
    'Pull the dumbbell back over your chest by driving with your lats and sternal pecs.'
  ]),
  makeEx('dumbbell', 'DB-14', 'db-single-arm-row', 'bent-over-rows', 'Dumbbell', 'Single-Arm Tripod Dumbbell Row', '3 × 10–12 / arm', 'Compound', 'Beginner', ['lats', 'upperBack'], ['biceps', 'rearDelts', 'forearms'], [
    'Brace your non-working hand on a bench with a flat, horizontal back.',
    'Sweep the dumbbell backward toward your hip crease like starting a lawnmower.',
    'Avoid twisting the torso—let the scapula protract at the bottom and retract at the top.'
  ]),
  makeEx('dumbbell', 'DB-15', 'db-chest-supported-row', 'bent-over-rows', 'Dumbbell', 'Chest-Supported Incline Dumbbell Row', '3 × 10–15 reps', 'Compound', 'Beginner', ['upperBack', 'lats'], ['rearDelts', 'biceps'], [
    'Lie chest-down on a 30°–45° incline bench to eliminate lower-back momentum.',
    'Row both dumbbells up and back while squeezing rhomboids and mid-traps together.',
    'Pause 1 second at the top before lowering slowly to a full stretch.'
  ]),
  makeEx('dumbbell', 'DB-16', 'db-renegade-row', 'bw-pushup', 'Dumbbell', 'Dumbbell Renegade Row', '3 × 8 / side', 'Compound', 'Advanced', ['core', 'lats', 'pecs'], ['triceps', 'upperBack', 'frontDelts'], [
    'Assume a wide-foot push-up plank gripping hex dumbbells on the floor.',
    'Brace glutes and obliques hard to prevent hip rotation as you row one dumbbell to your ribs.',
    'Alternate sides with zero hip sway, combining anti-rotation core stability with back pulling.'
  ]),
  makeEx('dumbbell', 'DB-17', 'db-shrug', 'shrug-upright', 'Dumbbell', 'Standing Dumbbell Shrugs', '4 × 12–15 reps', 'Isolation', 'Beginner', ['upperBack'], ['forearms'], [
    'Hold heavy dumbbells at your sides with arms completely straight.',
    'Elevate your shoulders straight up toward your ears (slight upward-and-back angle).',
    'Hold peak trap contraction for 2 full seconds before lowering under control.'
  ]),
  makeEx('dumbbell', 'DB-18', 'db-seated-ohp', 'overhead-press', 'Dumbbell', 'Seated Dumbbell Shoulder Press', '4 × 8–12 reps', 'Compound', 'Beginner', ['frontDelts', 'sideDelts'], ['triceps', 'upperBack'], [
    'Sit upright against an 80°–85° backrest with feet planted wide for stability.',
    'Lower dumbbells until handles reach ear/chin level with forearms vertical.',
    'Press smoothly overhead without clanging the weights together at the top.'
  ]),
  makeEx('dumbbell', 'DB-19', 'db-arnold-press', 'overhead-press', 'Dumbbell', 'Dumbbell Arnold Press', '3 × 10–12 reps', 'Compound', 'Intermediate', ['frontDelts', 'sideDelts'], ['triceps', 'rearDelts'], [
    'Start at chin height with palms facing you (supinated) like the top of a bicep curl.',
    'Rotate palms outward 180° as you press the dumbbells overhead in one fluid motion.',
    'Reverse the rotation on the way down to hit all three heads of the deltoid.'
  ]),
  makeEx('dumbbell', 'DB-20', 'db-lateral-raise', 'db-lateral-raise', 'Dumbbell', 'Standing Dumbbell Lateral Raise', '4 × 12–15 reps', 'Isolation', 'Beginner', ['sideDelts'], ['frontDelts', 'upperBack'], [
    'Stand tall with a slight 15° elbow bend and dumbbells held just in front of hips.',
    'Sweep arms outward in the scapular plane (30° forward) up to shoulder height.',
    'Lead with your elbows and lower slowly over 3 seconds for peak lateral delt tension.'
  ]),
  makeEx('dumbbell', 'DB-21', 'db-rear-delt-fly', 'bent-over-rows', 'Dumbbell', 'Bent-Over Dumbbell Rear Delt Fly', '3 × 15–20 reps', 'Isolation', 'Beginner', ['rearDelts', 'upperBack'], ['sideDelts', 'lowerBack'], [
    'Hinge torso forward nearly parallel to the floor with a soft bend in the elbows.',
    'Sweep dumbbells wide out to the sides in a reverse-fly arc, leading with pinkies/elbows.',
    'Focus on isolating the posterior deltoids rather—avoid shrugging the upper traps.'
  ]),
  makeEx('dumbbell', 'DB-22', 'db-front-raise', 'db-lateral-raise', 'Dumbbell', 'Alternating Dumbbell Front Raise', '3 × 12 / arm', 'Isolation', 'Beginner', ['frontDelts'], ['pecs', 'sideDelts', 'core'], [
    'Hold dumbbells in front of thighs with a neutral or pronated grip.',
    'Raise one arm straight forward to eye level without swinging your torso.',
    'Lower slowly under control before raising the opposite arm.'
  ]),
  makeEx('dumbbell', 'DB-23', 'db-upright-row', 'shrug-upright', 'Dumbbell', 'Dumbbell Wide-Grip Upright Row', '3 × 10–12 reps', 'Compound', 'Intermediate', ['sideDelts', 'upperBack'], ['frontDelts', 'biceps', 'forearms'], [
    'Hold dumbbells in front of thighs and pull elbows high and wide up to shoulder level.',
    'Keep the dumbbells slightly wider than shoulder-width for comfortable shoulder mechanics.',
    'Lower smoothly without letting shoulders slump forward.'
  ]),
  makeEx('dumbbell', 'DB-24', 'db-bicep-curl', 'db-bicep-curl', 'Dumbbell', 'Dumbbell Supinating Bicep Curl', '3 × 10–12 reps', 'Isolation', 'Beginner', ['biceps'], ['forearms', 'frontDelts'], [
    'Pin your upper arms against your ribcage so elbows do not swing forward.',
    'Supinate wrists (turn pinkies up) as you curl the dumbbells toward shoulders.',
    'Squeeze biceps hard at the top, then lower all the way to full elbow extension.'
  ]),
  makeEx('dumbbell', 'DB-25', 'db-hammer-curl', 'db-bicep-curl', 'Dumbbell', 'Dumbbell Neutral-Grip Hammer Curl', '3 × 10–12 reps', 'Isolation', 'Beginner', ['biceps', 'forearms'], ['frontDelts'], [
    'Keep palms facing each other (neutral thumbs-up grip) throughout the entire curl.',
    'Targets the brachialis and brachioradialis for upper-arm thickness and forearm strength.',
    'Pause briefly at the top and lower with zero body momentum.'
  ]),
  makeEx('dumbbell', 'DB-26', 'db-incline-curl', 'db-bicep-curl', 'Dumbbell', 'Incline Bench Dumbbell Bicep Curl', '3 × 10–12 reps', 'Isolation', 'Intermediate', ['biceps'], ['forearms'], [
    'Sit back on a 45°–60° incline bench and let arms hang straight behind your torso.',
    'Places the long head of the biceps under a loaded stretch at the bottom of every rep.',
    'Curl up while keeping elbows pointed straight at the floor.'
  ]),
  makeEx('dumbbell', 'DB-27', 'db-concentration-curl', 'db-bicep-curl', 'Dumbbell', 'Seated Dumbbell Concentration Curl', '3 × 12 / arm', 'Isolation', 'Beginner', ['biceps'], ['forearms'], [
    'Sit on a bench and brace the back of your working upper arm against your inner thigh.',
    'Curl the dumbbell toward your face with strict isolation and zero shoulder involvement.',
    'Squeeze the bicep peak for 1 second at the top before lowering.'
  ]),
  makeEx('dumbbell', 'DB-28', 'db-zottman-curl', 'db-bicep-curl', 'Dumbbell', 'Dumbbell Zottman Curl', '3 × 10–12 reps', 'Isolation', 'Intermediate', ['biceps', 'forearms'], [], [
    'Curl the dumbbells up with palms supinated (facing up) to overload the biceps.',
    'Rotate wrists 180° at the top so palms face down (pronated).',
    'Lower slowly over 3 seconds in the pronated grip to hammer the forearms and brachioradialis.'
  ]),
  makeEx('dumbbell', 'DB-29', 'db-wrist-curl', 'db-bicep-curl', 'Dumbbell', 'Seated Dumbbell Wrist Curl & Extension', '3 × 15–20 reps', 'Isolation', 'Beginner', ['forearms'], [], [
    'Rest forearms flat across your thighs or a bench with wrists hanging over the edge.',
    'Let the dumbbell roll into fingers, then curl wrists upward for full forearm flexion.',
    'Flip palms down for reverse wrist curls to train wrist extensors equally.'
  ]),
  makeEx('dumbbell', 'DB-30', 'db-overhead-tricep', 'tricep-overhead', 'Dumbbell', 'Overhead Dumbbell Tricep Extension', '3 × 10–15 reps', 'Isolation', 'Beginner', ['triceps'], ['core', 'frontDelts'], [
    'Cup the top plate of one dumbbell overhead with both hands and elbows tucked in.',
    'Lower the weight behind your head to maximally stretch the long head of the triceps.',
    'Extend elbows straight up to full lockout while keeping ribs braced.'
  ]),
  makeEx('dumbbell', 'DB-31', 'db-skullcrusher', 'floor-press', 'Dumbbell', 'Lying Dumbbell Tricep Extension (Skullcrusher)', '3 × 10–12 reps', 'Isolation', 'Intermediate', ['triceps'], ['forearms'], [
    'Lie flat and hold a pair of dumbbells with neutral palms angled slightly back.',
    'Hinge only at the elbows to lower the bells beside your temples.',
    'Extend forearms back to lockout using pure tricep contraction.'
  ]),
  makeEx('dumbbell', 'DB-32', 'db-tricep-kickback', 'bent-over-rows', 'Dumbbell', 'Dumbbell Tricep Kickback', '3 × 12–15 reps', 'Isolation', 'Beginner', ['triceps'], ['rearDelts'], [
    'Hinge torso forward and pin your upper arms parallel to your torso.',
    'Extend forearms straight back until elbows lock out completely.',
    'Squeeze the shortened tricep position for 1 full second before bending the elbow.'
  ]),
  makeEx('dumbbell', 'DB-33', 'db-tate-press', 'db-bench-press', 'Dumbbell', 'Dumbbell Tate Press', '3 × 12–15 reps', 'Isolation', 'Intermediate', ['triceps'], ['pecs'], [
    'Lie flat with dumbbells held over chest and elbows flared outward.',
    'Bend elbows inward so the inner ends of the dumbbells touch your chest without moving upper arms.',
    'Snap elbows back to full extension to isolate the lateral and medial tricep heads.'
  ]),
  makeEx('dumbbell', 'DB-34', 'db-walking-lunge', 'reverse-lunges', 'Dumbbell', 'Dumbbell Walking Lunges', '3 × 12 steps / leg', 'Compound', 'Intermediate', ['quads', 'glutes'], ['hamstrings', 'calves', 'forearms'], [
    'Hold dumbbells at your sides with proud posture and take a controlled stride forward.',
    'Lower until your back knee hovers 1 inch above the floor.',
    'Drive through your front foot to step directly into the next forward lunge.'
  ]),
  makeEx('dumbbell', 'DB-35', 'db-bulgarian-split-squat', 'reverse-lunges', 'Dumbbell', 'Dumbbell Bulgarian Split Squat', '3 × 8–12 / leg', 'Compound', 'Intermediate', ['quads', 'glutes'], ['hamstrings', 'calves', 'core'], [
    'Elevate your rear foot laces-down on a bench behind you and hold dumbbells at your sides.',
    'Lower your hips down and slightly back until your front thigh is parallel to the floor.',
    'Drive hard through your front foot—lean torso slightly forward for glutes or stay upright for quads.'
  ]),
  makeEx('dumbbell', 'DB-36', 'db-step-up', 'reverse-lunges', 'Dumbbell', 'Dumbbell Box / Bench Step-Ups', '3 × 10 / leg', 'Compound', 'Beginner', ['quads', 'glutes'], ['hamstrings', 'calves'], [
    'Place your entire working foot flat on a knee-height box or bench.',
    'Lean slightly forward and drive through the elevated heel without pushing off the back foot.',
    'Lower yourself back down over 2–3 seconds under strict single-leg control.'
  ]),
  makeEx('dumbbell', 'DB-37', 'db-sumo-squat', 'goblet-squats', 'Dumbbell', 'Dumbbell Wide-Stance Sumo Squat', '3 × 12–15 reps', 'Compound', 'Beginner', ['glutes', 'quads'], ['hamstrings', 'core'], [
    'Take a wide stance with toes turned out 45° and hold a heavy dumbbell hanging between legs.',
    'Push knees wide in line with toes as you squat deep with a vertical torso.',
    'Squeeze glutes and inner thighs (adductors) on the way up.'
  ]),
  makeEx('dumbbell', 'DB-38', 'db-single-leg-rdl', 'rdls', 'Dumbbell', 'Single-Leg Dumbbell RDL', '3 × 10 / leg', 'Compound', 'Intermediate', ['hamstrings', 'glutes'], ['lowerBack', 'core', 'forearms'], [
    'Balance on one leg with a soft knee bend and reach the back leg straight behind you like a seesaw.',
    'Keep hips square to the floor as the dumbbell travels down to mid-shin.',
    'Drive the standing hip forward to return to upright posture.'
  ]),
  makeEx('dumbbell', 'DB-39', 'db-hip-thrust', 'hip-thrust', 'Dumbbell', 'Dumbbell Bench Hip Thrust', '3 × 12–15 reps', 'Compound', 'Beginner', ['glutes'], ['hamstrings', 'core'], [
    'Rest upper back across a bench with a heavy dumbbell held across your hip crease.',
    'Drive through heels to extend hips until thighs and torso form a flat tabletop.',
    'Keep chin tucked and ribs down to isolate the gluteus maximus at peak lockout.'
  ]),
  makeEx('dumbbell', 'DB-40', 'db-calf-raise', 'calf-raise', 'Dumbbell', 'Standing Dumbbell Calf Raise', '4 × 15–20 reps', 'Isolation', 'Beginner', ['calves'], ['forearms'], [
    'Stand with balls of your feet on a step or flat platform holding heavy dumbbells.',
    'Lower heels into a deep 2-second stretch, then press up high onto your big toes.',
    'Pause 1 second at peak plantarflexion on every rep.'
  ]),
  makeEx('dumbbell', 'DB-41', 'db-thruster', 'overhead-press', 'Dumbbell', 'Dumbbell Full-Body Thrusters', '3 × 10–12 reps', 'Compound', 'Intermediate', ['quads', 'glutes', 'frontDelts'], ['triceps', 'core'], [
    'Hold dumbbells at shoulder height and descend into a full front squat.',
    'Drive explosively out of the bottom and transfer leg momentum directly into an overhead press.',
    'Lower weights back to shoulders smoothly as you descend into the next rep.'
  ]),
  makeEx('dumbbell', 'DB-42', 'db-devils-press', 'other-medball-slam', 'Dumbbell', "Dumbbell Devil's Press", '3 × 8–10 reps', 'Compound', 'Advanced', ['core', 'glutes', 'frontDelts', 'pecs'], ['hamstrings', 'triceps', 'lats'], [
    'Perform a chest-to-floor burpee holding hex dumbbells, then jump feet wide.',
    'Hike the dumbbells between your legs and snap hips to swing them straight overhead in one motion.',
    'High-output full-body conditioning combining a burpee, press, and double snatch.'
  ]),
  makeEx('dumbbell', 'DB-43', 'db-russian-twist', 'core-decompression', 'Dumbbell', 'Weighted Dumbbell Russian Twist', '3 × 20 total reps', 'Core & Mobility', 'Beginner', ['core'], ['forearms'], [
    'Sit in a V-sit position with torso leaned back 45° and knees bent.',
    'Hold one dumbbell at chest height and rotate your ribcage side-to-side.',
    'Move from your obliques rather than just swinging your arms.'
  ]),
  makeEx('dumbbell', 'DB-44', 'db-side-bend', 'other-farmers-carry', 'Dumbbell', 'Standing Dumbbell Oblique Side Bend', '3 × 15 / side', 'Isolation', 'Beginner', ['core'], ['forearms', 'lowerBack'], [
    'Hold a single dumbbell in one hand and stand tall with feet hip-width apart.',
    'Allow the dumbbell to slide down the outside of your thigh by laterally flexing your spine.',
    'Contract the opposite obliques and quadratus lumborum to pull your torso upright.'
  ]),
  makeEx('dumbbell', 'DB-45', 'db-woodchopper', 'other-medball-slam', 'Dumbbell', 'Dumbbell Rotational Woodchopper', '3 × 12 / side', 'Core & Mobility', 'Beginner', ['core', 'frontDelts'], ['glutes', 'quads'], [
    'Hold one dumbbell with both hands near your outside knee in a quarter squat.',
    'Pivot your back foot and drive diagonally across your body to lift the bell overhead.',
    'Control the diagonal return path with braced obliques.'
  ]),

  /* ==========================================================================
     SECTION 2: BARBELL EXERCISES (35 Exercises)
     ========================================================================== */
  makeEx('barbell', 'BB-01', 'bb-back-squat', 'bb-back-squat', 'Barbell', 'Barbell High-Bar Back Squat', '4 × 6–8 reps', 'Compound', 'Intermediate', ['quads', 'glutes'], ['hamstrings', 'lowerBack', 'core'], [
    'Rest the barbell across your upper traps, pulling down on the bar to engage lats.',
    'Take a 360° diaphragmatic breath and descend until hip crease passes below knees.',
    'Keep knees tracking over toes and drive chest and hips up together out of the hole.'
  ]),
  makeEx('barbell', 'BB-02', 'bb-low-bar-squat', 'bb-back-squat', 'Barbell', 'Barbell Low-Bar Powerlifting Squat', '4 × 5 reps', 'Compound', 'Intermediate', ['glutes', 'quads', 'hamstrings'], ['lowerBack', 'core'], [
    'Shelf the barbell slightly lower across the rear deltoids with a proud, braced back.',
    'Sit hips further back with a slightly more inclined torso angle to recruit maximum posterior chain.',
    'Drive hips straight up out of the bottom while maintaining upper-back tightness.'
  ]),
  makeEx('barbell', 'BB-03', 'bb-front-squat', 'bb-back-squat', 'Barbell', 'Barbell Clean-Grip Front Squat', '4 × 6–8 reps', 'Compound', 'Intermediate', ['quads', 'core'], ['glutes', 'upperBack'], [
    'Rack the barbell across your front deltoids with fingertips under the bar and elbows high.',
    'Maintain a vertical torso as you squat deep—high elbows prevent the bar from rolling forward.',
    'Places tremendous demand on the quadriceps and thoracic extensors.'
  ]),
  makeEx('barbell', 'BB-04', 'bb-zercher-squat', 'goblet-squats', 'Barbell', 'Barbell Zercher Squat', '3 × 6–8 reps', 'Compound', 'Advanced', ['quads', 'glutes', 'core', 'upperBack'], ['biceps', 'lowerBack'], [
    'Cradle the barbell in the crooks of your elbows with knuckles clasped tightly together.',
    'Squat deep until elbows pass between your knees while bracing your entire anterior core.',
    'Stand up powerfully—unmatched for upper-back, core, and quad ruggedness.'
  ]),
  makeEx('barbell', 'BB-05', 'bb-box-squat', 'bb-back-squat', 'Barbell', 'Barbell Parallel Box Squat', '4 × 5–8 reps', 'Compound', 'Intermediate', ['glutes', 'hamstrings', 'quads'], ['lowerBack', 'core'], [
    'Sit hips back with vertical shins until you pause gently on a parallel box.',
    'Keep your core 100% braced on the box (do not rock or relax spinal tension).',
    'Explode upward from the dead-stop pause to build concentric starting strength.'
  ]),
  makeEx('barbell', 'BB-06', 'bb-overhead-squat', 'bb-overhead-press', 'Barbell', 'Barbell Snatch-Grip Overhead Squat', '3 × 5–8 reps', 'Compound', 'Advanced', ['quads', 'glutes', 'frontDelts', 'sideDelts'], ['upperBack', 'core', 'lowerBack'], [
    'Hold the barbell locked out overhead with a wide snatch grip and active upward shoulder press.',
    'Descend into a full squat while keeping the bar stacked directly over your mid-foot.',
    'The ultimate test of ankle, hip, and thoracic mobility paired with full-body stability.'
  ]),
  makeEx('barbell', 'BB-07', 'bb-hack-squat', 'bb-deadlift', 'Barbell', 'Barbell Behind-the-Back Hack Squat', '3 × 8–10 reps', 'Compound', 'Intermediate', ['quads'], ['glutes', 'forearms', 'core'], [
    'Stand in front of the barbell and grip it behind your calves/hamstrings.',
    'Keep torso upright and drive knees forward as you pull the bar up the back of your legs.',
    'Old-school quad builder invented by George Hackenschmidt.'
  ]),
  makeEx('barbell', 'BB-08', 'bb-lunge', 'reverse-lunges', 'Barbell', 'Barbell Back-Rack Reverse Lunge', '3 × 8 / leg', 'Compound', 'Intermediate', ['quads', 'glutes'], ['hamstrings', 'core', 'lowerBack'], [
    'Secure the barbell across your upper traps just like a back squat.',
    'Step backward into a controlled lunge while keeping your torso tall and hips square.',
    'Drive through the lead heel to return to the starting position.'
  ]),
  makeEx('barbell', 'BB-09', 'bb-split-squat', 'reverse-lunges', 'Barbell', 'Barbell Bulgarian Split Squat', '3 × 8 / leg', 'Compound', 'Advanced', ['quads', 'glutes'], ['hamstrings', 'core'], [
    'Elevate your rear foot on a bench with a loaded barbell across your upper back.',
    'Descend under strict control to full single-leg depth.',
    'Drive straight up to build unilateral leg size and hip stability.'
  ]),
  makeEx('barbell', 'BB-10', 'bb-deadlift', 'bb-deadlift', 'Barbell', 'Barbell Conventional Deadlift', '3 × 5–6 reps', 'Compound', 'Advanced', ['hamstrings', 'glutes', 'lowerBack'], ['lats', 'quads', 'forearms', 'upperBack'], [
    'Align barbell over mid-foot, grip just outside shins, and pull slack out of the bar.',
    'Push the floor away with your legs while keeping the bar dragging close up the shins.',
    'Lock out by driving hips into the bar and standing tall without hyperextending spine.'
  ]),
  makeEx('barbell', 'BB-11', 'bb-sumo-deadlift', 'bb-deadlift', 'Barbell', 'Barbell Wide-Stance Sumo Deadlift', '3 × 5–6 reps', 'Compound', 'Advanced', ['glutes', 'quads', 'hamstrings'], ['lowerBack', 'forearms', 'upperBack'], [
    'Take a wide stance with toes angled out 45° and grip the bar inside your knees.',
    'Wedge hips close to the bar with a tall chest and push knees wide.',
    'Drive the floor apart with your feet to lock out hips and knees simultaneously.'
  ]),
  makeEx('barbell', 'BB-12', 'bb-rdl', 'rdls', 'Barbell', 'Barbell Romanian Deadlift (RDL)', '3 × 8–10 reps', 'Compound', 'Intermediate', ['hamstrings', 'glutes'], ['lowerBack', 'lats', 'forearms'], [
    'Unrack at hip height, unlock knees 15°, and push hips straight backward.',
    'Keep lats engaged so the barbell slides directly along your thighs and upper shins.',
    'Reverse the movement as soon as your hips stop moving backward.'
  ]),
  makeEx('barbell', 'BB-13', 'bb-stiff-leg-dl', 'bb-deadlift', 'Barbell', 'Barbell Stiff-Leg Deadlift', '3 × 8–10 reps', 'Compound', 'Intermediate', ['hamstrings', 'lowerBack'], ['glutes', 'forearms'], [
    'Start each rep from the floor with legs nearly straight and hips high.',
    'Places maximum lengthen-range stretch on the hamstrings and spinal erectors.',
    'Maintain a braced neutral spine from floor to lockout.'
  ]),
  makeEx('barbell', 'BB-14', 'bb-rack-pull', 'bb-deadlift', 'Barbell', 'Barbell Elevated Rack Pull', '3 × 6–8 reps', 'Compound', 'Intermediate', ['upperBack', 'lowerBack', 'glutes'], ['lats', 'forearms', 'hamstrings'], [
    'Set safety pins just below or above the kneecap inside a power rack.',
    'Pull the heavy barbell to full lockout, squeezing traps, lats, and glutes hard at the top.',
    'Builds tremendous upper-back thickness and lockout strength.'
  ]),
  makeEx('barbell', 'BB-15', 'bb-hip-thrust', 'hip-thrust', 'Barbell', 'Barbell Padded Hip Thrust', '4 × 8–12 reps', 'Compound', 'Beginner', ['glutes'], ['hamstrings', 'core', 'quads'], [
    'Position upper back against a bench and roll a padded barbell over your hip crease.',
    'Drive through heels to full hip extension with shins vertical at the top.',
    'Hold peak glute squeeze for 1–2 seconds with chin tucked.'
  ]),
  makeEx('barbell', 'BB-16', 'bb-glute-bridge', 'hip-thrust', 'Barbell', 'Barbell Floor Glute Bridge', '3 × 10–12 reps', 'Compound', 'Beginner', ['glutes'], ['hamstrings', 'core'], [
    'Lie flat on the floor mat with knees bent and padded barbell over hips.',
    'Bridge hips up until knees, hips, and shoulders form a straight diagonal line.',
    'Shortened range of motion isolates the glutes with minimal quad involvement.'
  ]),
  makeEx('barbell', 'BB-17', 'bb-good-morning', 'rdls', 'Barbell', 'Barbell Good Morning', '3 × 8–10 reps', 'Compound', 'Intermediate', ['hamstrings', 'lowerBack', 'glutes'], ['core', 'upperBack'], [
    'Place the barbell across your back-squat shelf and unlock knees slightly.',
    'Hinge hips far backward until your torso approaches 30°–45° above parallel.',
    'Drive hips forward to stand tall—strengthens the entire posterior chain for squats and deadlifts.'
  ]),
  makeEx('barbell', 'BB-18', 'bb-bench-press', 'bb-bench-press', 'Barbell', 'Barbell Flat Bench Press', '4 × 6–10 reps', 'Compound', 'Intermediate', ['pecs', 'triceps', 'frontDelts'], ['core'], [
    'Plant feet firmly on the floor and retract shoulder blades into the flat bench pad.',
    'Lower the bar under control to your lower sternum with forearms vertical.',
    'Press the bar slightly back toward the rack until elbows lock out over shoulders.'
  ]),
  makeEx('barbell', 'BB-19', 'bb-incline-bench', 'bb-bench-press', 'Barbell', 'Barbell Incline Bench Press', '4 × 8–10 reps', 'Compound', 'Intermediate', ['pecs', 'frontDelts'], ['triceps'], [
    'Set bench to a 30° incline and grip the bar slightly wider than shoulder-width.',
    'Lower the bar smoothly to your upper chest just below the clavicles.',
    'Drive straight up to build upper-chest shelf and anterior deltoid strength.'
  ]),
  makeEx('barbell', 'BB-20', 'bb-decline-bench', 'bb-bench-press', 'Barbell', 'Barbell Decline Bench Press', '3 × 8–10 reps', 'Compound', 'Intermediate', ['pecs', 'triceps'], ['frontDelts'], [
    'Lie on a 15° decline bench with feet hooked securely.',
    'Lower the bar to the lower sternum with elbows tucked ~45°.',
    'Press to lockout—reduces shoulder strain while overloading the lower pectorals.'
  ]),
  makeEx('barbell', 'BB-21', 'bb-close-grip-bench', 'bb-bench-press', 'Barbell', 'Close-Grip Barbell Bench Press', '3 × 8–10 reps', 'Compound', 'Intermediate', ['triceps', 'pecs'], ['frontDelts'], [
    'Grip the barbell shoulder-width apart (do not put hands touching, which strains wrists).',
    'Keep elbows tucked close to your ribs as you lower the bar to your lower chest.',
    'Press explosively to lockout for heavy compound tricep overload.'
  ]),
  makeEx('barbell', 'BB-22', 'bb-floor-press', 'floor-press', 'Barbell', 'Barbell Floor Press', '3 × 6–8 reps', 'Compound', 'Intermediate', ['triceps', 'pecs'], ['frontDelts', 'core'], [
    'Lie flat on the floor inside a rack and unrack the barbell over mid-chest.',
    'Lower until your triceps rest briefly on the floor to eliminate stretch-reflex momentum.',
    'Press powerfully to lockout to build raw mid-range and tricep pressing power.'
  ]),
  makeEx('barbell', 'BB-23', 'bb-bent-row', 'bb-bent-row', 'Barbell', 'Barbell Bent-Over Pendlay Row', '3 × 8–10 reps', 'Compound', 'Intermediate', ['lats', 'upperBack'], ['rearDelts', 'biceps', 'lowerBack'], [
    'Hinge torso nearly parallel to the floor with hamstrings loaded and spine neutral.',
    'Row the barbell explosively into your lower sternum / upper abdomen.',
    'Control the eccentric descent to full arm extension while maintaining torso angle.'
  ]),
  makeEx('barbell', 'BB-24', 'bb-yates-row', 'bb-bent-row', 'Barbell', 'Barbell Underhand Yates Row', '3 × 8–12 reps', 'Compound', 'Intermediate', ['lats', 'biceps'], ['upperBack', 'lowerBack', 'rearDelts'], [
    'Take a shoulder-width supinated (underhand) grip and hinge to a ~60° torso angle.',
    'Pull the bar along your thighs into your lower waist, driving elbows straight back.',
    'Maximizes lower-lat and bicep recruitment.'
  ]),
  makeEx('barbell', 'BB-25', 'bb-landmine-row', 'bb-bent-row', 'Barbell', 'Barbell T-Bar / Landmine Row', '4 × 8–12 reps', 'Compound', 'Intermediate', ['lats', 'upperBack'], ['rearDelts', 'biceps', 'lowerBack'], [
    'Straddle a landmine-anchored barbell and hinge hips back to 45°.',
    'Pull the loaded sleeve up to your chest while squeezing shoulder blades together.',
    'Natural arc path provides constant tension across the entire mid-back and lats.'
  ]),
  makeEx('barbell', 'BB-26', 'bb-shrug', 'shrug-upright', 'Barbell', 'Barbell Power Shrug', '4 × 10–15 reps', 'Isolation', 'Beginner', ['upperBack'], ['forearms', 'lowerBack'], [
    'Hold a loaded barbell in front of thighs with a double-overhand or strapped grip.',
    'Shrug shoulders straight up toward your ears and pause 1 second at the top.',
    'Lower under control without rolling shoulders.'
  ]),
  makeEx('barbell', 'BB-27', 'bb-overhead-press', 'bb-overhead-press', 'Barbell', 'Standing Barbell Military Press', '3 × 6–8 reps', 'Compound', 'Intermediate', ['frontDelts', 'sideDelts', 'triceps'], ['upperBack', 'core'], [
    'Start with the bar resting on the front deltoids / clavicles and elbows slightly forward.',
    'Tuck chin slightly back as the bar clears your forehead, then push head "through the window".',
    'Keep quads, glutes, and abs locked tight to form a rigid pillar from floor to bar.'
  ]),
  makeEx('barbell', 'BB-28', 'bb-push-press', 'bb-overhead-press', 'Barbell', 'Barbell Explosive Push Press', '4 × 5–6 reps', 'Compound', 'Intermediate', ['frontDelts', 'sideDelts', 'triceps'], ['quads', 'glutes', 'core'], [
    'Dip knees 4 inches with an upright torso, then drive violently through the floor.',
    'Use the leg drive impulse to launch the heavy barbell overhead to lockout.',
    'Lower back to the front rack under control to build total-body overhead power.'
  ]),
  makeEx('barbell', 'BB-29', 'bb-upright-row', 'shrug-upright', 'Barbell', 'Barbell Shoulder-Width Upright Row', '3 × 10–12 reps', 'Compound', 'Intermediate', ['sideDelts', 'upperBack'], ['frontDelts', 'biceps', 'forearms'], [
    'Grip the barbell shoulder-width apart and pull elbows upward to shoulder level.',
    'Keep the bar close to your body and stop when upper arms are parallel to the floor.',
    'Targets the lateral deltoids and upper trapezius simultaneously.'
  ]),
  makeEx('barbell', 'BB-30', 'bb-bicep-curl', 'db-bicep-curl', 'Barbell', 'Standing Barbell / EZ-Bar Bicep Curl', '3 × 8–12 reps', 'Isolation', 'Beginner', ['biceps'], ['forearms', 'frontDelts'], [
    'Grip the barbell or cambered EZ-bar at shoulder width with elbows pinned to your sides.',
    'Curl the bar in a smooth arc up to chest height without leaning your lower back.',
    'Lower slowly over 3 seconds to full extension.'
  ]),
  makeEx('barbell', 'BB-31', 'bb-reverse-curl', 'db-bicep-curl', 'Barbell', 'Barbell Overhand Reverse Curl', '3 × 10–15 reps', 'Isolation', 'Beginner', ['forearms', 'biceps'], [], [
    'Take a pronated (palms-down) shoulder-width grip on the barbell.',
    'Curl the bar upward while keeping wrists straight and elbows tucked.',
    'Directly targets the brachioradialis and wrist extensors for thick forearms.'
  ]),
  makeEx('barbell', 'BB-32', 'bb-skullcrusher', 'floor-press', 'Barbell', 'Barbell / EZ-Bar Lying Skullcrusher', '3 × 10–12 reps', 'Isolation', 'Intermediate', ['triceps'], ['forearms'], [
    'Lie on a flat bench holding an EZ-bar or barbell angled slightly behind vertical.',
    'Lower the bar toward your forehead or just behind the crown of your head by bending elbows.',
    'Extend elbows back up without moving your upper arms.'
  ]),
  makeEx('barbell', 'BB-33', 'bb-power-clean', 'bb-deadlift', 'Barbell', 'Barbell Power Clean', '4 × 3–5 reps', 'Compound', 'Advanced', ['glutes', 'hamstrings', 'upperBack', 'quads'], ['calves', 'core', 'frontDelts', 'forearms'], [
    'Pull the bar smoothly from the floor to mid-thigh, then explosively triple-extend hips, knees, and ankles.',
    'Shrug and pull yourself under the bar, catching it cleanly on your front deltoid rack with high elbows.',
    'Stand tall to complete the lift—premier builder of athletic rate-of-force development.'
  ]),
  makeEx('barbell', 'BB-34', 'bb-calf-raise', 'calf-raise', 'Barbell', 'Standing Barbell Calf Raise', '4 × 15–20 reps', 'Isolation', 'Beginner', ['calves'], ['core', 'upperBack'], [
    'Rack the barbell across your upper back and stand with toes on weight plates or a block.',
    'Press high onto the balls of your feet and hold peak contraction for 1–2 seconds.',
    'Control the lowering phase for a full Achilles and gastrocnemius stretch.'
  ]),
  makeEx('barbell', 'BB-35', 'bb-ab-rollout', 'plank-rollout', 'Barbell', 'Barbell Ab Rollout', '3 × 8–12 reps', 'Core & Mobility', 'Intermediate', ['core', 'lats'], ['frontDelts', 'triceps', 'glutes'], [
    'Kneel behind a barbell loaded with round plates and grip shoulder-width apart.',
    'Lock glutes and abs into posterior pelvic tilt as you roll the bar forward.',
    'Pull the bar back to your knees using your lats and rectus abdominis.'
  ]),

  /* ==========================================================================
     SECTION 3: KETTLEBELL EXERCISES (26 Exercises)
     ========================================================================== */
  makeEx('kettlebell', 'KB-01', 'kb-swing', 'kb-swing', 'Kettlebell', 'Two-Hand Kettlebell Swing', '4 × 15–20 reps', 'Compound', 'Intermediate', ['glutes', 'hamstrings', 'lowerBack'], ['core', 'forearms', 'frontDelts'], [
    'Hike the kettlebell high between your thighs like a football snap—hinge, do not squat.',
    'Snap hips forward explosively into a standing plank; let the bell float to chest height.',
    'Wait until wrists nearly touch your hips before hinging back for the next rep.'
  ]),
  makeEx('kettlebell', 'KB-02', 'kb-single-arm-swing', 'kb-swing', 'Kettlebell', 'Single-Arm Kettlebell Swing', '3 × 10 / arm', 'Compound', 'Intermediate', ['glutes', 'hamstrings', 'core'], ['lowerBack', 'forearms', 'upperBack'], [
    'Hike and swing the kettlebell with one hand while shadowing with your free arm.',
    'Pack your working shoulder into its socket and resist torso rotation at the bottom and top.',
    'Builds anti-rotational core strength alongside explosive hip power.'
  ]),
  makeEx('kettlebell', 'KB-03', 'kb-american-swing', 'kb-swing', 'Kettlebell', 'American Overhead Kettlebell Swing', '3 × 12–15 reps', 'Compound', 'Intermediate', ['glutes', 'hamstrings', 'frontDelts', 'upperBack'], ['core', 'lowerBack'], [
    'Drive the kettlebell from the hip hinge all the way to overhead lockout with ears between arms.',
    'Keep ribs braced at the top so the overhead finish comes from shoulders and thoracic extension.',
    'Guide the bell back down through the hip hinge smoothly.'
  ]),
  makeEx('kettlebell', 'KB-04', 'kb-sumo-deadlift', 'kb-swing', 'Kettlebell', 'Kettlebell Sumo Deadlift', '3 × 12–15 reps', 'Compound', 'Beginner', ['glutes', 'hamstrings', 'quads'], ['lowerBack', 'core', 'forearms'], [
    'Stand with feet wide and the kettlebell centered directly between your ankles.',
    'Hinge hips back, grip the handle, and break the handle in half to engage your lats.',
    'Stand tall by driving heels into the floor.'
  ]),
  makeEx('kettlebell', 'KB-05', 'kb-single-leg-rdl', 'rdls', 'Kettlebell', 'Kettlebell Single-Leg RDL', '3 × 10 / leg', 'Compound', 'Intermediate', ['hamstrings', 'glutes'], ['core', 'lowerBack', 'forearms'], [
    'Hold the kettlebell in the hand opposite your standing leg.',
    'Hinge at the standing hip while reaching your free leg straight back in line with your torso.',
    'Return to standing by squeezing the glute and hamstring of the planted leg.'
  ]),
  makeEx('kettlebell', 'KB-06', 'kb-goblet-squat', 'kb-goblet-squat', 'Kettlebell', 'Kettlebell Goblet Squat', '3 × 10–12 reps', 'Compound', 'Beginner', ['quads', 'glutes'], ['core', 'upperBack'], [
    'Hold the kettlebell by the horns close to your chest with elbows pointing straight down.',
    'Descend into a deep squat while prying knees gently outward with your elbows.',
    'Maintain an upright spine and drive straight up through the whole foot.'
  ]),
  makeEx('kettlebell', 'KB-07', 'kb-front-rack-squat', 'kb-goblet-squat', 'Kettlebell', 'Double Kettlebell Front Rack Squat', '4 × 8–10 reps', 'Compound', 'Intermediate', ['quads', 'glutes', 'core'], ['upperBack', 'lowerBack'], [
    'Clean two kettlebells into the front rack position with forearms vertical and wrists straight.',
    'Breathe behind the shield (maintain abdominal tension) as you squat deep.',
    'Drive up powerfully—anterior load heavily recruits quads and upper-back stabilizers.'
  ]),
  makeEx('kettlebell', 'KB-08', 'kb-cossack-squat', 'kb-goblet-squat', 'Kettlebell', 'Kettlebell Lateral Cossack Squat', '3 × 8 / side', 'Compound', 'Intermediate', ['quads', 'glutes'], ['hamstrings', 'calves', 'core'], [
    'Take a very wide stance holding a kettlebell at chest height.',
    'Shift hips laterally into a deep squat on one leg while keeping the opposite leg straight with toes pulled up.',
    'Improves hip mobility, adductor strength, and frontal-plane knee stability.'
  ]),
  makeEx('kettlebell', 'KB-09', 'kb-tactical-lunge', 'reverse-lunges', 'Kettlebell', 'Kettlebell Pass-Through Tactical Lunge', '3 × 10 / leg', 'Compound', 'Intermediate', ['quads', 'glutes'], ['hamstrings', 'core', 'forearms'], [
    'Step backward into a reverse lunge while passing the kettlebell underneath your front thigh.',
    'Stand tall and alternate legs on the next repetition.',
    'Challenges single-leg balance and anti-lateral-flexion core control.'
  ]),
  makeEx('kettlebell', 'KB-10', 'kb-overhead-squat', 'kb-clean-press', 'Kettlebell', 'Single-Arm Kettlebell Overhead Squat', '3 × 6 / arm', 'Compound', 'Advanced', ['quads', 'glutes', 'frontDelts', 'core'], ['upperBack', 'sideDelts'], [
    'Lock one kettlebell out overhead with bicep by your ear and wrist straight.',
    'Keep the overhead arm vertical as you descend into a full-depth squat.',
    'Demands exceptional thoracic extension and shoulder stability.'
  ]),
  makeEx('kettlebell', 'KB-11', 'kb-clean-press', 'kb-clean-press', 'Kettlebell', 'Single-Arm Kettlebell Clean & Press', '3 × 8 / arm', 'Compound', 'Intermediate', ['frontDelts', 'sideDelts', 'triceps', 'core'], ['glutes', 'hamstrings', 'lats'], [
    'Clean the bell smoothly into the front rack position with wrist straight and thumb at collarbone.',
    'Brace your obliques against the offset load and press the bell vertically overhead.',
    'Lower back to the rack with control before cycling the next repetition.'
  ]),
  makeEx('kettlebell', 'KB-12', 'kb-double-press', 'overhead-press', 'Kettlebell', 'Double Kettlebell Military Press', '4 × 6–8 reps', 'Compound', 'Intermediate', ['frontDelts', 'sideDelts', 'triceps'], ['core', 'upperBack', 'glutes'], [
    'Clean two kettlebells into the rack position and squeeze glutes and quads tight.',
    'Press both bells overhead to lockout while keeping ribs stacked over your pelvis.',
    'Pull the bells actively back down into the rack using your lats.'
  ]),
  makeEx('kettlebell', 'KB-13', 'kb-push-press', 'kb-clean-press', 'Kettlebell', 'Kettlebell Push Press & Jerk', '3 × 8 / arm', 'Compound', 'Intermediate', ['frontDelts', 'sideDelts', 'triceps', 'quads'], ['glutes', 'core', 'calves'], [
    'Dip knees slightly and drive through heels to launch the kettlebell from rack to overhead.',
    'Lock the elbow out crisp overhead while absorbing the force with a braced core.',
    'Allows you to handle heavier bells and train explosive triple extension.'
  ]),
  makeEx('kettlebell', 'KB-14', 'kb-snatch', 'kb-clean-press', 'Kettlebell', 'Single-Arm Kettlebell Snatch', '4 × 10 / arm', 'Compound', 'Advanced', ['glutes', 'hamstrings', 'frontDelts', 'upperBack'], ['core', 'lowerBack', 'forearms'], [
    'Hike the kettlebell between legs and drive hips explosively to pull the bell close to your body.',
    'Punch your hand smoothly through the handle at head height so the bell lands softly overhead without banging your wrist.',
    'The "Tsar of Kettlebell Lifts" for full-body power and VO2 max conditioning.'
  ]),
  makeEx('kettlebell', 'KB-15', 'kb-bottoms-up-press', 'kb-clean-press', 'Kettlebell', 'Kettlebell Bottoms-Up Overhead Press', '3 × 6–8 / arm', 'Compound', 'Advanced', ['frontDelts', 'forearms', 'core'], ['sideDelts', 'triceps', 'upperBack'], [
    'Clean the kettlebell upside-down so the heavy sphere balances directly above the handle.',
    'Crush the handle with maximum grip force to keep the bell from tipping as you press overhead.',
    'Unrivaled for rotator cuff irradiation, grip strength, and shoulder stability.'
  ]),
  makeEx('kettlebell', 'KB-16', 'kb-row', 'kb-row', 'Kettlebell', 'Kettlebell Bent-Over Gorilla Row', '3 × 10–12 reps', 'Compound', 'Intermediate', ['lats', 'upperBack'], ['biceps', 'rearDelts', 'core', 'lowerBack'], [
    'Set a wide, athletic hip-hinge stance over the kettlebell with torso braced.',
    'Row the handle toward your lower ribs while keeping shoulders square to the floor.',
    'Pause briefly at peak contraction before lowering smoothly.'
  ]),
  makeEx('kettlebell', 'KB-17', 'kb-renegade-row', 'bw-pushup', 'Kettlebell', 'Kettlebell Plank Row', '3 × 8 / side', 'Compound', 'Advanced', ['core', 'lats'], ['pecs', 'triceps', 'upperBack'], [
    'Set a strong wide-stance plank and row the kettlebell up to your hip crease.',
    'Keep pelvis completely level against rotational torque.',
    'Lower with control and switch sides.'
  ]),
  makeEx('kettlebell', 'KB-18', 'kb-halo', 'tricep-overhead', 'Kettlebell', 'Kettlebell Shoulder Halo', '3 × 10 / direction', 'Core & Mobility', 'Beginner', ['frontDelts', 'sideDelts', 'rearDelts', 'core'], ['upperBack', 'triceps'], [
    'Hold the kettlebell upside-down by the horns at chest height with ribs braced.',
    'Circle the bell tightly around your head like a halo, skimming past the back of your neck.',
    'Mobilizes the thoracic spine and glenohumeral joint while firing the core.'
  ]),
  makeEx('kettlebell', 'KB-19', 'kb-turkish-getup', 'kb-clean-press', 'Kettlebell', 'Kettlebell Turkish Get-Up (TGU)', '3 × 3 / side', 'Compound', 'Advanced', ['core', 'frontDelts', 'glutes', 'quads'], ['upperBack', 'triceps', 'hamstrings'], [
    'Lie on your back with the kettlebell locked out vertically over one shoulder.',
    'Keep eyes on the bell as you transition from roll-to-elbow, tall-sit, hip-sweep, half-kneeling, to standing.',
    'Reverse every step under control—builds 360° shoulder stability and total-body linkage.'
  ]),
  makeEx('kettlebell', 'KB-20', 'kb-windmill', 'kb-clean-press', 'Kettlebell', 'Kettlebell Overhead Windmill', '3 × 6 / side', 'Core & Mobility', 'Advanced', ['core', 'glutes', 'hamstrings'], ['frontDelts', 'upperBack', 'lowerBack'], [
    'Lock the kettlebell overhead and turn both feet 45° away from the loaded side.',
    'Push the loaded hip backward and slide your free hand down the inside of your front leg.',
    'Keep the overhead arm vertical to train obliques, hip hinge, and thoracic rotation.'
  ]),
  makeEx('kettlebell', 'KB-21', 'kb-floor-press', 'floor-press', 'Kettlebell', 'Kettlebell Single/Double Floor Press', '3 × 8–12 reps', 'Compound', 'Beginner', ['pecs', 'triceps'], ['frontDelts', 'core', 'forearms'], [
    'Lie flat on the floor mat with the kettlebell resting on the outside of your forearm.',
    'Lower until your tricep touches the mat, then press vertically to lockout.',
    'Offset center of mass recruits extra wrist and shoulder stabilizers.'
  ]),
  makeEx('kettlebell', 'KB-22', 'kb-horn-curl', 'db-bicep-curl', 'Kettlebell', 'Kettlebell Goblet Horn Bicep Curl', '3 × 12–15 reps', 'Isolation', 'Beginner', ['biceps', 'forearms'], ['core'], [
    'Grip the sides of the kettlebell handle (the horns) with both hands.',
    'Keep elbows pinned to your ribs as you curl the bell from thighs to chin.',
    'Lower slowly to a full bicep stretch.'
  ]),
  makeEx('kettlebell', 'KB-23', 'kb-overhead-tricep', 'tricep-overhead', 'Kettlebell', 'Kettlebell Overhead Tricep Extension', '3 × 12–15 reps', 'Isolation', 'Beginner', ['triceps'], ['core', 'forearms'], [
    'Hold the kettlebell by the horns behind your head with elbows pointed forward.',
    'Extend elbows straight overhead to full lockout without flaring ribs.',
    'Great finisher for the long head of the triceps.'
  ]),
  makeEx('kettlebell', 'KB-24', 'kb-farmers-carry', 'other-farmers-carry', 'Kettlebell', 'Kettlebell Suitcase & Rack Carry', '3 × 40m / side', 'Compound', 'Beginner', ['core', 'forearms', 'upperBack'], ['glutes', 'quads', 'calves'], [
    'Hold a heavy kettlebell in one hand at your side (Suitcase) or at chest height (Rack).',
    'Walk tall with level shoulders—resist leaning toward or away from the weight.',
    'Fires the quadratus lumborum and obliques intensely.'
  ]),
  makeEx('kettlebell', 'KB-25', 'kb-waiter-carry', 'kb-clean-press', 'Kettlebell', "Kettlebell Overhead Waiter's Walk", '3 × 30m / arm', 'Core & Mobility', 'Intermediate', ['frontDelts', 'sideDelts', 'core', 'upperBack'], ['triceps', 'forearms'], [
    'Press one kettlebell overhead with bicep near your ear and walk slowly forward.',
    'Keep wrist neutral and shoulder blades packed down and back.',
    'Builds bullet-proof overhead stability.'
  ]),
  makeEx('kettlebell', 'KB-26', 'kb-thruster', 'kb-clean-press', 'Kettlebell', 'Kettlebell Squat-to-Press Thruster', '3 × 10–12 reps', 'Compound', 'Intermediate', ['quads', 'glutes', 'frontDelts'], ['triceps', 'core'], [
    'Squat deep with one or two kettlebells in the front rack position.',
    'Drive out of the squat and press the bells overhead in one fluid sequence.',
    'High-metabolic full-body strength builder.'
  ]),

  /* ==========================================================================
     SECTION 4: BODYWEIGHT EXERCISES (30 Exercises)
     ========================================================================== */
  makeEx('bodyweight', 'BW-01', 'bw-pushup', 'bw-pushup', 'Bodyweight', 'Strict Full-Range Push-Ups', '3 × 12–20 reps', 'Compound', 'Beginner', ['pecs', 'triceps'], ['frontDelts', 'core'], [
    'Set hands slightly wider than shoulders and screw palms into the mat.',
    'Keep a straight line from head to heels—glutes and abs braced—as chest touches near the floor.',
    'Press all the way to protraction at the top without letting hips sag.'
  ]),
  makeEx('bodyweight', 'BW-02', 'bw-diamond-pushup', 'bw-pushup', 'Bodyweight', 'Diamond (Close-Grip) Tricep Push-Ups', '3 × 10–15 reps', 'Compound', 'Intermediate', ['triceps', 'pecs'], ['frontDelts', 'core'], [
    'Place hands close together under your sternum forming a diamond shape with thumbs and index fingers.',
    'Lower your chest to your hands while keeping elbows tucked close to your ribs.',
    'Press up powerfully—one of the highest EMG activators for the triceps brachii.'
  ]),
  makeEx('bodyweight', 'BW-03', 'bw-decline-pushup', 'bw-pushup', 'Bodyweight', 'Feet-Elevated Decline Push-Ups', '3 × 10–15 reps', 'Compound', 'Intermediate', ['pecs', 'frontDelts'], ['triceps', 'core'], [
    'Elevate your feet on a bench or box and place hands shoulder-width on the floor.',
    'Shifts a greater percentage of bodyweight onto the upper pectorals and anterior deltoids.',
    'Keep core tight so your lower back never arches.'
  ]),
  makeEx('bodyweight', 'BW-04', 'bw-wide-pushup', 'bw-pushup', 'Bodyweight', 'Wide-Grip Chest Push-Ups', '3 × 12–20 reps', 'Compound', 'Beginner', ['pecs'], ['frontDelts', 'triceps', 'core'], [
    'Place hands wider than shoulder-width with fingers angled slightly outward.',
    'Lower chest deep between hands to emphasize outer pectoral stretch.',
    'Squeeze chest together as you press back to the top.'
  ]),
  makeEx('bodyweight', 'BW-05', 'bw-archer-pushup', 'bw-pushup', 'Bodyweight', 'Archer Unilateral Push-Ups', '3 × 6–8 / side', 'Compound', 'Advanced', ['pecs', 'triceps', 'frontDelts'], ['core'], [
    'Take a wide hand stance and shift your torso weight over one working arm while keeping the other arm straight.',
    'Press back up using primarily the loaded side—bridges the gap to one-arm push-ups.',
    'Alternate sides or complete all reps on one side first.'
  ]),
  makeEx('bodyweight', 'BW-06', 'bw-pike-pushup', 'bw-pushup', 'Bodyweight', 'Pike Shoulder Push-Ups', '3 × 8–12 reps', 'Compound', 'Intermediate', ['frontDelts', 'sideDelts', 'triceps'], ['upperBack', 'core'], [
    'Hike hips high into an inverted "V" pike position with hands shoulder-width apart.',
    'Lower the crown of your head forward between your hands to form a tripod.',
    'Press vertically back into the pike to build overhead pressing strength without weights.'
  ]),
  makeEx('bodyweight', 'BW-07', 'bw-handstand-pushup', 'overhead-press', 'Bodyweight', 'Wall Handstand Push-Ups (HSPU)', '3 × 5–8 reps', 'Compound', 'Advanced', ['frontDelts', 'sideDelts', 'triceps'], ['upperBack', 'core'], [
    'Kick up into a braced handstand against a wall with glutes and abs locked.',
    'Lower under control until head lightly touches a mat in front of your hands.',
    'Press your full bodyweight back to locked-out arms.'
  ]),
  makeEx('bodyweight', 'BW-08', 'bw-bench-dip', 'other-dips', 'Bodyweight', 'Bench / Chair Tricep Dips', '3 × 12–15 reps', 'Isolation', 'Beginner', ['triceps'], ['frontDelts', 'pecs'], [
    'Grip the edge of a bench behind your back with legs extended forward.',
    'Slide your back straight down close to the bench until elbows reach 90°.',
    'Press through your palms to lock out the triceps.'
  ]),
  makeEx('bodyweight', 'BW-09', 'bw-pullup', 'bw-pullup', 'Bodyweight', 'Strict Overhand Pull-Ups', '3 × 6–12 reps', 'Compound', 'Intermediate', ['lats', 'biceps', 'upperBack'], ['forearms', 'core', 'rearDelts'], [
    'Start from a dead hang, then depress shoulder blades down and back to initiate the pull.',
    'Drive elbows down toward your hips until your chin clears the bar.',
    'Lower smoothly to a full dead hang to train lats through their full length.'
  ]),
  makeEx('bodyweight', 'BW-10', 'bw-chinup', 'bw-pullup', 'Bodyweight', 'Supinated Underhand Chin-Ups', '3 × 6–12 reps', 'Compound', 'Intermediate', ['biceps', 'lats'], ['upperBack', 'forearms', 'core'], [
    'Grip the overhead bar shoulder-width apart with palms facing toward you (supinated).',
    'Pull your chest all the way up to the bar by driving elbows down and back.',
    'Places the biceps and lower lats in their strongest mechanical line of pull.'
  ]),
  makeEx('bodyweight', 'BW-11', 'bw-neutral-pullup', 'bw-pullup', 'Bodyweight', 'Neutral-Grip Parallel Pull-Ups', '3 × 8–12 reps', 'Compound', 'Intermediate', ['lats', 'biceps', 'forearms'], ['upperBack', 'core'], [
    'Grip parallel handles with palms facing each other.',
    'Joint-friendly shoulder position that heavily recruits lats, biceps, and brachioradialis.',
    'Control the eccentric lowering for 2–3 seconds.'
  ]),
  makeEx('bodyweight', 'BW-12', 'bw-inverted-row', 'bent-over-rows', 'Bodyweight', 'Inverted Bodyweight Rows (Australian Pull-Ups)', '3 × 10–15 reps', 'Compound', 'Beginner', ['upperBack', 'lats'], ['rearDelts', 'biceps', 'core'], [
    'Hang underneath a waist-high bar or suspension straps with a rigid straight body line.',
    'Row your sternum to the bar while squeezing shoulder blades together.',
    'Walk feet further forward to increase difficulty or bend knees to scale down.'
  ]),
  makeEx('bodyweight', 'BW-13', 'bw-muscle-up', 'bw-pullup', 'Bodyweight', 'Bar Muscle-Up', '3 × 3–5 reps', 'Compound', 'Advanced', ['lats', 'pecs', 'triceps', 'core'], ['biceps', 'upperBack', 'frontDelts', 'forearms'], [
    'Generate an explosive hollow-body pull-up pulling the bar toward your lower chest/waist.',
    'Transition wrists over the bar at the apex and press out into a straight-bar dip lockout.',
    'Advanced calisthenics skill combining explosive upper-body pull and push.'
  ]),
  makeEx('bodyweight', 'BW-14', 'bw-squat', 'bw-squat', 'Bodyweight', 'Bodyweight Tempo Air Squat', '3 × 15–20 reps', 'Compound', 'Beginner', ['quads', 'glutes'], ['hamstrings', 'calves', 'core'], [
    'Reach arms forward as a counterbalance while sitting hips down between your heels.',
    'Use a 3-second lowering tempo and pause 1 second at the bottom to build knee control.',
    'Drive up briskly while keeping knees tracking in line with mid-foot.'
  ]),
  makeEx('bodyweight', 'BW-15', 'bw-bulgarian-split', 'reverse-lunges', 'Bodyweight', 'Bodyweight Bulgarian Split Squat', '3 × 12–15 / leg', 'Compound', 'Beginner', ['quads', 'glutes'], ['hamstrings', 'calves'], [
    'Elevate your rear foot on a couch, chair, or bench behind you.',
    'Lower into a deep single-leg squat while keeping your front foot flat.',
    'High-rep unilateral leg builder requiring zero external equipment.'
  ]),
  makeEx('bodyweight', 'BW-16', 'bw-pistol-squat', 'bw-squat', 'Bodyweight', 'Single-Leg Pistol Squat', '3 × 5 / leg', 'Compound', 'Advanced', ['quads', 'glutes', 'core'], ['hamstrings', 'calves'], [
    'Balance on one leg while extending your non-working leg straight out in front of you.',
    'Sit all the way down into a full-depth single-leg squat with arms reaching forward.',
    'Drive through your mid-foot to stand back up on one leg.'
  ]),
  makeEx('bodyweight', 'BW-17', 'bw-sissy-squat', 'bw-squat', 'Bodyweight', 'Bodyweight Sissy Squat (Quad Isolation)', '3 × 10–15 reps', 'Isolation', 'Intermediate', ['quads'], ['core', 'calves'], [
    'Rise onto the balls of your feet and lock hips and torso into a straight line.',
    'Lean backward by bending only at the knees to place an intense stretch on the rectus femoris.',
    'Extend knees to pull yourself back up (hold a post for balance if needed).'
  ]),
  makeEx('bodyweight', 'BW-18', 'bw-lunge', 'reverse-lunges', 'Bodyweight', 'Bodyweight Walking & Reverse Lunges', '3 × 15 / leg', 'Compound', 'Beginner', ['quads', 'glutes'], ['hamstrings', 'calves'], [
    'Step backward or forward with an upright torso until both knees bend to 90°.',
    'Push through the front heel and squeeze glutes at the top.',
    'Perform with continuous rhythm for lower-body endurance.'
  ]),
  makeEx('bodyweight', 'BW-19', 'bw-nordic-curl', 'rdls', 'Bodyweight', 'Nordic Hamstring Eccentric Curl', '3 × 5–8 reps', 'Isolation', 'Advanced', ['hamstrings'], ['glutes', 'calves', 'core'], [
    'Kneel on a pad with ankles anchored securely under a heavy bar, partner, or couch.',
    'Keep hips locked extended and lower your torso forward as slowly as humanly possible.',
    'Catch yourself in a push-up at the bottom and pull back up with your hamstrings—proven to bulletproof knees.'
  ]),
  makeEx('bodyweight', 'BW-20', 'bw-glute-bridge', 'hip-thrust', 'Bodyweight', 'Single-Leg Bodyweight Glute Bridge', '3 × 15 / leg', 'Isolation', 'Beginner', ['glutes'], ['hamstrings', 'core'], [
    'Lie on your back with one foot planted and the opposite knee hugged toward your chest.',
    'Drive through the planted heel to lift hips to full extension.',
    'Pause 2 seconds at the top to eliminate lumbar compensation.'
  ]),
  makeEx('bodyweight', 'BW-21', 'bw-calf-raise', 'calf-raise', 'Bodyweight', 'Single-Leg Stair Calf Raise', '3 × 15–20 / leg', 'Isolation', 'Beginner', ['calves'], [], [
    'Stand on one foot on the edge of a step with the other foot tucked behind your ankle.',
    'Sink into a deep 2-second heel stretch, then press all the way up onto the ball of your foot.',
    'Single-leg loading doubles the resistance without needing weights.'
  ]),
  makeEx('bodyweight', 'BW-22', 'bw-jump-squat', 'bw-squat', 'Bodyweight', 'Plyometric Squat Jumps', '3 × 10–12 reps', 'Compound', 'Intermediate', ['quads', 'glutes', 'calves'], ['hamstrings', 'core'], [
    'Drop rapidly into a quarter-to-half squat and swing arms back.',
    'Explode vertically into the air with full hip, knee, and ankle extension.',
    'Land softly on mid-foot with bent knees to absorb force quietly.'
  ]),
  makeEx('bodyweight', 'BW-23', 'bw-burpee', 'bw-pushup', 'Bodyweight', 'Athletic Chest-to-Floor Burpees', '3 × 12–15 reps', 'Compound', 'Intermediate', ['pecs', 'quads', 'glutes', 'core'], ['frontDelts', 'triceps', 'calves'], [
    'Hinge down, kick feet back into a plank, and perform a clean push-up.',
    'Snap feet back in wide outside your hands and jump vertically with hands overhead.',
    'Full-body metabolic conditioning staple.'
  ]),
  makeEx('bodyweight', 'BW-24', 'core-decompression', 'core-decompression', 'Bodyweight', 'Core & Post-Workout Decompression (90/90 & Dead Bug)', '3 × 45s / 3m', 'Core & Mobility', 'Beginner', ['core', 'lowerBack'], ['quads'], [
    'Lie completely flat on the solid floor mat and flatten your lumbar spine into the pad.',
    'Extend opposite arm and leg slowly while exhaling fully to lock ribs down.',
    'Finish with 90/90 nasal breathing to decompress lumbar discs after lifting.'
  ]),
  makeEx('bodyweight', 'BW-25', 'core-spinal-hang', 'core-spinal-hang', 'Bodyweight', 'Passive Spinal Decompression Hang', '3 × 45–60s', 'Core & Mobility', 'Beginner', ['lats', 'lowerBack', 'forearms'], ['core'], [
    'Grip the overhead bar shoulder-width apart and let your torso sink into passive traction.',
    'Breathe deeply into your lower ribs and allow gravity to lengthen the lumbar spine.',
    'Keep toes lightly touching the floor if needed to regulate grip intensity.'
  ]),
  makeEx('bodyweight', 'BW-26', 'bw-hanging-leg-raise', 'core-spinal-hang', 'Bodyweight', 'Hanging Strict Leg & Knee Raises', '3 × 10–15 reps', 'Core & Mobility', 'Intermediate', ['core', 'forearms'], ['lats', 'quads'], [
    'Hang from an overhead bar with shoulders active and body still (no swinging).',
    'Curl your pelvis upward (posterior pelvic tilt) as you raise legs to parallel or toes-to-bar.',
    'Lower slowly over 3 seconds to prevent momentum.'
  ]),
  makeEx('bodyweight', 'BW-27', 'bw-rkc-plank', 'plank-rollout', 'Bodyweight', 'RKC High-Tension Forearm Plank & Side Plank', '3 × 45s hold', 'Core & Mobility', 'Beginner', ['core'], ['glutes', 'quads', 'frontDelts'], [
    'Place forearms on the mat, lock quads and glutes tight, and pull elbows isotonically toward toes.',
    'Generates 3x more abdominal activation than a passive plank.',
    'Breathe shallowly behind a rock-solid abdominal wall.'
  ]),
  makeEx('bodyweight', 'BW-28', 'bw-hollow-hold', 'core-decompression', 'Bodyweight', 'Gymnastics Hollow Body Hold & V-Ups', '3 × 30–45s', 'Core & Mobility', 'Intermediate', ['core'], ['quads'], [
    'Press your lower back flat into the floor mat with arms and straight legs extended off the ground.',
    'Maintain the banana-shaped hollow body tension without letting your lumbar spine arch off the mat.',
    'Foundational gymnastics core drill.'
  ]),
  makeEx('bodyweight', 'BW-29', 'bw-bicycle-crunch', 'core-decompression', 'Bodyweight', 'Slow Tempo Bicycle Crunches', '3 × 20 total reps', 'Core & Mobility', 'Beginner', ['core'], ['quads'], [
    'Lie supine with hands lightly behind ears and lift shoulder blades off the mat.',
    'Rotate your opposite shoulder toward the oncoming knee while fully extending the other leg.',
    'Pause 1 second on each rotation to fire internal and external obliques.'
  ]),
  makeEx('bodyweight', 'BW-30', 'bw-superman-hold', 'plank-rollout', 'Bodyweight', 'Prone Superman Posterior Chain Hold', '3 × 12–15 reps', 'Core & Mobility', 'Beginner', ['lowerBack', 'glutes'], ['upperBack', 'hamstrings', 'rearDelts'], [
    'Lie face-down on the floor mat with arms extended overhead.',
    'Simultaneously lift chest, arms, and thighs slightly off the mat by contracting glutes and spinal erectors.',
    'Hold 2 seconds at the top with neck neutral (looking down at the mat).'
  ]),

  /* ==========================================================================
     SECTION 5: OTHER EQUIPMENT EXERCISES (29 Exercises — Cables, Machines, Bands, Dip Bars, Med Ball, Sled)
     ========================================================================== */
  makeEx('other', 'EQ-01', 'other-dips', 'other-dips', 'Dip Station', 'Parallel Bar Chest & Tricep Dips', '3 × 8–12 reps', 'Compound', 'Intermediate', ['pecs', 'triceps', 'frontDelts'], ['core'], [
    'Support yourself on parallel dip bars with shoulders depressed away from ears.',
    'Lean torso ~15° forward and lower until upper arms reach parallel with the bars.',
    'Press forcefully through palms to full elbow lockout.'
  ]),
  makeEx('other', 'EQ-02', 'other-ring-dips', 'other-dips', 'Gymnastic Rings', 'Gymnastic Ring Dips & Push-Ups', '3 × 8–10 reps', 'Compound', 'Advanced', ['pecs', 'triceps', 'frontDelts'], ['core', 'biceps', 'upperBack'], [
    'Stabilize yourself on suspended gymnastic rings and lower under tight control.',
    'Turn the rings out (RTO — palms forward) at top lockout for maximal pectoral and bicep tendon activation.',
    'Free-moving rings demand intense stabilizer recruitment.'
  ]),
  makeEx('other', 'EQ-03', 'other-face-pull', 'other-face-pull', 'Cable Pulley / Band', 'High-Pulley Cable Face Pulls', '3 × 15–20 reps', 'Isolation', 'Beginner', ['rearDelts', 'upperBack'], ['sideDelts', 'forearms'], [
    'Set the cable pulley or resistance band at upper-chest to forehead height.',
    'Pull the rope handles toward your forehead while externally rotating thumbs backward.',
    'Finish in a "double front bicep" pose to maximally contract rear delts and rotator cuffs.'
  ]),
  makeEx('other', 'EQ-04', 'other-lat-pulldown', 'cable-pulldown', 'Cable Pulley', 'Wide & Neutral-Grip Cable Lat Pulldown', '4 × 10–12 reps', 'Compound', 'Beginner', ['lats', 'upperBack'], ['biceps', 'rearDelts', 'forearms'], [
    'Secure thighs under the pad, depress scapulae, and lean torso back ~10°–15°.',
    'Pull the bar down to your upper chest by driving elbows down and in toward your ribs.',
    'Control the return all the way up for a full overhead lat stretch.'
  ]),
  makeEx('other', 'EQ-05', 'other-seated-cable-row', 'other-face-pull', 'Cable Pulley', 'Seated Low-Pulley Cable Row', '4 × 10–12 reps', 'Compound', 'Beginner', ['upperBack', 'lats'], ['biceps', 'rearDelts', 'lowerBack', 'forearms'], [
    'Sit tall with knees slightly bent and chest proud.',
    'Pull the V-bar or wide handle into your lower sternum while squeezing shoulder blades together.',
    'Allow shoulder blades to protract slightly on the eccentric without rounding your lower back.'
  ]),
  makeEx('other', 'EQ-06', 'other-straight-arm-pulldown', 'cable-pulldown', 'Cable Pulley', 'Straight-Arm Cable Lat Pulldown', '3 × 12–15 reps', 'Isolation', 'Beginner', ['lats'], ['triceps', 'core', 'pecs'], [
    'Stand stepped back from a high pulley with a slight hip hinge and arms nearly straight.',
    'Sweep the bar or rope in an arc down to your thighs using pure lat contraction.',
    'Isolates the lats without bicep fatigue.'
  ]),
  makeEx('other', 'EQ-07', 'other-cable-crossover', 'db-chest-fly', 'Cable Pulley', 'Standing Dual-Cable Chest Crossover / Fly', '3 × 12–15 reps', 'Isolation', 'Beginner', ['pecs'], ['frontDelts', 'core'], [
    'Stand centered between dual pulleys and step one foot forward for stability.',
    'Sweep handles together in front of your chest with a soft bend in the elbows.',
    'Cross wrists slightly at peak contraction to train the pecs in their fully shortened range.'
  ]),
  makeEx('other', 'EQ-08', 'other-tricep-pushdown', 'cable-pulldown', 'Cable Pulley', 'Cable Rope Tricep Pushdown', '4 × 12–15 reps', 'Isolation', 'Beginner', ['triceps'], ['forearms', 'core'], [
    'Pin elbows tightly to your sides and grip the rope attachment on a high pulley.',
    'Extend forearms straight down and pull the rope ends apart at the bottom.',
    'Keep shoulders still and squeeze triceps for 1 second at lockout.'
  ]),
  makeEx('other', 'EQ-09', 'other-cable-overhead-tricep', 'tricep-overhead', 'Cable Pulley', 'Overhead Cable Rope Tricep Extension', '3 × 12–15 reps', 'Isolation', 'Beginner', ['triceps'], ['core'], [
    'Face away from the cable stack in a staggered stance with the rope behind your head.',
    'Extend elbows forward and upward to full lockout.',
    'Constant cable tension in the stretched overhead position stimulates rapid long-head tricep growth.'
  ]),
  makeEx('other', 'EQ-10', 'other-cable-curl', 'db-bicep-curl', 'Cable Pulley', 'Low-Pulley Bayesian Cable Bicep Curl', '3 × 12–15 reps', 'Isolation', 'Beginner', ['biceps'], ['forearms'], [
    'Grip a low-pulley handle or bar with elbows pinned slightly behind or at your sides.',
    'Curl smoothly upward against continuous cable resistance from bottom to top.',
    'Pause at peak contraction and lower over 3 seconds.'
  ]),
  makeEx('other', 'EQ-11', 'other-cable-lateral-raise', 'db-lateral-raise', 'Cable Pulley', 'Single-Arm Cable Lateral Raise', '3 × 12–15 / arm', 'Isolation', 'Beginner', ['sideDelts'], ['upperBack', 'frontDelts'], [
    'Stand sideways to a low pulley and sweep the cable handle outward to shoulder height.',
    'Unlike dumbbells, the cable provides maximum tension right at the bottom stretched position.',
    'Control the eccentric return all the way across your thighs.'
  ]),
  makeEx('other', 'EQ-12', 'other-pallof-press', 'other-face-pull', 'Cable Pulley / Band', 'Cable Anti-Rotation Pallof Press', '3 × 12 / side', 'Core & Mobility', 'Beginner', ['core'], ['glutes', 'frontDelts'], [
    'Stand perpendicular to a chest-high cable or band and hold the handle at your sternum.',
    'Press the handle straight out in front of your chest and hold 2 seconds while resisting rotational pull.',
    'Gold-standard anti-rotation exercise for oblique and lumbar stability.'
  ]),
  makeEx('other', 'EQ-13', 'other-cable-pullthrough', 'kb-swing', 'Cable Pulley', 'Low-Pulley Cable Pull-Through', '3 × 12–15 reps', 'Compound', 'Beginner', ['glutes', 'hamstrings'], ['lowerBack', 'core'], [
    'Face away from a low pulley straddling the rope attachment between your legs.',
    'Hinge hips far backward toward the weight stack with a flat back.',
    'Drive hips forward and squeeze glutes hard without pulling with your arms.'
  ]),
  makeEx('other', 'EQ-14', 'other-cable-crunch', 'cable-pulldown', 'Cable Pulley', 'Kneeling Cable Rope Abdominal Crunch', '3 × 15–20 reps', 'Isolation', 'Beginner', ['core'], ['lats'], [
    'Kneel below a high pulley holding the rope ends beside your temples.',
    'Keep hips stationary and flex your thoracic/lumbar spine to curl elbows toward your knees.',
    'Allows progressive overload on the rectus abdominis ("six-pack" muscles).'
  ]),
  makeEx('other', 'EQ-15', 'other-leg-press', 'goblet-squats', 'Gym Machine', '45° Sled Leg Press Machine', '4 × 10–15 reps', 'Compound', 'Beginner', ['quads', 'glutes'], ['hamstrings', 'calves'], [
    'Keep your lower back and sacrum glued flat against the angled seat pad.',
    'Lower the sled until knees reach 90°+ flexion without letting your tailbone curl up.',
    'Press through heels and mid-foot (never lock knees out violently at the top).'
  ]),
  makeEx('other', 'EQ-16', 'other-hack-squat', 'bb-back-squat', 'Gym Machine', 'Linear Machine Hack Squat', '3 × 8–12 reps', 'Compound', 'Intermediate', ['quads', 'glutes'], ['hamstrings', 'calves'], [
    'Brace your back against the sliding sled pad with feet placed lower on the platform for quad bias.',
    'Descend all the way to full knee flexion until hamstrings cover calves.',
    'Drive powerfully back up the rails.'
  ]),
  makeEx('other', 'EQ-17', 'other-leg-extension', 'goblet-squats', 'Gym Machine', 'Seated Machine Leg Extension', '3 × 12–15 reps', 'Isolation', 'Beginner', ['quads'], [], [
    'Align your knee joint directly with the machine pivot axis and grip the side handles tightly.',
    'Extend knees all the way to the top and hold the peak rectus femoris contraction for 1 second.',
    'Only isolation exercise that trains the rectus femoris in its fully shortened position.'
  ]),
  makeEx('other', 'EQ-18', 'other-leg-curl', 'rdls', 'Gym Machine', 'Seated / Lying Machine Hamstring Curl', '3 × 10–15 reps', 'Isolation', 'Beginner', ['hamstrings'], ['calves'], [
    'Set the ankle roller pad just above your heels and lock the thigh pad tightly.',
    'Curl heels down and back through a full range of motion to isolate knee-flexion hamstring fibers.',
    'Control the 3-second return without letting the weight stack slam.'
  ]),
  makeEx('other', 'EQ-19', 'other-machine-fly', 'db-chest-fly', 'Gym Machine', 'Pec Deck / Machine Chest Fly', '3 × 12–15 reps', 'Isolation', 'Beginner', ['pecs'], ['frontDelts'], [
    'Sit tall with shoulder blades retracted and handles set at mid-chest height.',
    'Sweep arms together in a wide arc and squeeze the inner pectorals for 1–2 seconds.',
    'Provides uniform resistance from full stretch to full contraction.'
  ]),
  makeEx('other', 'EQ-20', 'other-reverse-pec-deck', 'other-face-pull', 'Gym Machine', 'Reverse Pec Deck Rear Delt Fly', '3 × 15–20 reps', 'Isolation', 'Beginner', ['rearDelts', 'upperBack'], ['sideDelts'], [
    'Face the pad on the pec-deck machine and grip the inner handles with arms extended.',
    'Sweep arms straight back by pushing outward rather than pinching traps together.',
    'Targets posterior deltoids with strict chest support.'
  ]),
  makeEx('other', 'EQ-21', 'other-back-extension', 'rdls', 'Roman Chair / GHD', '45° Back Extension / Hyperextension', '3 × 12–15 reps', 'Compound', 'Beginner', ['glutes', 'hamstrings', 'lowerBack'], ['core'], [
    'Set the hip pad just below your hip crease so your pelvis can hinge freely.',
    'Lower torso with a neutral spine until you feel a deep hamstring stretch.',
    'Squeeze glutes and hamstrings to pull your torso back in line with your legs.'
  ]),
  makeEx('other', 'EQ-22', 'other-farmers-carry', 'other-farmers-carry', 'Farmer Handles / Trap Bar', "Heavy Farmer's Walk Carry", '3 × 40m walk', 'Compound', 'Beginner', ['forearms', 'upperBack', 'core'], ['glutes', 'quads', 'calves', 'lowerBack'], [
    'Crush the handles tightly, pull shoulders back and down, and brace your core 360°.',
    'Take short, quick, controlled heel-to-toe steps without letting the weights sway.',
    'Keep your gaze on the horizon and breathe rhythmically behind a braced abdominal wall.'
  ]),
  makeEx('other', 'EQ-23', 'other-trap-bar-dl', 'bb-deadlift', 'Trap / Hex Bar', 'Trap Bar (Hex Bar) Deadlift', '4 × 6–8 reps', 'Compound', 'Beginner', ['quads', 'glutes', 'hamstrings'], ['upperBack', 'lowerBack', 'forearms', 'core'], [
    'Step inside the center of the hex bar and grip the neutral side handles.',
    'Keep chest proud and push the floor away—centered load reduces lumbar shear stress.',
    'Ideal hybrid between a squat and a deadlift for total-body power.'
  ]),
  makeEx('other', 'EQ-24', 'other-medball-slam', 'other-medball-slam', 'Medicine Ball', 'Medicine Ball Overhead Slam', '3 × 12–15 reps', 'Compound', 'Beginner', ['core', 'lats'], ['pecs', 'frontDelts', 'triceps', 'glutes'], [
    'Reach the medicine ball high overhead into full triple extension without overarching your lower back.',
    'Contract abs and lats violently to slam the ball straight down in front of your feet.',
    'Hinge hips and squat down to catch the bounce and flow into the next rep.'
  ]),
  makeEx('other', 'EQ-25', 'other-wall-ball', 'goblet-squats', 'Medicine Ball', 'Medicine Ball Wall Balls', '3 × 15–20 reps', 'Compound', 'Intermediate', ['quads', 'glutes', 'frontDelts'], ['triceps', 'core', 'pecs'], [
    'Hold the medicine ball at chest height, squat to full depth, and drive up explosively.',
    'Throw the ball to a 9–10 ft target on the wall at the top of your drive.',
    'Absorb the catch smoothly and descend directly into the next squat.'
  ]),
  makeEx('other', 'EQ-26', 'other-battle-ropes', 'other-medball-slam', 'Battle Ropes', 'Battle Rope Alternating Waves & Power Slams', '4 × 30s rounds', 'Compound', 'Beginner', ['frontDelts', 'core', 'forearms'], ['lats', 'upperBack', 'biceps', 'glutes'], [
    'Set an athletic quarter-squat stance and whip the heavy ropes in rapid alternating sine waves.',
    'Keep core braced so waves travel all the way to the anchor point.',
    'Torches upper-body endurance and anaerobic conditioning.'
  ]),
  makeEx('other', 'EQ-27', 'other-band-pullapart', 'other-face-pull', 'Resistance Band', 'Resistance Band Pull-Aparts', '3 × 20–25 reps', 'Isolation', 'Beginner', ['rearDelts', 'upperBack'], ['sideDelts', 'forearms'], [
    'Hold a resistance band at shoulder height with arms straight and shoulders depressed.',
    'Stretch the band wide across your chest by squeezing rear deltoids and rhomboids.',
    'Essential posture and shoulder-health drill.'
  ]),
  makeEx('other', 'EQ-28', 'other-box-jump', 'bw-squat', 'Plyo Box', 'Plyometric Box Jumps', '4 × 5–6 reps', 'Compound', 'Intermediate', ['quads', 'glutes', 'calves'], ['hamstrings', 'core'], [
    'Load hips and arms rapidly, then jump explosively onto the center of the plyo box.',
    'Land softly like a cat in a stable athletic half-squat with both feet flat.',
    'Step down one foot at a time to protect your Achilles tendons.'
  ]),
  makeEx('other', 'EQ-29', 'other-ab-wheel', 'plank-rollout', 'Ab Wheel', 'Ab Wheel Rollout', '3 × 10–12 reps', 'Core & Mobility', 'Intermediate', ['core', 'lats'], ['frontDelts', 'triceps', 'glutes'], [
    'Kneel on a pad gripping the ab wheel and tuck your pelvis posteriorly (squeeze glutes).',
    'Roll forward as far as you can while maintaining zero lower-back arch.',
    'Contract abs and lats to pull the wheel back under your shoulders.'
  ])
];

const navTrackerPageBtn = document.getElementById('navTrackerPageBtn');
const navPlannerPageBtn = document.getElementById('navPlannerPageBtn');
const navLibraryPageBtn = document.getElementById('navLibraryPageBtn');
const navHistoryPageBtn = document.getElementById('navHistoryPageBtn');
const trackerPageView = document.getElementById('trackerPageView');
const plannerPageView = document.getElementById('plannerPageView');
const libraryPageView = document.getElementById('libraryPageView');
const historyPageView = document.getElementById('historyPageView');
const historyAnalysisPageContainer = document.getElementById('historyAnalysisPageContainer');

const librarySearchInput = document.getElementById('librarySearchInput');
const clearLibrarySearchBtn = document.getElementById('clearLibrarySearchBtn');
const libraryCategoryTabs = document.getElementById('libraryCategoryTabs');
const libraryMechanicPills = document.getElementById('libraryMechanicPills');
const libraryDifficultyPills = document.getElementById('libraryDifficultyPills');
const clearDummyFilterBtn = document.getElementById('clearDummyFilterBtn');
const resetAllLibraryFiltersBtn = document.getElementById('resetAllLibraryFiltersBtn');
const libraryMatchCountText = document.getElementById('libraryMatchCountText');
const activeDummyMuscleChips = document.getElementById('activeDummyMuscleChips');
const dummyHoverReadout = document.getElementById('dummyHoverReadout');
const librarySectionsContainer = document.getElementById('librarySectionsContainer');

const libraryState = {
  activePage: 'tracker',
  searchQuery: '',
  category: 'all',
  mechanic: 'all',
  difficulty: 'all',
  selectedMuscles: new Set()
};

let libraryDummy3DViewer = null;
let libraryInitialized = false;
let libraryCardObserver = null;

function updateLibraryCategoryCounts() {
  const navCount = document.querySelector('.nav-pill-count');
  if (navCount) navCount.textContent = String(EXERCISE_LIBRARY_DATA.length);

  if (!libraryCategoryTabs) return;
  const allBtn = libraryCategoryTabs.querySelector('[data-lib-cat="all"]');
  if (allBtn) allBtn.textContent = `All 5 Sections (${EXERCISE_LIBRARY_DATA.length})`;

  const catLabels = {
    dumbbell: '🏋️ Dumbbell',
    barbell: '🧱 Barbell',
    kettlebell: '🔔 Kettlebell',
    bodyweight: '🤸 Bodyweight',
    other: '⚙️ Other Equipment'
  };
  Object.keys(catLabels).forEach((catKey) => {
    const btn = libraryCategoryTabs.querySelector(`[data-lib-cat="${catKey}"]`);
    if (btn) {
      const cnt = EXERCISE_LIBRARY_DATA.filter((ex) => ex.section === catKey).length;
      btn.textContent = `${catLabels[catKey]} (${cnt})`;
    }
  });
}

updateLibraryCategoryCounts();

function countExercisesForMuscle(muscleKey) {
  return EXERCISE_LIBRARY_DATA.filter((ex) =>
    ex.muscleDetails.some((m) => m.key === muscleKey)
  ).length;
}

function initLibraryMannequinFilter() {
  if (libraryInitialized) return;
  libraryInitialized = true;
  updateLibraryCategoryCounts();

  // 1. Initialize 360° 3D Filter Mannequin
  const dummyCanvas = document.getElementById('libraryFilterMannequinCanvas');
  if (dummyCanvas && window.PulseLift3D) {
    libraryDummy3DViewer = window.PulseLift3D.createViewer(
      dummyCanvas,
      'anatomical-mannequin',
      {
        initialYaw: 18,
        initialPitch: 12,
        initialZoom: 1.05,
        autoSpin: false,
        isFilterMannequin: true,
        selectedMuscles: Array.from(libraryState.selectedMuscles),
        onMuscleClick: (muscleKey) => {
          toggleDummyMuscleFilter(muscleKey);
        }
      }
    );
  }

  // 3D Mannequin camera preset buttons
  document.querySelectorAll('[data-dummy-cam], [data-dummy-spin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!libraryDummy3DViewer) return;
      const bar = btn.closest('.mannequin-3d-cam-bar');
      if (btn.hasAttribute('data-dummy-spin')) {
        const spinning = libraryDummy3DViewer.toggleAutoSpin();
        btn.classList.toggle('active', spinning);
      } else {
        const [yaw, pitch] = btn.getAttribute('data-dummy-cam').split(',').map(Number);
        libraryDummy3DViewer.setCameraAngle(yaw, pitch);
        if (bar) {
          bar.querySelectorAll('.mini-cam-btn').forEach((b) => b.classList.remove('active'));
        }
        btn.classList.add('active');
      }
    });
  });

  // 2. Bind Anterior & Posterior SVG Anatomical Dummy Regions
  document.querySelectorAll('.dummy-muscle-region').forEach((regionEl) => {
    const mKey = regionEl.getAttribute('data-dummy-muscle');
    const mLabel = regionEl.getAttribute('data-muscle-label') || MUSCLE_FRIENDLY_LABELS[mKey] || mKey;

    regionEl.addEventListener('mouseenter', () => {
      document.querySelectorAll(`.dummy-muscle-region[data-dummy-muscle="${mKey}"]`).forEach((el) => {
        el.classList.add('dummy-hovered');
      });
      if (libraryDummy3DViewer) {
        libraryDummy3DViewer.setSpotlightMuscle(mKey);
      }
      if (dummyHoverReadout) {
        const count = countExercisesForMuscle(mKey);
        const isSel = libraryState.selectedMuscles.has(mKey);
        dummyHoverReadout.textContent = `${mLabel} · ${count} exercises (${isSel ? 'Click to remove filter' : 'Click to filter'})`;
      }
    });

    regionEl.addEventListener('mouseleave', () => {
      document.querySelectorAll(`.dummy-muscle-region[data-dummy-muscle="${mKey}"]`).forEach((el) => {
        el.classList.remove('dummy-hovered');
      });
      if (libraryDummy3DViewer) {
        libraryDummy3DViewer.setSpotlightMuscle(null);
      }
      updateDummyReadoutDefault();
    });

    regionEl.addEventListener('click', () => {
      toggleDummyMuscleFilter(mKey);
    });
  });
}

function updateDummyReadoutDefault() {
  if (!dummyHoverReadout) return;
  if (libraryState.selectedMuscles.size === 0) {
    dummyHoverReadout.textContent = 'Hover or click any muscle on the dummy to filter exercises';
  } else {
    const names = Array.from(libraryState.selectedMuscles).map(
      (k) => MUSCLE_FRIENDLY_LABELS[k] || k
    );
    dummyHoverReadout.textContent = `Filtering by Dummy: ${names.join(' + ')}`;
  }
}

function toggleDummyMuscleFilter(muscleKey) {
  if (!muscleKey) return;
  if (libraryState.selectedMuscles.has(muscleKey)) {
    libraryState.selectedMuscles.delete(muscleKey);
  } else {
    libraryState.selectedMuscles.add(muscleKey);
    // Rotate 3D dummy automatically to show posterior muscles if user selects a back muscle
    const backMuscles = new Set(['lats', 'upperBack', 'lowerBack', 'rearDelts', 'triceps', 'glutes', 'hamstrings']);
    if (libraryDummy3DViewer) {
      if (backMuscles.has(muscleKey)) {
        libraryDummy3DViewer.setCameraAngle(198, 12);
      } else {
        libraryDummy3DViewer.setCameraAngle(18, 12);
      }
    }
  }
  syncDummyVisualState();
  renderExerciseLibrarySections();
}

function syncDummyVisualState() {
  const selectedArr = Array.from(libraryState.selectedMuscles);

  // Sync 3D Mannequin
  if (libraryDummy3DViewer) {
    libraryDummy3DViewer.setSelectedMuscles(selectedArr);
  }

  // Sync SVG Anterior & Posterior Mannequin
  document.querySelectorAll('.dummy-muscle-region').forEach((el) => {
    const mKey = el.getAttribute('data-dummy-muscle');
    el.classList.toggle('dummy-selected', libraryState.selectedMuscles.has(mKey));
  });

  // Toggle Clear Dummy Filter button
  if (clearDummyFilterBtn) {
    clearDummyFilterBtn.classList.toggle('hidden', selectedArr.length === 0);
  }

  // Render active muscle chips in status bar
  if (activeDummyMuscleChips) {
    activeDummyMuscleChips.innerHTML = selectedArr
      .map(
        (mKey) => `
        <button type="button" class="dummy-active-chip" data-remove-dummy-muscle="${mKey}" title="Click to remove muscle filter">
          <span>🎯 ${escapeHtml(MUSCLE_FRIENDLY_LABELS[mKey] || mKey)}</span>
          <span>✕</span>
        </button>
      `
      )
      .join('');
  }

  updateDummyReadoutDefault();
}

function filterLibraryExercise(ex) {
  // 1. Equipment category filter
  if (libraryState.category !== 'all' && ex.section !== libraryState.category) {
    return false;
  }

  // 2. Movement mechanic filter
  if (libraryState.mechanic !== 'all' && ex.mechanic !== libraryState.mechanic) {
    return false;
  }

  // 3. Difficulty filter
  if (libraryState.difficulty !== 'all' && ex.difficulty !== libraryState.difficulty) {
    return false;
  }

  // 4. GUI Mannequin Muscle Filter (matches if exercise targets ANY of the selected muscles on the dummy)
  if (libraryState.selectedMuscles.size > 0) {
    const targetsSelectedMuscle = ex.muscleDetails.some((m) =>
      libraryState.selectedMuscles.has(m.key)
    );
    if (!targetsSelectedMuscle) return false;
  }

  // 5. Search bar query
  if (libraryState.searchQuery.trim() !== '') {
    const q = libraryState.searchQuery.trim().toLowerCase();
    const hay = [
      ex.name,
      ex.equipmentLabel,
      ex.mechanic,
      ex.difficulty,
      ...ex.muscleDetails.map((m) => m.name),
      ...ex.muscleDetails.map((m) => MUSCLE_FRIENDLY_LABELS[m.key] || ''),
      ...ex.cues
    ]
      .join(' ')
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }

  return true;
}

function renderExerciseLibrarySections() {
  if (!librarySectionsContainer) return;

  if (window.PulseLift3D && window.PulseLift3D.destroyLibraryViewers) {
    window.PulseLift3D.destroyLibraryViewers();
  }

  const matchingExercises = EXERCISE_LIBRARY_DATA.filter(filterLibraryExercise);

  const visibleSections = EXERCISE_LIBRARY_SECTIONS.filter(
    (sec) => libraryState.category === 'all' || sec.key === libraryState.category
  );

  let totalRendered = 0;
  const sectionsHtml = visibleSections
    .map((sec) => {
      const secExercises = matchingExercises.filter((ex) => ex.section === sec.key);
      if (secExercises.length === 0 && (libraryState.searchQuery || libraryState.selectedMuscles.size > 0 || libraryState.mechanic !== 'all' || libraryState.difficulty !== 'all')) {
        return '';
      }
      totalRendered += secExercises.length;

      const cardsHtml = secExercises
        .map((ex) => {
          const muscleBadgesHtml = ex.muscleDetails
            .map(
              (m) => `
              <span
                class="muscle-tag ${m.primary ? 'primary-muscle' : ''}"
                data-muscle-key="${m.key}"
                data-lib-card-muscle="${m.key}"
                title="Hover to spotlight in 3D · Click to filter on Mannequin"
              >
                <i class="muscle-dot ${m.primary ? 'primary-dot' : 'secondary-dot'}"></i>
                ${escapeHtml(m.name)}
              </span>
            `
            )
            .join('');

          const cuesHtml = ex.cues.map((cue) => `<li>${escapeHtml(cue)}</li>`).join('');

          return `
            <article class="exercise-card library-exercise-card" data-lib-exercise="${ex.id}">
              <div class="card-top-bar">
                <div>
                  <span class="exercise-order-badge">${escapeHtml(ex.order)} · ${escapeHtml(ex.equipmentLabel.toUpperCase())}</span>
                  <h3 class="exercise-title">${escapeHtml(ex.name)}</h3>
                </div>
                <div class="exercise-prescription">
                  <span class="rep-scheme-badge" title="Recommended Sets × Reps">${escapeHtml(ex.prescription)}</span>
                </div>
              </div>

              <div class="visual-stage">
                <div class="stage-3d-column">
                  <div class="canvas-3d-box" title="Hover any muscle to see its name · Drag to rotate 360°">
                    <canvas
                      id="canvas-lib-${ex.id}"
                      class="exercise-3d-canvas"
                      data-exercise-id="${ex.id}"
                      data-library-viewer="true"
                    ></canvas>
                    <button
                      class="expand-3d-btn"
                      type="button"
                      data-open-studio="${ex.id}"
                      title="Open Full-Screen 360° 3D Studio & Rep Scrubber"
                    >
                      ⤢ 360° Studio
                    </button>
                    <button
                      class="clinical-light-btn"
                      type="button"
                      data-toggle-light="canvas-lib-${ex.id}"
                      title="Toggle Clinical White Ecorché / Dark Studio Background"
                    >
                      ☀️/🌙
                    </button>
                  </div>

                  <div class="card-360-toolbar" role="group" aria-label="360° Camera Angles">
                    <button type="button" class="mini-cam-btn active" data-cam-target="canvas-lib-${ex.id}" data-yaw="38" data-pitch="15">45°</button>
                    <button type="button" class="mini-cam-btn" data-cam-target="canvas-lib-${ex.id}" data-yaw="0" data-pitch="10">Side</button>
                    <button type="button" class="mini-cam-btn" data-cam-target="canvas-lib-${ex.id}" data-yaw="90" data-pitch="10">Front</button>
                    <button type="button" class="mini-cam-btn" data-cam-target="canvas-lib-${ex.id}" data-yaw="270" data-pitch="10">Back</button>
                    <button type="button" class="mini-cam-btn" data-spin-target="canvas-lib-${ex.id}">↻ 360°</button>
                  </div>
                </div>

                <div class="cues-and-muscles">
                  <div class="muscle-tags" aria-label="Target Muscles (Hover to Spotlight, Click to Filter)">
                    ${muscleBadgesHtml}
                  </div>
                  <ul class="form-cues-list" aria-label="Key Form Cues">
                    ${cuesHtml}
                  </ul>
                </div>
              </div>

              <div class="lib-card-meta-row">
                <div class="lib-meta-chips">
                  <span class="lib-meta-chip">⚙️ ${escapeHtml(ex.equipmentLabel)}</span>
                  <span class="lib-meta-chip">📐 ${escapeHtml(ex.mechanic)}</span>
                  <span class="lib-meta-chip">📊 ${escapeHtml(ex.difficulty)}</span>
                </div>
                <div class="lib-card-actions-group">
                  <button
                    type="button"
                    class="lib-add-day-btn"
                    data-lib-add-day="dayA"
                    data-lib-ex-id="${ex.id}"
                    title="Add ${escapeHtml(ex.name)} to Day A Routine"
                  >
                    + Day A
                  </button>
                  <button
                    type="button"
                    class="lib-add-day-btn"
                    data-lib-add-day="dayB"
                    data-lib-ex-id="${ex.id}"
                    title="Add ${escapeHtml(ex.name)} to Day B Routine"
                  >
                    + Day B
                  </button>
                  <button
                    type="button"
                    class="quick-rest-trigger"
                    data-open-studio="${ex.id}"
                  >
                    🔍 360° Form
                  </button>
                </div>
              </div>
            </article>
          `;
        })
        .join('');

      return `
        <section class="library-equipment-section" data-section-key="${sec.key}">
          <div class="library-section-banner" data-sec="${sec.key}">
            <div class="sec-banner-left">
              <div class="sec-icon-box" aria-hidden="true">${sec.icon}</div>
              <div>
                <h3 class="sec-banner-title">${escapeHtml(sec.title)}</h3>
                <p class="sec-banner-sub">${escapeHtml(sec.subtitle)}</p>
              </div>
            </div>
            <span class="sec-count-pill">${secExercises.length} Exercise${secExercises.length === 1 ? '' : 's'}</span>
          </div>
          <div class="exercise-grid">
            ${cardsHtml}
          </div>
        </section>
      `;
    })
    .filter(Boolean)
    .join('');

  if (!sectionsHtml) {
    librarySectionsContainer.innerHTML = `
      <div class="lib-empty-state">
        <h3>No exercises match your current filters</h3>
        <p class="mannequin-card-subtitle">Try clicking another muscle on the Mannequin or clearing your search query.</p>
        <button type="button" class="btn-accent btn-sm" id="emptyStateResetBtn">Reset All Filters</button>
      </div>
    `;
    const emptyReset = document.getElementById('emptyStateResetBtn');
    if (emptyReset) emptyReset.addEventListener('click', resetAllLibraryFilters);
  } else {
    librarySectionsContainer.innerHTML = sectionsHtml;
  }

  if (libraryMatchCountText) {
    libraryMatchCountText.textContent = `Showing ${totalRendered} of ${EXERCISE_LIBRARY_DATA.length} exercises`;
  }

  // Initialize 3D viewers for rendered library cards (using IntersectionObserver for 60 FPS across 165+ cards)
  if (libraryCardObserver) {
    libraryCardObserver.disconnect();
  }

  if (window.PulseLift3D) {
    const exById = new Map(matchingExercises.map((ex) => [ex.id, ex]));

    const mountCardViewer = (canvasEl) => {
      if (!canvasEl || window.PulseLift3D.getViewer(canvasEl)) return;
      const exId = canvasEl.getAttribute('data-exercise-id');
      const ex = exById.get(exId);
      if (!ex) return;
      window.PulseLift3D.createViewer(canvasEl, ex.id, {
        poseId: ex.poseId || ex.id,
        activeMuscles: buildExerciseActiveMusclesMap(ex),
        initialYaw: 38,
        initialPitch: 15,
        autoSpin: false
      });
    };

    if ('IntersectionObserver' in window) {
      libraryCardObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              mountCardViewer(entry.target);
            }
          });
        },
        { rootMargin: '450px 0px' }
      );
      librarySectionsContainer
        .querySelectorAll('canvas[data-library-viewer="true"]')
        .forEach((canvasEl) => {
          libraryCardObserver.observe(canvasEl);
        });
    } else {
      librarySectionsContainer
        .querySelectorAll('canvas[data-library-viewer="true"]')
        .forEach((canvasEl) => {
          mountCardViewer(canvasEl);
        });
    }
  }
}

function resetAllLibraryFilters() {
  libraryState.searchQuery = '';
  libraryState.category = 'all';
  libraryState.mechanic = 'all';
  libraryState.difficulty = 'all';
  libraryState.selectedMuscles.clear();

  if (librarySearchInput) librarySearchInput.value = '';
  if (clearLibrarySearchBtn) clearLibrarySearchBtn.classList.add('hidden');

  if (libraryCategoryTabs) {
    libraryCategoryTabs.querySelectorAll('.lib-filter-pill').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-lib-cat') === 'all');
    });
  }
  if (libraryMechanicPills) {
    libraryMechanicPills.querySelectorAll('.lib-filter-pill').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-lib-mech') === 'all');
    });
  }
  if (libraryDifficultyPills) {
    libraryDifficultyPills.querySelectorAll('.lib-filter-pill').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-lib-diff') === 'all');
    });
  }

  syncDummyVisualState();
  renderExerciseLibrarySections();
}

function switchPageView(pageName) {
  const validPages = ['tracker', 'planner', 'library', 'history'];
  libraryState.activePage = validPages.includes(pageName) ? pageName : 'tracker';
  const isTrack = libraryState.activePage === 'tracker';
  const isPlan = libraryState.activePage === 'planner';
  const isLib = libraryState.activePage === 'library';
  const isHist = libraryState.activePage === 'history';

  if (trackerPageView) trackerPageView.classList.toggle('hidden', !isTrack);
  if (plannerPageView) plannerPageView.classList.toggle('hidden', !isPlan);
  if (libraryPageView) libraryPageView.classList.toggle('hidden', !isLib);
  if (historyPageView) historyPageView.classList.toggle('hidden', !isHist);

  if (navTrackerPageBtn) navTrackerPageBtn.classList.toggle('active', isTrack);
  if (navPlannerPageBtn) navPlannerPageBtn.classList.toggle('active', isPlan);
  if (navLibraryPageBtn) navLibraryPageBtn.classList.toggle('active', isLib);
  if (navHistoryPageBtn) navHistoryPageBtn.classList.toggle('active', isHist);

  if (isLib) {
    initLibraryMannequinFilter();
    syncDummyVisualState();
    renderExerciseLibrarySections();
  } else if (isHist) {
    renderHistoryAnalysisPage();
  } else if (isPlan) {
    renderModerateCoachWidget();
  } else {
    renderExerciseCards();
  }
}

if (navTrackerPageBtn) {
  navTrackerPageBtn.addEventListener('click', () => {
    window.location.hash = 'tracker';
    switchPageView('tracker');
  });
}

if (navPlannerPageBtn) {
  navPlannerPageBtn.addEventListener('click', () => {
    window.location.hash = 'planner';
    switchPageView('planner');
  });
}

if (navLibraryPageBtn) {
  navLibraryPageBtn.addEventListener('click', () => {
    window.location.hash = 'library';
    switchPageView('library');
  });
}

if (navHistoryPageBtn) {
  navHistoryPageBtn.addEventListener('click', () => {
    window.location.hash = 'history';
    switchPageView('history');
  });
}

if (historyAnalysisPageContainer) {
  historyAnalysisPageContainer.addEventListener('click', (e) => {
    const filterBtn = e.target.closest('[data-history-filter]');
    if (filterBtn) {
      historyFilterPlan = filterBtn.getAttribute('data-history-filter') || 'all';
      renderHistoryAnalysisPage();
      return;
    }

    const actionBtn = e.target.closest('[data-history-action]');
    if (!actionBtn) return;

    const act = actionBtn.getAttribute('data-history-action');
    if (act === 'open-backfill-modal') {
      openBackfillModal(null, appState.activeDay);
    } else if (act === 'open-backfill-date') {
      const clickedDate = actionBtn.getAttribute('data-date') || toLocalIsoDate(new Date());
      openBackfillModal(clickedDate, appState.activeDay);
    } else if (act === 'backfill-day') {
      const dKey = actionBtn.getAttribute('data-day') || 'dayA';
      const dateInput = document.getElementById('backfillDateInput');
      const isoVal = dateInput ? dateInput.value : toLocalIsoDate(new Date());
      backfillWorkoutOnDate(dKey, isoVal);
    } else if (act === 'restore-two-days') {
      resetToTwoDayRealHistory();
    } else if (act === 'jump-next-plan') {
      const nextDay = actionBtn.getAttribute('data-day') || 'dayA';
      appState.activeDay = nextDay === 'dayB' ? 'dayB' : 'dayA';
      saveAppState();
      updateHeaderAndStats();
      window.location.hash = 'tracker';
      switchPageView('tracker');
      showToast(`Switched to ${appState.activeDay === 'dayA' ? '🟦 Plan A' : '🟪 Plan B'} workout tracker!`);
    } else if (act === 'delete-entry') {
      const entryId = Number(actionBtn.getAttribute('data-entry-id'));
      createBackupSnapshot('Pre-Delete Safety Backup');
      workoutHistory = workoutHistory.filter((h) => Number(h.id) !== entryId);
      saveWorkoutHistory({ reason: 'Deleted Single Session', replaceExactHistory: true });
      renderHistoryPanel();
      showToast('Removed session (Safety Snapshot saved in Backup Vault).');
    } else if (act === 'clear-all') {
      if (workoutHistory.length > 0) {
        createBackupSnapshot('Pre-Clear Safety Backup');
      }
      workoutHistory = [];
      saveWorkoutHistory({ reason: 'Cleared All History', allowEmptyOverwrite: true });
      renderHistoryPanel();
      showToast('All workout history cleared (Safety Snapshot preserved below — click ↺ Restore anytime!).');
    } else if (act === 'force-recover') {
      initAutoBackupAndRecovery(true);
    } else if (act === 'create-snapshot') {
      if (workoutHistory.length === 0) {
        showToast('Log at least 1 workout session (or load Demo Schedule) before creating a snapshot.');
        return;
      }
      createBackupSnapshot('Manual User Restore Point');
      saveWorkoutHistory({ reason: 'Manual Restore Point' });
      renderHistoryPanel();
      showToast(`📸 Manual Restore Point saved (${workoutHistory.length} sessions protected)!`);
    } else if (act === 'export-backup') {
      exportBackupJsonFile();
      showToast('📥 Downloaded workout backup JSON file!');
    } else if (act === 'trigger-import') {
      const fileInput = document.getElementById('backupFileInput');
      if (fileInput) fileInput.click();
    } else if (act === 'restore-snapshot') {
      const snapId = actionBtn.getAttribute('data-snapshot-id');
      if (snapId) restoreFromSnapshot(snapId);
    }
  });

  historyAnalysisPageContainer.addEventListener('change', (e) => {
    const target = e.target;
    if (target && target.getAttribute('data-history-action') === 'toggle-auto-download') {
      appState.autoDownloadBackupOnLog = Boolean(target.checked);
      saveAppState();
      showToast(
        appState.autoDownloadBackupOnLog
          ? '✅ Auto-download .json backup enabled on every Workout Log!'
          : 'Auto-download .json backup turned off (Disk & IndexedDB auto-backups remain active).'
      );
      return;
    }
    if (target && target.id === 'backupFileInput' && target.files && target.files[0]) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        importBackupJsonData(String(ev.target.result || ''));
        target.value = '';
      };
      reader.readAsText(file);
    }
  });
}

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#planner') {
    switchPageView('planner');
  } else if (window.location.hash === '#library') {
    switchPageView('library');
  } else if (window.location.hash === '#history') {
    switchPageView('history');
  } else if (window.location.hash === '#tracker') {
    switchPageView('tracker');
  }
});

if (librarySearchInput) {
  librarySearchInput.addEventListener('input', (e) => {
    libraryState.searchQuery = e.target.value;
    if (clearLibrarySearchBtn) {
      clearLibrarySearchBtn.classList.toggle('hidden', !libraryState.searchQuery);
    }
    renderExerciseLibrarySections();
  });
}

if (clearLibrarySearchBtn) {
  clearLibrarySearchBtn.addEventListener('click', () => {
    libraryState.searchQuery = '';
    if (librarySearchInput) librarySearchInput.value = '';
    clearLibrarySearchBtn.classList.add('hidden');
    renderExerciseLibrarySections();
  });
}

if (libraryCategoryTabs) {
  libraryCategoryTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lib-cat]');
    if (!btn) return;
    libraryState.category = btn.getAttribute('data-lib-cat');
    libraryCategoryTabs.querySelectorAll('.lib-filter-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderExerciseLibrarySections();
  });
}

if (libraryMechanicPills) {
  libraryMechanicPills.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lib-mech]');
    if (!btn) return;
    libraryState.mechanic = btn.getAttribute('data-lib-mech');
    libraryMechanicPills.querySelectorAll('.lib-filter-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderExerciseLibrarySections();
  });
}

if (libraryDifficultyPills) {
  libraryDifficultyPills.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lib-diff]');
    if (!btn) return;
    libraryState.difficulty = btn.getAttribute('data-lib-diff');
    libraryDifficultyPills.querySelectorAll('.lib-filter-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderExerciseLibrarySections();
  });
}

if (clearDummyFilterBtn) {
  clearDummyFilterBtn.addEventListener('click', () => {
    libraryState.selectedMuscles.clear();
    syncDummyVisualState();
    renderExerciseLibrarySections();
  });
}

if (resetAllLibraryFiltersBtn) {
  resetAllLibraryFiltersBtn.addEventListener('click', resetAllLibraryFilters);
}

if (activeDummyMuscleChips) {
  activeDummyMuscleChips.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-remove-dummy-muscle]');
    if (!chip) return;
    const mKey = chip.getAttribute('data-remove-dummy-muscle');
    libraryState.selectedMuscles.delete(mKey);
    syncDummyVisualState();
    renderExerciseLibrarySections();
  });
}

// Delegated interactions for Exercise Library Cards (360° camera presets, Studio modal, hover spotlight, and click muscle tag to filter)
if (librarySectionsContainer) {
  librarySectionsContainer.addEventListener('click', (e) => {
    const studioBtn = e.target.closest('[data-open-studio]');
    if (studioBtn) {
      open3DStudioModal(studioBtn.getAttribute('data-open-studio'));
      return;
    }

    const lightBtn = e.target.closest('[data-toggle-light]');
    if (lightBtn) {
      const targetId = lightBtn.getAttribute('data-toggle-light');
      const canvasEl = document.getElementById(targetId);
      const viewer = canvasEl && window.PulseLift3D ? window.PulseLift3D.getViewer(canvasEl) : null;
      if (viewer) viewer.toggleClinicalLight();
      return;
    }

    const camBtn = e.target.closest('[data-cam-target]');
    if (camBtn) {
      const targetId = camBtn.getAttribute('data-cam-target');
      const yaw = Number(camBtn.getAttribute('data-yaw'));
      const pitch = Number(camBtn.getAttribute('data-pitch'));
      const canvasEl = document.getElementById(targetId);
      const viewer = canvasEl && window.PulseLift3D ? window.PulseLift3D.getViewer(canvasEl) : null;
      if (viewer) {
        viewer.setCameraAngle(yaw, pitch);
        const toolbar = camBtn.closest('.card-360-toolbar');
        if (toolbar) {
          toolbar.querySelectorAll('.mini-cam-btn').forEach((b) => b.classList.remove('active'));
        }
        camBtn.classList.add('active');
      }
      return;
    }

    const spinBtn = e.target.closest('[data-spin-target]');
    if (spinBtn) {
      const targetId = spinBtn.getAttribute('data-spin-target');
      const canvasEl = document.getElementById(targetId);
      const viewer = canvasEl && window.PulseLift3D ? window.PulseLift3D.getViewer(canvasEl) : null;
      if (viewer) {
        const spinning = viewer.toggleAutoSpin();
        spinBtn.classList.toggle('active', spinning);
      }
      return;
    }

    const musclePill = e.target.closest('[data-lib-card-muscle]');
    if (musclePill) {
      const mKey = musclePill.getAttribute('data-lib-card-muscle');
      toggleDummyMuscleFilter(mKey);
      showToast(`🎯 Mannequin Filter: ${MUSCLE_FRIENDLY_LABELS[mKey] || mKey}`);
      return;
    }

    const addDayBtn = e.target.closest('[data-lib-add-day]');
    if (addDayBtn) {
      const dKey = addDayBtn.getAttribute('data-lib-add-day');
      const exId = addDayBtn.getAttribute('data-lib-ex-id');
      if (dKey && exId) {
        addExerciseToRoutineDay(dKey, exId);
      }
    }
  });

  librarySectionsContainer.addEventListener('mouseover', (e) => {
    const tag = e.target.closest('.muscle-tag[data-muscle-key]');
    if (!tag) return;
    const card = tag.closest('[data-lib-exercise]');
    if (!card) return;
    const exId = card.getAttribute('data-lib-exercise');
    const canvasEl = document.getElementById(`canvas-lib-${exId}`);
    const viewer = canvasEl && window.PulseLift3D ? window.PulseLift3D.getViewer(canvasEl) : null;
    if (viewer) {
      viewer.setSpotlightMuscle(tag.getAttribute('data-muscle-key'));
    }
  });

  librarySectionsContainer.addEventListener('mouseout', (e) => {
    const tag = e.target.closest('.muscle-tag[data-muscle-key]');
    if (!tag) return;
    const card = tag.closest('[data-lib-exercise]');
    if (!card) return;
    const exId = card.getAttribute('data-lib-exercise');
    const canvasEl = document.getElementById(`canvas-lib-${exId}`);
    const viewer = canvasEl && window.PulseLift3D ? window.PulseLift3D.getViewer(canvasEl) : null;
    if (viewer) {
      viewer.setSpotlightMuscle(null);
    }
  });
}

/* ==========================================================================
   Initial Render & Automatic Backup Recovery
   ========================================================================== */
updateHeaderAndStats();
renderExerciseCards();
renderHistoryPanel();
updateTimerUI();
initAutoBackupAndRecovery(false);
if (window.location.hash === '#planner') {
  switchPageView('planner');
} else if (window.location.hash === '#library') {
  switchPageView('library');
} else if (window.location.hash === '#history') {
  switchPageView('history');
}
