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
    exercises: exercisesState
  };
}

let appState = loadAppState();
let workoutHistory = loadWorkoutHistory();

function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_STATE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    const defaults = createDefaultState();
    const mergedExercises = { ...defaults.exercises };
    if (parsed.exercises) {
      Object.keys(mergedExercises).forEach((exId) => {
        if (parsed.exercises[exId]) {
          if (parsed.exercises[exId].variantKey) {
            mergedExercises[exId].variantKey = parsed.exercises[exId].variantKey;
          }
          if (Array.isArray(parsed.exercises[exId].sets)) {
            mergedExercises[exId].sets = mergedExercises[exId].sets.map((defSet, idx) => {
              const savedSet = parsed.exercises[exId].sets[idx];
              if (!savedSet) return defSet;
              return {
                completed: Boolean(savedSet.completed),
                weight: savedSet.weight !== undefined ? Number(savedSet.weight) : defSet.weight,
                reps: savedSet.reps !== undefined ? Number(savedSet.reps) : defSet.reps
              };
            });
          }
        }
      });
    }
    return {
      activeDay: parsed.activeDay === 'dayB' ? 'dayB' : 'dayA',
      autoStartTimer: parsed.autoStartTimer !== undefined ? Boolean(parsed.autoStartTimer) : true,
      soundEnabled: parsed.soundEnabled !== undefined ? Boolean(parsed.soundEnabled) : true,
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
  } catch (err) {
    console.warn('Failed to persist workout state to localStorage:', err);
  }
}

function loadWorkoutHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function saveWorkoutHistory() {
  try {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(workoutHistory));
  } catch (err) {
    console.warn('Failed to save workout history:', err);
  }
}

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

function calculateDayStats(dayKey) {
  const dayData = WORKOUT_PROGRAM[dayKey];
  let completedSets = 0;
  let totalSets = 0;
  let totalVolume = 0;

  dayData.exercises.forEach((ex) => {
    const exState = appState.exercises[ex.id];
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
}

function renderExerciseCards() {
  if (window.PulseLift3D) {
    window.PulseLift3D.destroyAllCardViewers();
  }

  const dayKey = appState.activeDay;
  const dayData = WORKOUT_PROGRAM[dayKey];

  workoutContainer.innerHTML = dayData.exercises
    .map((rawEx) => {
      const ex = getResolvedExerciseData(rawEx);
      const exState = appState.exercises[ex.id];
      const allSetsDone = exState.sets.every((s) => s.completed);
      const repUnitLabel = ex.unitOverride || 'reps';
      const canvasId = `canvas3d-${ex.id}`;

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
              <span class="exercise-order-badge">${ex.order} · ${allSetsDone ? 'COMPLETED' : '3D MUSCLE MAP'}</span>
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
    dayData.exercises.forEach((rawEx) => {
      const ex = getResolvedExerciseData(rawEx);
      const canvasId = `canvas3d-${ex.id}`;
      const cardEl = workoutContainer.querySelector(`[data-card-exercise="${ex.id}"]`);
      const spinBtn = cardEl ? cardEl.querySelector('[data-action="card-spin"]') : null;

      window.PulseLift3D.createViewer(canvasId, ex.id, {
        poseId: ex.poseId || ex.id,
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

function renderHistoryPanel() {
  historyCountBadge.textContent = String(workoutHistory.length);
  if (workoutHistory.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        No logged workouts yet. Complete your sets and click <strong>Save Workout Log</strong> to record your weights &amp; reps history!
      </div>
    `;
    return;
  }

  historyList.innerHTML = workoutHistory
    .map((entry) => {
      const exSummary = entry.exercises
        .map((e) => {
          const setsStr = e.sets
            .map((s) => `${s.weight}kg×${s.reps}${s.completed ? '✓' : ''}`)
            .join(', ');
          return `<span class="history-ex-pill"><strong>${e.name}:</strong> ${setsStr}</span>`;
        })
        .join('');

      return `
        <div class="history-item">
          <div class="history-item-top">
            <span class="history-item-title">${entry.dayTitle}</span>
            <span class="history-item-meta">${entry.timestamp} · ${entry.completedSets}/12 sets · ${entry.totalVolume} kg vol</span>
          </div>
          <div class="history-exercises-summary">
            ${exSummary}
          </div>
        </div>
      `;
    })
    .join('');
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
  }
});

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
    const found = WORKOUT_PROGRAM[dayKey].exercises.find((x) => x.id === exId);
    if (found) return getResolvedExerciseData(found);
  }
  if (typeof EXERCISE_LIBRARY_DATA !== 'undefined') {
    const libFound = EXERCISE_LIBRARY_DATA.find((x) => x.id === exId);
    if (libFound) return libFound;
  }
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
    badge.textContent = `${programEx.order} · ${allSetsDone ? 'COMPLETED' : '3D MUSCLE MAP'}`;
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
  const dayData = WORKOUT_PROGRAM[dayKey];
  dayData.exercises.forEach((ex) => {
    appState.exercises[ex.id].sets.forEach((s) => {
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
  const dayData = WORKOUT_PROGRAM[dayKey];
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
    dayTitle: dayKey === 'dayA' ? 'Day A (Squat · Floor Press · Row)' : 'Day B (RDL · OHP · Lunge)',
    timestamp: formattedDate,
    completedSets: stats.completedSets,
    totalVolume: stats.totalVolume,
    exercises: dayData.exercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      sets: appState.exercises[ex.id].sets.map((s) => ({ ...s }))
    }))
  };

  workoutHistory.unshift(entry);
  if (workoutHistory.length > 30) {
    workoutHistory = workoutHistory.slice(0, 30);
  }
  saveWorkoutHistory();
  renderHistoryPanel();
  historyDrawer.classList.remove('hidden');
  toggleHistoryBtn.setAttribute('aria-expanded', 'true');
  showToast('Workout session saved to localStorage history!');
});

toggleHistoryBtn.addEventListener('click', () => {
  const isHidden = historyDrawer.classList.toggle('hidden');
  toggleHistoryBtn.setAttribute('aria-expanded', String(!isHidden));
});

closeHistoryBtn.addEventListener('click', () => {
  historyDrawer.classList.add('hidden');
  toggleHistoryBtn.setAttribute('aria-expanded', 'false');
});

clearHistoryBtn.addEventListener('click', () => {
  workoutHistory = [];
  saveWorkoutHistory();
  renderHistoryPanel();
  showToast('Workout history cleared.');
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
const navLibraryPageBtn = document.getElementById('navLibraryPageBtn');
const trackerPageView = document.getElementById('trackerPageView');
const libraryPageView = document.getElementById('libraryPageView');

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
                <button
                  type="button"
                  class="quick-rest-trigger"
                  data-open-studio="${ex.id}"
                >
                  🔍 Inspect 360° Form
                </button>
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
  libraryState.activePage = pageName === 'library' ? 'library' : 'tracker';
  const isLib = libraryState.activePage === 'library';

  if (trackerPageView) trackerPageView.classList.toggle('hidden', isLib);
  if (libraryPageView) libraryPageView.classList.toggle('hidden', !isLib);
  if (navTrackerPageBtn) navTrackerPageBtn.classList.toggle('active', !isLib);
  if (navLibraryPageBtn) navLibraryPageBtn.classList.toggle('active', isLib);

  if (isLib) {
    initLibraryMannequinFilter();
    syncDummyVisualState();
    renderExerciseLibrarySections();
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

if (navLibraryPageBtn) {
  navLibraryPageBtn.addEventListener('click', () => {
    window.location.hash = 'library';
    switchPageView('library');
  });
}

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#library') {
    switchPageView('library');
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
   Initial Render
   ========================================================================== */
updateHeaderAndStats();
renderExerciseCards();
renderHistoryPanel();
updateTimerUI();
if (window.location.hash === '#library') {
  switchPageView('library');
}
