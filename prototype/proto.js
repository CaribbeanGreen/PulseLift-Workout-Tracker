/*
 * PulseLift prototype — Dumbbell Bench Press on a rigged mannequin.
 *
 * - Three.js + a rigged glTF mannequin (Mixamo skeleton).
 * - Arms and legs are posed with analytic two-bone IK each frame.
 * - Muscle glow is a per-vertex weight computed once in the rest pose.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ---- Characters ----
   human      Quaternius "Universal Base Characters" - Superhero Male (CC0), stored in models/superhero-male.
   mannequin  "X Bot" from the Three.js examples.
   More characters (MMD .pmx files) are listed in models/zzz/manifest.json, which is local-only. */
const QUERY = new URLSearchParams(location.search);
const CHARACTERS = {
  human: {
    name: 'Human (default)', type: 'gltf', url: 'models/superhero-male/Superhero_Male_FullBody.gltf',
    glow: true, shorts: true, bodyOnly: !QUERY.has('face')
  },
  mannequin: {
    name: 'Mannequin', type: 'gltf', url: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/models/gltf/Xbot.glb',
    glow: true, shorts: false, bodyOnly: false
  }
};
const CHARACTER_KEY = 'pulselift_character';
let characterId = 'human';
let PROFILE = CHARACTERS.human;

async function initCharacters() {
  try {
    const res = await fetch('models/zzz/manifest.json', { cache: 'no-store' });
    if (res.ok) {
      for (const c of await res.json()) {
        if (c && c.id && c.url && !CHARACTERS[c.id]) {
          CHARACTERS[c.id] = { name: c.name || c.id, type: 'pmx', url: c.url, height: c.height || null, glow: false, shorts: false, bodyOnly: false };
        }
      }
    }
  } catch (_) { /* no extra characters installed */ }
  let saved = null;
  try { saved = localStorage.getItem(CHARACTER_KEY); } catch (_) {}
  const wanted = QUERY.get('character') || saved;
  characterId = CHARACTERS[wanted] ? wanted : 'human';
  PROFILE = CHARACTERS[characterId];
  if (QUERY.get('model')) PROFILE = { name: 'Custom', type: 'gltf', url: QUERY.get('model'), glow: true, shorts: false, bodyOnly: false };

  const sel = $('characterSelect');
  let group = null;
  for (const [id, c] of Object.entries(CHARACTERS)) {
    const o = document.createElement('option');
    o.value = id; o.textContent = c.name; o.selected = id === characterId;
    if (c.type === 'pmx') {
      if (!group) { group = document.createElement('optgroup'); group.label = 'Zenless Zone Zero (this PC only)'; sel.appendChild(group); }
      group.appendChild(o);
    } else sel.appendChild(o);
  }
  sel.addEventListener('change', () => {
    try { localStorage.setItem(CHARACTER_KEY, sel.value); } catch (_) {}
    const u = new URL(location.href);
    u.searchParams.delete('character');
    location.href = u.toString();
  });
  $('characterNote').textContent = PROFILE.glow
    ? 'Muscle highlights are drawn on this model.'
    : 'Muscle highlights are only drawn on the Human and Mannequin models.';
  $('muscleChips').classList.toggle('no-glow', !PROFILE.glow);

  // Movement style: "auto" gives each game character its own; the textbook style for the plain models.
  const st = $('styleSelect');
  let savedStyle = null;
  try { savedStyle = localStorage.getItem(STYLE_KEY); } catch (_) {}
  const choice = QUERY.get('style') || savedStyle || 'auto';
  STYLE = pickStyle(choice);
  const auto = document.createElement('option');
  auto.value = 'auto'; auto.textContent = 'Auto: ' + pickStyle('auto').name; st.appendChild(auto);
  for (const [id, sty] of Object.entries(STYLES)) {
    const o = document.createElement('option');
    o.value = id; o.textContent = sty.name; st.appendChild(o);
  }
  st.value = STYLES[choice] ? choice : 'auto';
  st.addEventListener('change', () => {
    try { localStorage.setItem(STYLE_KEY, st.value); } catch (_) {}
    STYLE = pickStyle(st.value);
  });
}

async function loadCharacter(profile) {
  if (profile.type === 'pmx') {
    const { MMDLoader } = await import('three/addons/loaders/MMDLoader.js');
    const mesh = await new Promise((resolve, reject) => new MMDLoader().load(profile.url, resolve, undefined, reject));
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    const h = Math.max(bb.max.y - bb.min.y, 1e-3);
    // MMD models are conventionally 0.08 m per unit; fall back to a fixed height if that gives nonsense.
    let k = profile.height ? profile.height / h : 0.08;
    if (!profile.height && (h * k < 1.15 || h * k > 2.1)) k = 1.62 / h;
    mesh.scale.setScalar(k);
    return mesh;
  }
  const gltf = await new GLTFLoader(loadManager).loadAsync(profile.url);
  return gltf.scene;
}
const DEBUG_TPOSE = new URLSearchParams(location.search).get('debug') === 'tpose';

const $ = (id) => document.getElementById(id);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const DEG = Math.PI / 180;

const X_AXIS = V(1, 0, 0), Y_AXIS = V(0, 1, 0), Z_AXIS = V(0, 0, 1);

/* ------------------------------------------------------------------ */
/* Exercise content                                                    */
/* ------------------------------------------------------------------ */
const PHASES = [
  { id: 'setup', name: 'Set up', from: 0.0, to: 0.12, tempo: 'hold', breath: 'Breathe in and brace', out: false,
    cue: 'Lie with your head, upper back and hips on the bench and both feet flat on the floor. Pull your shoulder blades back and down. Hold the dumbbells over your shoulders with a slight bend in the elbows.' },
  { id: 'lower', name: 'Lower', from: 0.12, to: 0.55, tempo: '2 s', breath: 'Breathe in', out: false,
    cue: 'Lower the dumbbells slowly, taking about two seconds. Keep your elbows about 45° out from your sides and your forearms upright.' },
  { id: 'bottom', name: 'Bottom', from: 0.55, to: 0.66, tempo: 'pause', breath: 'Hold', out: false,
    cue: 'Stop when the dumbbells are level with your chest, or as low as your shoulders stay comfortable. Wrists stay stacked over elbows. Do not bounce.' },
  { id: 'press', name: 'Press', from: 0.66, to: 1.0, tempo: '1 s', breath: 'Breathe out', out: true,
    cue: 'Press up and slightly inward until your arms are nearly straight. Keep your shoulder blades pinned to the bench and stop just short of locking the elbows.' }
];
const CYCLE_SECONDS = 5.0;
const LIFT_TOP_AT = 0.92; // press reaches the top here, then holds to the end of the cycle

/** 1 = dumbbells at the top, 0 = at the bottom. */
function liftAt(p) {
  if (p < 0.12) return 1;
  if (p < 0.55) return 1 - ease((p - 0.12) / 0.43);
  if (p < 0.66) return 0;
  if (p < LIFT_TOP_AT) return ease((p - 0.66) / (LIFT_TOP_AT - 0.66));
  return 1;
}
/** How hard the muscles are working, 0..1 (drives glow brightness). */
function effortAt(p) {
  const lift = liftAt(p);
  let e = 0.5 + 0.35 * (1 - lift);
  if (p >= 0.66 && p < LIFT_TOP_AT) e += 0.2 * Math.sin(Math.PI * (p - 0.66) / (LIFT_TOP_AT - 0.66));
  return clamp(e, 0, 1);
}

const MUSCLES = ['pecs', 'frontDelts', 'triceps'];
const BASE_ACT = { pecs: 1.0, frontDelts: 0.62, triceps: 0.62 };

/* ------------------------------------------------------------------ */
/* App state                                                           */
/* ------------------------------------------------------------------ */
const state = {
  p: 0, playing: true, speed: 1, form: 'good', flare: 0, // flare: 0 good .. 1 bad
  isolate: null, pinned: null, labels: true, camTween: null, activeCam: 'threeq'
};

/* ------------------------------------------------------------------ */
/* Renderer, scene, lights                                             */
/* ------------------------------------------------------------------ */
const canvas = $('view');
const stageEl = $('stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (err) {
  fail('This browser could not start WebGL, which the 3D view needs.');
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.32;

const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 50);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 1.4;
controls.maxDistance = 6.5;
controls.maxPolarAngle = Math.PI * 0.495;
const CAM_TARGET = V(0, 0.58, 0.08);
controls.target.copy(CAM_TARGET);

const hemiLight = new THREE.HemisphereLight(0xbfd0ff, 0x10131c, 0.55);
scene.add(hemiLight);
const key = new THREE.DirectionalLight(0xfff1e0, 2.3);
key.position.set(0.9, 4.2, 1.3);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 0.5; key.shadow.camera.far = 9;
key.shadow.camera.left = -2; key.shadow.camera.right = 2; key.shadow.camera.top = 2; key.shadow.camera.bottom = -2;
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
key.shadow.radius = 5;
scene.add(key);
const rimBlue = new THREE.DirectionalLight(0x5f9bff, 1.5); rimBlue.position.set(-2.6, 1.8, -2.4); scene.add(rimBlue);
const rimWarm = new THREE.DirectionalLight(0xff7a52, 0.55); rimWarm.position.set(2.6, 0.9, -2.2); scene.add(rimWarm);

/* Floor: soft shadow catcher + a faint pool of light. */
{
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.36 }));
  shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.receiveShadow = true; scene.add(shadowFloor);

  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(120,150,210,0.22)'); grad.addColorStop(0.55, 'rgba(90,120,180,0.07)'); grad.addColorStop(1, 'rgba(90,120,180,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = -0.002; scene.add(pool);
}

/* ------------------------------------------------------------------ */
/* Mannequin material with muscle glow                                 */
/* ------------------------------------------------------------------ */
const glowUniforms = {
  uAct: { value: V(1, 0.6, 0.6) },          // pecs, front delts, triceps
  uRim: { value: new THREE.Color(0x4f86ff) },
  uSh: { value: V(0.19, 1.45, 0) },         // left shoulder joint in the rest pose (right side is mirrored)
  uEl: { value: V(0.47, 1.45, 0) },         // left elbow joint in the rest pose
  uHipY: { value: 1.0 },
  uShorts: { value: 1 }
};

/* Muscle outline parameters (rest pose; metres, or fractions of the half shoulder width). */
const MUSCLE = {
  PEC_CX: 0.50, PEC_DROP: 0.115, PEC_TILT: 0.18, PEC_RX: 0.58, PEC_RY_UP: 0.075, PEC_RY_DOWN: 0.105,
  DELT_OUT: 0.03, DELT_UP: 0.005, DELT_FWD: 0.045, DELT_R: 0.078,
  TRI_T0: 0.22, TRI_T1: 0.95
};
const MUSCLE_DEFINES = Object.entries(MUSCLE).map(([k, v]) => `#define ${k} ${Number(v).toFixed(4)}`).join('\n');

/* Muscles are drawn per pixel from the rest-pose position of each point on the skin,
   so their outlines stay sharp whatever the mesh density. */
function makeBodyMaterial(opts) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xcfd2d8, roughness: 0.58, metalness: 0.02, ...opts });
  mat.onBeforeCompile = (shader) => {
    for (const k in glowUniforms) shader.uniforms[k] = glowUniforms[k];
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aBind;\nattribute vec3 aBindN;\nvarying vec3 vBind;\nvarying vec3 vBindN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = aBind;\nvBindN = aBindN;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        ${MUSCLE_DEFINES}
        varying vec3 vBind;
        varying vec3 vBindN;
        uniform vec3 uAct;
        uniform vec3 uRim;
        uniform vec3 uSh;
        uniform vec3 uEl;
        uniform float uHipY;
        uniform float uShorts;
        vec3 heatColor(float t) {
          vec3 c1 = vec3(0.55, 0.05, 0.03);
          vec3 c2 = vec3(0.95, 0.17, 0.05);
          vec3 c3 = vec3(1.00, 0.46, 0.10);
          vec3 c4 = vec3(1.00, 0.82, 0.40);
          if (t < 0.35) return mix(c1, c2, t / 0.35);
          if (t < 0.75) return mix(c2, c3, (t - 0.35) / 0.40);
          return mix(c3, c4, (t - 0.75) / 0.25);
        }
        // Each returns vec2(mask 0..1, fibre pattern 0..1). q.x is the distance from the midline.
        vec2 pecMuscle(vec3 q, vec3 n) {
          float cx = uSh.x * PEC_CX;
          float cy = uSh.y - PEC_DROP + (q.x - cx) * PEC_TILT;
          float rx = uSh.x * PEC_RX;
          float ry = q.y > cy ? PEC_RY_UP : PEC_RY_DOWN;
          float d = length(vec2((q.x - cx) / rx, (q.y - cy) / ry));
          float m = 1.0 - smoothstep(0.90, 1.0, d);
          m *= smoothstep(0.0, 0.30, n.z);                          // front of the body only
          m *= smoothstep(0.006, 0.016, q.x);                       // sternum line
          m *= 1.0 - smoothstep(uSh.x * 0.98, uSh.x * 1.10, q.x);   // stop at the armpit
          vec2 ins = vec2(uSh.x * 1.02, uSh.y - 0.07);              // fibres converge on the upper arm
          float a = atan(q.y - ins.y, ins.x - q.x);
          return vec2(m, 0.5 + 0.5 * sin(a * 58.0));
        }
        vec2 deltMuscle(vec3 q, vec3 n) {
          vec3 c = uSh + vec3(DELT_OUT, DELT_UP, DELT_FWD);
          float d = length((q - c) * vec3(1.0, 1.1, 1.0)) / DELT_R;
          float m = 1.0 - smoothstep(0.88, 1.0, d);
          m *= smoothstep(-0.05, 0.25, n.z);
          return vec2(m, 0.5 + 0.5 * sin((q.z - q.y * 0.6) * 300.0));
        }
        vec2 triMuscle(vec3 q, vec3 n) {
          vec3 e = uEl - uSh;
          float t = dot(q - uSh, e) / dot(e, e);
          float r = length(q - (uSh + e * t));
          float m = smoothstep(TRI_T0, TRI_T0 + 0.07, t) * (1.0 - smoothstep(TRI_T1 - 0.07, TRI_T1, t));
          m *= smoothstep(0.10, 0.35, dot(n, normalize(vec3(0.0, -0.30, -0.95))));
          m *= 1.0 - step(0.12, r);
          float ang = atan(q.y - (uSh.y + e.y * t), q.z - (uSh.z + e.z * t));
          return vec2(m, 0.5 + 0.5 * sin(ang * 22.0));
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 q = vec3(abs(vBind.x), vBind.y, vBind.z);
        vec3 bn = normalize(vBindN);
        vec2 mp = pecMuscle(q, bn);
        vec2 md = deltMuscle(q, bn);
        vec2 mt = triMuscle(q, bn);
        float gp = mp.x * uAct.x;
        float gd = md.x * uAct.y;
        float gt = mt.x * uAct.z;
        float glow = max(gp, max(gd, gt));
        float fiber = (gp >= gd && gp >= gt) ? mp.y : (gd >= gt ? md.y : mt.y);
        float inShorts = 1.0 - step(0.32, q.x);
        float shorts = uShorts * inShorts * smoothstep(uHipY - 0.335, uHipY - 0.325, vBind.y) * (1.0 - smoothstep(uHipY + 0.045, uHipY + 0.055, vBind.y));
        float band = uShorts * inShorts * smoothstep(uHipY + 0.012, uHipY + 0.018, vBind.y) * (1.0 - smoothstep(uHipY + 0.045, uHipY + 0.055, vBind.y));
        glow *= 1.0 - shorts;
        vec3 heat = heatColor(clamp(glow * mix(0.62, 0.86, fiber), 0.0, 1.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, heat, smoothstep(0.02, 0.30, glow));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.028, 0.030, 0.036), shorts);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.075, 0.080, 0.092), band);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.9, shorts);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += heat * glow * glow * mix(0.55, 1.0, fiber) * 0.85;`)
      .replace('#include <opaque_fragment>', `
        float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
        outgoingLight += uRim * rimF * 0.5 * (1.0 - shorts * 0.7);
        #include <opaque_fragment>`);
  };
  return mat;
}

/* ------------------------------------------------------------------ */
/* Equipment                                                           */
/* ------------------------------------------------------------------ */
const BENCH_TOP = 0.44;
const BENCH_WIDTH = 0.30;

function buildBench(z0, z1) {
  const g = new THREE.Group();
  const padMat = new THREE.MeshStandardMaterial({ color: 0x1b1f29, roughness: 0.78, metalness: 0.0 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x23272f, roughness: 0.55, metalness: 0.35 });
  const len = z1 - z0, mid = (z0 + z1) / 2;
  const padH = 0.075;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(BENCH_WIDTH, padH, len), padMat);
  pad.position.set(0, BENCH_TOP - padH / 2, mid);
  const board = new THREE.Mesh(new THREE.BoxGeometry(BENCH_WIDTH - 0.03, 0.02, len - 0.03), steel);
  board.position.set(0, BENCH_TOP - padH - 0.01, mid);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, len - 0.16), steel);
  spine.position.set(0, BENCH_TOP - padH - 0.045, mid);
  g.add(pad, board, spine);
  for (const z of [z0 + 0.14, z1 - 0.14]) {
    const legH = BENCH_TOP - padH - 0.07;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.055, legH, 0.055), steel);
    leg.position.set(0, legH / 2 + 0.02, z);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.06), steel);
    foot.position.set(0, 0.02, z);
    g.add(leg, foot);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

const DB = { handleHalf: 0.068, handleR: 0.0145, headLen: 0.075, headR: 0.068 };
function buildDumbbell() {
  const g = new THREE.Group(); // long axis = local Y
  const chrome = new THREE.MeshStandardMaterial({ color: 0xcfd4dc, roughness: 0.28, metalness: 1.0 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.72, metalness: 0.1 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(DB.handleR, DB.handleR, DB.handleHalf * 2 + 0.02, 24), chrome);
  g.add(handle);
  for (const s of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.CylinderGeometry(DB.headR, DB.headR, DB.headLen, 40), rubber);
    head.position.y = s * (DB.handleHalf + DB.headLen / 2);
    const bevelIn = new THREE.Mesh(new THREE.CylinderGeometry(DB.headR * 0.72, DB.headR, 0.012, 40), rubber);
    bevelIn.position.y = s * (DB.handleHalf - 0.006);
    if (s > 0) bevelIn.rotation.x = Math.PI; // narrow end faces the handle
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(DB.headR * 0.42, DB.headR * 0.42, 0.004, 32), chrome);
    cap.position.y = s * (DB.handleHalf + DB.headLen + 0.002);
    g.add(head, bevelIn, cap);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/* ------------------------------------------------------------------ */
/* Rig                                                                 */
/* ------------------------------------------------------------------ */
const rig = { bones: {}, rest: {}, sides: {}, root: null, ready: false };
const SIDES = [{ name: 'Left', s: 1 }, { name: 'Right', s: -1 }];
const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];

const BONE_ALIAS = { Spine2: ['spine_03', '上半身2', '上半身'], Head: ['頭'] };
const LIMB_ALIAS = { Arm: 'upperarm', ForeArm: 'lowerarm', Hand: 'hand', UpLeg: 'thigh', Leg: 'calf', Foot: 'foot' };
// MMD (.pmx) names. Legs prefer the "D" bones, which are the ones the skin is attached to.
const MMD_LIMB = { Arm: ['腕'], ForeArm: ['ひじ'], Hand: ['手首'], UpLeg: ['足D', '足'], Leg: ['ひざD', 'ひざ'], Foot: ['足首D', '足首'] };
const MMD_FINGER = { Thumb: ['親指', '０１２'], Index: ['人指', '１２３'], Middle: ['中指', '１２３'], Ring: ['薬指', '１２３'], Pinky: ['小指', '１２３'] };
/** Find a bone by its Mixamo-style name, falling back to the Unreal-style and MMD names. */
function boneOpt(name) {
  const direct = rig.bones['mixamorig' + name] || rig.bones['mixamorig:' + name] || rig.bones[name];
  if (direct) return direct;
  for (const n of BONE_ALIAS[name] || []) if (rig.bones[n]) return rig.bones[n];
  const m = /^(Left|Right)(.+)$/.exec(name);
  if (!m) return null;
  const sfx = m[1] === 'Left' ? '_l' : '_r';
  const jp = m[1] === 'Left' ? '左' : '右';
  if (LIMB_ALIAS[m[2]]) {
    if (rig.bones[LIMB_ALIAS[m[2]] + sfx]) return rig.bones[LIMB_ALIAS[m[2]] + sfx];
    for (const n of MMD_LIMB[m[2]]) if (rig.bones[jp + n]) return rig.bones[jp + n];
    return null;
  }
  const fm = /^Hand(Thumb|Index|Middle|Ring|Pinky)(\d)$/.exec(m[2]);
  if (fm) {
    const en = rig.bones[fm[1].toLowerCase() + '_0' + fm[2] + sfx];
    if (en) return en;
    const [stem, digits] = MMD_FINGER[fm[1]];
    return rig.bones[jp + stem + digits[Number(fm[2]) - 1]] || null;
  }
  return null;
}
function bone(name) {
  const b = boneOpt(name);
  if (!b) throw new Error('Model is missing the bone "' + name + '"');
  return b;
}
const wp = (obj, out = V()) => obj.getWorldPosition(out);
const wq = (obj, out = new THREE.Quaternion()) => obj.getWorldQuaternion(out);

const _mx = new THREE.Matrix4();
/** Quaternion of the orthonormal frame (a, h made perpendicular to a, a × h). */
function frameQuat(a, h, out = new THREE.Quaternion()) {
  const x = a.clone().normalize();
  const y = h.clone().addScaledVector(x, -h.dot(x));
  if (y.lengthSq() < 1e-10) y.copy(Math.abs(x.y) < 0.9 ? Y_AXIS : X_AXIS).addScaledVector(x, -x.dot(Math.abs(x.y) < 0.9 ? Y_AXIS : X_AXIS));
  y.normalize();
  const z = V().crossVectors(x, y);
  _mx.makeBasis(x, y, z);
  return out.setFromRotationMatrix(_mx);
}

/** Record a limb bone's rest orientation, axis (toward its child) and hinge axis, all in world space. */
function captureLimb(b, child, hingeWorld) {
  const a0 = wp(child).sub(wp(b));
  return { bone: b, len: a0.length(), restWorldQ: wq(b), frameInv: frameQuat(a0, hingeWorld).invert() };
}
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion();
/** Orient a limb bone so its axis points along `dir` and its hinge axis along `hinge`. */
function aimLimb(rest, dir, hinge) {
  frameQuat(dir, hinge, _qa).multiply(rest.frameInv).multiply(rest.restWorldQ); // world orientation
  rest.bone.parent.getWorldQuaternion(_qb).invert();
  rest.bone.quaternion.copy(_qb).multiply(_qa);
  rest.bone.updateMatrixWorld(true);
}

/** Two-bone IK: returns the middle joint position; clamps the end target to reachable range. */
function solveTwoBone(S, W, L1, L2, pole, outMid, outEnd) {
  const d = V().subVectors(W, S);
  const maxReach = (L1 + L2) * 0.985;
  const dist = clamp(d.length(), Math.abs(L1 - L2) + 1e-3, maxReach);
  const dir = d.normalize();
  const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
  const perp = pole.clone().addScaledVector(dir, -pole.dot(dir));
  if (perp.lengthSq() < 1e-8) perp.set(0, 1, 0).addScaledVector(dir, -dir.y);
  perp.normalize();
  outMid.copy(S).addScaledVector(dir, a).addScaledVector(perp, h);
  outEnd.copy(S).addScaledVector(dir, dist);
}

/* MMD materials carry an "ambient" colour that the loader adds as a flat glow, which turns black
   cloth grey. MMD itself multiplies ambient by the texture, so use a white ambient light instead. */
function fixToonMaterials(mesh) {
  for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
    if (m.emissive) m.emissive.setScalar(0);
    m.toneMapped = false;
    m.needsUpdate = true;
  }
  hemiLight.intensity = 0.25;
  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
}

function setupRig(model, profile) {
  const root = new THREE.Group();
  root.add(model);
  scene.add(root);
  rig.root = root;
  root.updateMatrixWorld(true);

  const meshes = [];
  model.traverse((o) => {
    if (o.isBone) rig.bones[o.name] = o;
    if (o.isSkinnedMesh) meshes.push(o);
  });
  // Keep only the body (the largest mesh); hair, brows and eyes are hidden for the mannequin look.
  meshes.sort((a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count);
  rig.extras = profile.bodyOnly ? meshes.splice(1) : [];
  for (const m of rig.extras) m.visible = false;
  if (!meshes.length) throw new Error('Model has no skinned mesh');
  rig.meshes = meshes;

  /* ---- measurements in the standing rest pose (character space) ---- */
  const J = {};
  J.Spine2 = wp(bone('Spine2'));
  for (const { name } of SIDES) for (const n of ['Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot']) J[name + n] = wp(bone(name + n));
  if (J.LeftArm.x < J.RightArm.x) throw new Error('Model faces the wrong way (expected the left arm at +X)');
  J.Hips = J.LeftUpLeg.clone().add(J.RightUpLeg).multiplyScalar(0.5); J.Hips.y += 0.04;
  rig.J = J;

  // Per-vertex rest positions and normals in character space.
  const bbox = new THREE.Box3();
  const perMesh = meshes.map((m) => {
    m.skeleton.update();
    const pos = m.geometry.attributes.position, nor = m.geometry.attributes.normal;
    const n = pos.count;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3);
    const v = V(), nm = new THREE.Matrix3().getNormalMatrix(m.matrixWorld), nv = V();
    for (let i = 0; i < n; i++) {
      m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld);
      P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z;
      bbox.expandByPoint(v);
      nv.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      N[i * 3] = nv.x; N[i * 3 + 1] = nv.y; N[i * 3 + 2] = nv.z;
    }
    return { mesh: m, P, N, n };
  });
  rig.bbox = bbox;
  const ground = bbox.min.y;
  const height = bbox.max.y - ground;
  rig.height = height;

  // Rest orientations needed later.
  const restT = {};
  for (const { name } of SIDES) {
    restT[name + 'Foot'] = wq(bone(name + 'Foot'));
    restT[name + 'Hand'] = wq(bone(name + 'Hand'));
    // Palm normal: straight down, made perpendicular to the hand's direction (rest pose may be an A-pose).
    const k = boneOpt(name + 'HandMiddle1');
    const n = V(0, -1, 0);
    if (k) { const d = wp(k).sub(J[name + 'Hand']).normalize(); n.addScaledVector(d, d.y).normalize(); }
    restT[name + 'PalmN'] = n;
  }
  const ankleH = Math.min(J.LeftFoot.y, J.RightFoot.y) - ground;

  // Most posterior point of the torso (what rests on the bench).
  let backZ = Infinity;
  const yLo = J.Hips.y - 0.12, yHi = (J.LeftArm.y + J.RightArm.y) / 2 + 0.02, xMax = Math.abs(J.LeftArm.x) * 0.95;
  for (const { P, n } of perMesh) for (let i = 0; i < n; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (y > yLo && y < yHi && Math.abs(x) < xMax && z < backZ) backZ = z;
  }
  // Characters with long hair, coats or tails would be propped up on them; use the spine instead.
  if (profile.type === 'pmx') backZ = Math.min(J.Spine2.z, J.Hips.z) - 0.105;
  rig.backZ = backZ;
  { const hb = boneOpt('Head'); rig.sweat = hb ? pickSweatAnchors(perMesh[0], hb) : null; }

  /* ---- muscle anchors, rest-pose attributes, material ---- */
  glowUniforms.uSh.value.set(Math.abs(J.LeftArm.x), J.LeftArm.y, J.LeftArm.z);
  glowUniforms.uEl.value.set(Math.abs(J.LeftForeArm.x), J.LeftForeArm.y, J.LeftForeArm.z);
  glowUniforms.uHipY.value = (J.LeftUpLeg.y + J.RightUpLeg.y) / 2;
  glowUniforms.uShorts.value = profile.shorts ? 1 : 0;
  for (const { mesh, P, N } of perMesh) {
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    if (!profile.glow) { // keep the character's own materials
      if (profile.type === 'pmx') fixToonMaterials(mesh);
      continue;
    }
    if (/joint/i.test(mesh.name)) { // the mannequin's separate joint pieces: plain, darker, no glow
      mesh.material = new THREE.MeshStandardMaterial({ color: 0x7d8490, roughness: 0.5, metalness: 0.04 });
      continue;
    }
    mesh.geometry.setAttribute('aBind', new THREE.BufferAttribute(P, 3));
    mesh.geometry.setAttribute('aBindN', new THREE.BufferAttribute(N, 3));
    const old = mesh.material;
    const opts = {};
    if (old && old.normalMap) { opts.normalMap = old.normalMap; opts.normalScale = new THREE.Vector2(1.15, 1.15); }
    mesh.material = makeBodyMaterial(opts);
  }

  /* ---- finger curl axes (bone-local), from the standing rest pose ---- */
  rig.fingers = [];
  for (const { name, s } of SIDES) {
    const add = (boneName, axisChar, angle) => {
      const b = boneOpt(boneName); if (!b) return;
      const axisLocal = axisChar.clone().applyQuaternion(wq(b).invert()).normalize();
      rig.fingers.push({ bone: b, restQ: b.quaternion.clone(), curl: new THREE.Quaternion().setFromAxisAngle(axisLocal, angle) });
    };
    // In the rest pose the fingers point along ±X with palms down; curling the tips down is a turn about Z.
    const curlSign = -s;
    for (const f of FINGERS) {
      add(name + 'Hand' + f + '1', Z_AXIS, curlSign * 62 * DEG);
      add(name + 'Hand' + f + '2', Z_AXIS, curlSign * 78 * DEG);
      add(name + 'Hand' + f + '3', Z_AXIS, curlSign * 48 * DEG);
    }
    add(name + 'HandThumb1', X_AXIS, s * 28 * DEG);
    add(name + 'HandThumb2', Z_AXIS, curlSign * 26 * DEG);
    add(name + 'HandThumb3', Z_AXIS, curlSign * 34 * DEG);
  }

  if (DEBUG_TPOSE) { rig.debug = true; rig.ready = true; return; }

  /* ---- lay the body on the bench ---- */
  root.rotation.x = -Math.PI / 2;                    // head toward −Z, feet toward +Z, face up
  const shoulderY = (J.LeftArm.y + J.RightArm.y) / 2;
  root.position.set(0, BENCH_TOP - backZ - 0.012, (shoulderY - ground) - 0.38);
  root.updateMatrixWorld(true);
  rig.zOfHeight = (y) => root.position.z - y; // world z of a point at standing height y

  const rootQ = root.quaternion.clone();
  const hingeArmL = V(0, -1, 0).applyQuaternion(rootQ), hingeArmR = V(0, 1, 0).applyQuaternion(rootQ);
  const hingeLeg = V(1, 0, 0).applyQuaternion(rootQ);

  for (const { name, s } of SIDES) {
    const side = { s };
    side.arm = captureLimb(bone(name + 'Arm'), bone(name + 'ForeArm'), s > 0 ? hingeArmL : hingeArmR);
    side.fore = captureLimb(bone(name + 'ForeArm'), bone(name + 'Hand'), s > 0 ? hingeArmL : hingeArmR);
    side.thigh = captureLimb(bone(name + 'UpLeg'), bone(name + 'Leg'), hingeLeg);
    side.shin = captureLimb(bone(name + 'Leg'), bone(name + 'Foot'), hingeLeg);
    side.hand = bone(name + 'Hand');
    side.handRestLocal = side.hand.quaternion.clone();
    side.foot = bone(name + 'Foot');
    side.footFlatQ = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, s * 14 * DEG).multiply(restT[name + 'Foot']);
    const handInv = restT[name + 'Hand'].clone().invert();
    side.palmNLocal = restT[name + 'PalmN'].clone().applyQuaternion(handInv);   // palm normal in hand space
    side.acrossLocal = V(0, 0, 1).applyQuaternion(handInv);   // across the palm (handle direction)
    side.knuckle = boneOpt(name + 'HandMiddle1');
    side.dumbbell = buildDumbbell();
    scene.add(side.dumbbell);
    side.shoulder = wp(side.arm.bone);
    side.hip = wp(side.thigh.bone);
    side.elbow = V(); side.wrist = V(); side.knee = V(); side.ankle = V();
    rig.sides[name] = side;
  }
  rig.ankleH = ankleH;
  setupLive();

  /* ---- bench under the torso ---- */
  const headTopZ = rig.zOfHeight(bbox.max.y) - 0.06;
  const seatEndZ = rig.zOfHeight(J.Hips.y) + 0.19;
  scene.add(buildBench(headTopZ, seatEndZ));
  rig.benchZ0 = headTopZ; rig.benchZ1 = seatEndZ;

  rig.ready = true;
}

/* ------------------------------------------------------------------ */
/* Liveliness: fatigue over a set, breathing, face, effort shake, sweat */
/* ------------------------------------------------------------------ */
const REPS_PER_SET = 10;
const live = { hold: 0, sp: { chest: 0, head: 0, db: 0, knee: 0, sway: 0, cam: 0, focus: 0, finish: 0 }, on: true, rep: 1, fat: 0, wet: 0, strain: 0, relief: 0, breath: 0, pant: 0.5, t: 0, blink: 0, nextBlink: 2.5, forceFat: null };
const pressBump = (p) => (p >= 0.66 && p < LIFT_TOP_AT ? Math.sin(Math.PI * (p - 0.66) / (LIFT_TOP_AT - 0.66)) : 0);

/* ---- Hand-keyed rep ----
   Each style is a list of key poses [time in the rep, dumbbell height, easing into this key].
   Height 1 = lockout, 0 = bottom. Values past 0 or 1 are the anticipation dips and overshoots
   that give the move weight; the follow-through springs below make the rest of the body arrive late. */
const EASE = {
  lin: (u) => u, in: (u) => u * u, out: (u) => 1 - (1 - u) * (1 - u), io: (u) => u * u * (3 - 2 * u),
  in3: (u) => u * u * u, out3: (u) => 1 - Math.pow(1 - u, 3)
};
function makeTrack(keys) {
  return (p) => {
    p = clamp(p, 0, 0.99999);
    let i = 0;
    while (i < keys.length - 2 && p >= keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1];
    const u = clamp((p - a[0]) / Math.max(b[0] - a[0], 1e-6), 0, 1);
    return a[1] + (b[1] - a[1]) * EASE[b[2] || 'io'](u);
  };
}
const inWin = (p, a, b) => (p >= a && p < b ? Math.sin(Math.PI * (p - a) / (b - a)) : 0);
const STYLES = {
  steady: {
    name: 'Steady (textbook)', tempo: 1, lag: 0.07, sway: 0, kick: 1,
    lift: makeTrack([[0, 1], [0.10, 1], [0.13, 1.015], [0.52, 0.02], [0.56, -0.025, 'out'], [0.62, 0], [0.655, -0.03, 'in'],
      [0.84, 1.0, 'out3'], [0.875, 1.035, 'out'], [0.93, 0.992], [1, 1]])
  },
  power: {
    name: 'Powerhouse', tempo: 0.86, lag: 0.03, sway: 0, kick: 1.7,
    lift: makeTrack([[0, 1], [0.09, 1], [0.12, 1.03], [0.48, 0.0, 'in'], [0.53, -0.06, 'out'], [0.60, -0.01], [0.645, -0.07, 'in'],
      [0.77, 1.02, 'out3'], [0.81, 1.08, 'out'], [0.88, 0.975], [0.94, 1.01], [1, 1]]),
    face: (p, t) => { t.mouthSmile += 0.4 * (1 - live.strain); t.browAngry += live.strain * 0.5; t.browTroubled *= 0.4; }
  },
  clumsy: {
    name: 'Clumsy', tempo: 1.06, lag: 0.17, sway: 1, kick: 2.4,
    lift: makeTrack([[0, 1], [0.10, 1], [0.13, 1.02], [0.21, 0.78, 'out'], [0.27, 0.85], [0.50, 0.04, 'in'], [0.55, -0.08, 'out'],
      [0.63, 0.02], [0.66, -0.02], [0.75, 0.46, 'out'], [0.79, 0.37], [0.90, 1.0, 'out'], [0.935, 1.07, 'out'], [0.975, 0.965], [1, 1]]),
    face: (p, t) => {
      const scare = Math.max(inWin(p, 0.19, 0.29), inWin(p, 0.74, 0.82), inWin(p, 0.5, 0.58) * 0.6);
      t.wide = Math.max(t.wide, scare * 0.95); t.mouthA += scare * 0.6; t.blink *= 1 - scare; t.browTroubled += 0.3;
    }
  },
  sleepy: {
    name: 'Sleepy', tempo: 1.4, lag: 0.05, sway: 0.35, kick: 0.5,
    lift: makeTrack([[0, 1], [0.14, 1], [0.55, 0.26], [0.66, 0.24], [0.90, 0.99, 'io'], [1, 1]]),
    face: (p, t) => {
      const yawn = live.rep % 3 === 0 ? inWin(p, 0.0, 0.12) : 0;
      t.blink = Math.max(t.blink, 0.5, yawn); t.mouthA = Math.max(t.mouthA, yawn * 0.95); t.mouthI *= 0.3; t.browAngry = 0;
    }
  }
};
const STYLE_KEY = 'pulselift_style';
let STYLE = STYLES.steady;
function pickStyle(choice) {
  if (STYLES[choice]) return STYLES[choice];
  if (!PROFILE || PROFILE.type !== 'pmx') return STYLES.steady;       // "auto": by character
  let hsh = 0;
  for (const ch of characterId) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
  return STYLES[['power', 'clumsy', 'steady', 'sleepy', 'power', 'clumsy'][hsh % 6]];
}

/* Follow-through: damped springs that chase a target and can be kicked on a beat of the rep. */
const springs = {};
function spring(name, target, k, damp, dt) {
  const sp = springs[name] || (springs[name] = { x: target, v: 0 });
  const n = Math.max(1, Math.ceil(dt / 0.008)), hh = dt / n;
  for (let i = 0; i < n; i++) { sp.v += (-k * (sp.x - target) - damp * sp.v) * hh; sp.x += sp.v * hh; }
  return sp.x;
}
function kick(name, impulse) { (springs[name] || (springs[name] = { x: 0, v: 0 })).v += impulse; }
const BEATS = [[0.13, 'start'], [0.55, 'bottom'], [0.655, 'drive'], [0.875, 'lockout']];
function onBeat(name) {
  const kk = STYLE.kick * (0.7 + 0.6 * live.fat);
  if (name === 'bottom') { kick('chest', 2.2); kick('db', 5 * kk); kick('head', -18); }
  if (name === 'drive') { kick('knee', 3.5 * kk); kick('head', 30 * kk); }
  if (name === 'lockout') {
    kick('db', 9 * kk); kick('chest', -3); kick('cam', 2.2 * kk); kick('head', -22 * kk);
    if (live.rep === REPS_PER_SET) { live.hold = 0.16; showToast('Set complete'); }
  }
}
function showToast(text) {
  const el = $('toast');
  el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

// Standard MMD face-shape names; the first one a model has is used.
const FACE_MORPHS = {
  blink: ['まばたき'], happyEyes: ['笑い'], wide: ['びっくり'],
  browTroubled: ['困る', '悲し', '下'], browAngry: ['怒り'], browSmile: ['にこり'],
  mouthA: ['あ'], mouthI: ['い'], mouthSmile: ['口角上げ'], blush: ['照れ', '頬染め', '赤面', '照れ2']
};

function setupFace(mesh) {
  const dict = mesh.morphTargetDictionary;
  if (!dict || !mesh.morphTargetInfluences) return null;
  const idx = {}, val = {};
  for (const [k, names] of Object.entries(FACE_MORPHS)) {
    idx[k] = -1; val[k] = 0;
    for (const n of names) if (n in dict) { idx[k] = dict[n]; break; }
  }
  return { mesh, idx, val };
}

/** Pick points on the forehead, temples and cheeks (skin attached to the head bone) for sweat. */
function pickSweatAnchors(pm, head) {
  const m = pm.mesh, hi = m.skeleton.bones.indexOf(head);
  const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
  if (hi < 0 || !si || !sw) return null;
  const hw = wp(head), inv = head.matrixWorld.clone().invert(), invQ = wq(head).invert();
  // Game models name their face material; use it so droplets land on skin, not on hair.
  let faceMask = null;
  const mats = Array.isArray(m.material) ? m.material : null, index = m.geometry.index;
  if (mats && index) {
    for (const g of m.geometry.groups) {
      if (!/^(颜|顔|face)/i.test((mats[g.materialIndex] || {}).name || '')) continue;
      faceMask = faceMask || new Uint8Array(pm.n);
      for (let k = g.start; k < g.start + g.count; k++) faceMask[index.getX(k)] = 1;
    }
  }
  const cand = [];
  let top = hw.y, fLo = Infinity, fHi = -Infinity;
  for (let i = 0; i < pm.n; i++) {
    let w = 0;
    for (let c = 0; c < 4; c++) if (si.getComponent(i, c) === hi) w += sw.getComponent(i, c);
    if (w < 0.9) continue;
    const y = pm.P[i * 3 + 1];
    if (y > top) top = y;
    if (faceMask) {
      if (!faceMask[i]) continue;
      if (y < fLo) fLo = y;
      if (y > fHi) fHi = y;
    }
    cand.push(i);
  }
  const H = top - hw.y;
  if (H < 0.05) return null;
  // Height band to use: upper two-thirds of the face, or the forehead zone of a bare head.
  const bandLo = faceMask ? fLo + (fHi - fLo) * 0.35 : hw.y + H * 0.4;
  const bandHi = faceMask ? fLo + (fHi - fLo) * 0.97 : hw.y + H * 0.86;
  const picks = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let tries = 0; tries < 4000 && picks.length < 16 && cand.length; tries++) {
    const i = cand[Math.floor(rnd() * cand.length)];
    const x = pm.P[i * 3], y = pm.P[i * 3 + 1], z = pm.P[i * 3 + 2];
    if (y < bandLo || y > bandHi || pm.N[i * 3 + 2] < 0.25) continue;
    if (picks.some((q) => Math.hypot(q.w.x - x, q.w.y - y, q.w.z - z) < H * (faceMask ? 0.07 : 0.11))) continue;
    picks.push({
      w: V(x, y, z), pos: V(x, y, z).applyMatrix4(inv),
      nrm: V(pm.N[i * 3], pm.N[i * 3 + 1], pm.N[i * 3 + 2]).applyQuaternion(invQ).normalize(),
      thr: 0.12 + 0.75 * rnd(), state: 0, size: 0, slide: 0, vy: 0, at: V()
    });
  }
  if (!picks.length) return null;
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8efff, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.82, emissive: 0x1c2a38 });
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mat, picks.length);
  drops.frustumCulled = false; drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(drops);
  return { head, picks, drops, r: 0.0052 * (H / 0.2), reach: 0.035 * (H / 0.2) };
}

/** Called once the body is lying on the bench. */
function setupLive() {
  const spine = bone('Spine2'), head = boneOpt('Head');
  spine.parent.updateWorldMatrix(true, false);
  const inv = spine.parent.matrixWorld.clone().invert();
  const p0 = wp(spine);
  const a = p0.clone().applyMatrix4(inv), b = p0.clone().add(UP).applyMatrix4(inv);
  rig.live = { spine, spineRestPos: spine.position.clone(), breathDelta: b.sub(a), head: null };
  if (head) {
    const invQ = wq(head).invert();
    Object.assign(rig.live, {
      head, headRestQ: head.quaternion.clone(),
      headLat: X_AXIS.clone().applyQuaternion(invQ).normalize(), headLong: Z_AXIS.clone().applyQuaternion(invQ).normalize()
    });
  }
  rig.face = setupFace(rig.meshes[0]);
}

let reliefS = 0;
function updateLive(dt, p) {
  live.t += dt;
  const fatTarget = live.on ? (live.forceFat != null ? live.forceFat : (live.rep - 1) / (REPS_PER_SET - 1)) : 0;
  live.fat += (fatTarget - live.fat) * Math.min(1, dt * 1.5);
  live.wet += ((live.on ? live.fat : 0) - live.wet) * Math.min(1, dt * (live.fat > live.wet ? 0.7 : 0.25));
  const pressing = pressBump(p), holding = p >= 0.55 && p < 0.66 ? 0.45 : 0;
  live.strain = live.on ? clamp((pressing + holding) * (0.3 + 0.7 * live.fat), 0, 1) : 0;
  live.relief = p < 0.12 || p >= LIFT_TOP_AT ? 1 : 0;
  reliefS += (live.relief - reliefS) * Math.min(1, dt * 8);
  live.pant = 0.5 + 0.5 * Math.sin(live.t * Math.PI * 2 * (1.1 + 1.2 * live.fat));
  live.breath = live.on ? (1 - liftAt(p)) * 0.8 + live.pant * 0.45 * live.fat * (1 - pressing) : 0;

  // Follow-through springs.
  const sp = live.sp, last0 = live.rep === REPS_PER_SET;
  sp.chest = spring('chest', live.breath, 55, 8, dt);
  sp.head = spring('head', -live.strain * 5 + (live.pant - 0.5) * live.fat * 2.5 * reliefS, 70, 8, dt); // degrees
  sp.db = spring('db', 0, 150, 6.5, dt);
  sp.knee = spring('knee', 0, 55, 7, dt);
  sp.sway = spring('sway', live.on ? STYLE.sway * 0.028 * Math.sin(live.t * 1.3) * (0.4 + live.fat) : 0, 30, 6, dt);
  sp.cam = spring('cam', 0, 130, 11, dt);
  sp.focus = spring('focus', live.on && last0 && p > 0.7 && p < LIFT_TOP_AT ? 1 : 0, 26, 10, dt);
  sp.finish = spring('finish', live.on && last0 && p >= LIFT_TOP_AT ? 1 : 0, 14, 7.5, dt);

  // Blinking.
  live.nextBlink -= dt;
  if (live.nextBlink <= 0) { live.blink = 1; live.nextBlink = 2 + Math.random() * 3.5; }
  live.blink = Math.max(0, live.blink - dt * 7);

  const f = rig.face;
  if (!f) return;
  const last = live.rep === REPS_PER_SET;
  const on = live.on ? 1 : 0;
  const happy = last ? reliefS * 0.9 : 0;
  const tgt = {
    blink: Math.max(live.blink > 0.3 ? 1 : 0, live.strain * (live.fat > 0.55 ? 0.85 : 0.3)) * (1 - happy),
    happyEyes: happy,
    wide: last && p > 0.72 && p < 0.8 ? 0.8 : 0,
    browTroubled: live.strain * 0.9 + reliefS * live.fat * 0.5 * (1 - happy),
    browAngry: live.strain * 0.6 * (1 - live.fat),
    browSmile: reliefS * (1 - live.fat) * 0.5,
    mouthI: live.strain * 0.75,
    mouthA: (1 - live.strain) * live.fat * (0.12 + 0.3 * live.pant) * (1 - happy * 0.5),
    mouthSmile: reliefS * (last ? 0.9 : (1 - live.fat) * 0.45),
    blush: live.wet * 0.85
  };
  if (live.on && STYLE.face) STYLE.face(p, tgt);
  const infl = f.mesh.morphTargetInfluences;
  for (const k in tgt) {
    f.val[k] += (tgt[k] * on - f.val[k]) * Math.min(1, dt * 12);
    if (f.idx[k] >= 0) infl[f.idx[k]] = f.val[k];
  }
}

const _sp = V(), _sn = V(), _sg = V(), _sq = new THREE.Quaternion(), _sm = new THREE.Matrix4(), _ss = V();
const DOWN = V(0, -1, 0);
function updateSweat(dt) {
  const sw = rig.sweat;
  if (!sw || rig.debug) return;
  sw.head.getWorldQuaternion(_sq);
  sw.picks.forEach((d, i) => {
    let stretch = 1;
    if (d.state === 0) {
      if (live.on && live.wet > d.thr && Math.random() < dt * 0.9) { d.state = 1; d.size = 0; d.slide = 0; }
    } else if (d.state === 1) {
      const wanted = live.on && live.wet > d.thr * 0.5;
      d.size = clamp(d.size + (wanted ? 1 : -1.5) * dt * 0.6 * (0.5 + live.wet), 0, 1);
      if (!wanted && d.size <= 0) d.state = 0;
      _sp.copy(d.pos).applyMatrix4(sw.head.matrixWorld);
      _sn.copy(d.nrm).applyQuaternion(_sq);
      _sg.copy(DOWN).addScaledVector(_sn, -_sn.dot(DOWN));
      const gl = _sg.length();
      if (gl > 1e-4) _sg.multiplyScalar(1 / gl);
      if (d.size >= 1) d.slide += dt * (0.006 + 0.03 * live.wet) * (0.3 + gl);
      d.at.copy(_sp).addScaledVector(_sg, d.slide).addScaledVector(_sn, sw.r * 0.35);
      if (d.slide > sw.reach) { d.state = 2; d.vy = 0; }
    } else {
      d.vy -= 9.8 * 0.55 * dt; d.at.y += d.vy * dt; stretch = 1.7;
      if (d.at.y < 0.01) { d.state = 0; d.size = 0; }
    }
    const r = d.state === 0 ? 0 : sw.r * (0.35 + 0.65 * d.size);
    _sm.compose(d.at, _sq.identity(), _ss.set(r, r * stretch, r));
    sw.drops.setMatrixAt(i, _sm);
    sw.head.getWorldQuaternion(_sq);
  });
  sw.drops.instanceMatrix.needsUpdate = true;
}

/* ------------------------------------------------------------------ */
/* Hair, clothing and body physics (game models only)                  */
/* ------------------------------------------------------------------ */
/* Uses the rigid bodies and joints each model ships with, simulated by ammo.js through Three.js's
   MMDPhysics. The simulation runs in the model's own space, so "down" is turned to match the body
   lying on the bench, and the bench is added as a solid box for hair and cloth to rest on. */
const phys = { on: true, world: null, error: null, amount: 0.3 };
/* How much hair and cloth move, 0..1. Real gravity on a lying body pulls every strand straight off the
   bench, which wrecks the styled hair. So at low amounts gravity points the way the model was built for
   (toward the feet, keeping the styled shape) and the result is blended back toward the rest shape;
   what is left is a light sway that follows the head and body. At 1 it is plain real-world physics. */
function physicsGravity() {
  const real = V(0, -1, 0).applyQuaternion(rig.root.quaternion.clone().invert());
  return V(0, -1, 0).lerp(real, phys.amount).normalize().multiplyScalar(98);
}
const AMMO_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/ammo.wasm.js';
const SMALL_CHARACTER_HEIGHT = 1.52; // metres; below this, chest and hip soft-body parts are left rigid

async function loadAmmo() {
  if (window.Ammo && window.Ammo.btVector3) return;
  if (typeof window.Ammo !== 'function') {
    await new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = AMMO_URL; el.onload = resolve; el.onerror = () => reject(new Error('the physics engine could not be downloaded'));
      document.head.appendChild(el);
    });
  }
  window.Ammo = await window.Ammo();
}

async function setupPhysics(mesh) {
  const data = mesh.geometry.userData.MMD;
  if (!data || !data.rigidBodies || !data.rigidBodies.length) return;
  await loadAmmo();
  const { MMDPhysics } = await import('three/addons/animation/MMDPhysics.js');

  let bodies = data.rigidBodies, joints = data.constraints || [];
  if (rig.height < SMALL_CHARACTER_HEIGHT) {
    const map = [];
    let n = 0;
    const kept = bodies.filter((b, i) => { const keep = !/胸|乳|尻|おっぱい|bust|breast|hip/i.test(b.name); map[i] = keep ? n++ : -1; return keep; });
    joints = joints.filter((j) => map[j.rigidBodyIndex1] >= 0 && map[j.rigidBodyIndex2] >= 0)
      .map((j) => ({ ...j, rigidBodyIndex1: map[j.rigidBodyIndex1], rigidBodyIndex2: map[j.rigidBodyIndex2] }));
    bodies = kept;
  }

  // Remember where the physics-driven bones start, so physics can be switched off cleanly.
  phys.rest = [];
  const seen = new Set();
  for (const b of bodies) {
    if (b.type === 0 || b.boneIndex < 0 || seen.has(b.boneIndex)) continue;
    const bn = mesh.skeleton.bones[b.boneIndex];
    if (!bn) continue;
    seen.add(b.boneIndex);
    phys.rest.push([bn, bn.position.clone(), bn.quaternion.clone()]);
  }

  const gravity = physicsGravity(); // in the model's own space; MMD gravity is 98 units/s²
  // MMDPhysics places each rigid body from its bone's position and assumes the rest pose, in the
  // model's own unscaled space. So: build it with the mesh detached, unscaled and un-posed, then put
  // the pose back and snap every body onto its posed bone.
  const bones = mesh.skeleton.bones;
  const posed = bones.map((b) => b.quaternion.clone());
  const parent = mesh.parent, scl = mesh.scale.clone();
  const detached = (fn) => {
    mesh.parent = null; mesh.scale.set(1, 1, 1); mesh.updateMatrixWorld(true);
    try { return fn(); } finally { mesh.parent = parent; mesh.scale.copy(scl); rig.root.updateMatrixWorld(true); }
  };
  for (const b of bones) b.quaternion.identity();
  const sim = detached(() => new MMDPhysics(mesh, bodies, joints, { gravity }));
  bones.forEach((b, i) => b.quaternion.copy(posed[i]));
  detached(() => sim.reset());

  // The bench, as a static box in model space.
  const A = window.Ammo;
  rig.root.updateMatrixWorld(true);
  const inv = mesh.matrixWorld.clone().invert();
  const c1 = V(-BENCH_WIDTH / 2, BENCH_TOP - 0.3, rig.benchZ0).applyMatrix4(inv);
  const c2 = V(BENCH_WIDTH / 2, BENCH_TOP - 0.012, rig.benchZ1).applyMatrix4(inv);
  const tr = new A.btTransform();
  tr.setIdentity();
  tr.setOrigin(new A.btVector3((c1.x + c2.x) / 2, (c1.y + c2.y) / 2, (c1.z + c2.z) / 2));
  const shape = new A.btBoxShape(new A.btVector3(Math.abs(c2.x - c1.x) / 2, Math.abs(c2.y - c1.y) / 2, Math.abs(c2.z - c1.z) / 2));
  const info = new A.btRigidBodyConstructionInfo(0, new A.btDefaultMotionState(tr), shape, new A.btVector3(0, 0, 0));
  const bench = new A.btRigidBody(info);
  bench.setFriction(0.6);
  sim.world.addRigidBody(bench, 0xffff, 0xffff);

  // Let hair and cloth fall into place before the first frame is shown.
  applyPose(state.p);
  rig.root.updateMatrixWorld(true);
  for (let i = 0; i < 90; i++) { rig.root.updateMatrixWorld(true); sim.update(1 / 60); }
  phys.world = sim;
  phys.bodies = bodies.length;
}

function stepPhysics(dt) {
  if (!phys.world || !phys.on) return;
  rig.root.updateMatrixWorld(true);
  phys.world.update(dt);
  const k = 0.35 + 0.65 * phys.amount; // blend the simulated bones back toward their styled rest shape
  if (k < 0.999) for (const [bn, pos, q] of phys.rest) {
    bn.position.lerpVectors(pos, bn.position, k);
    bn.quaternion.copy(_qa.copy(q).slerp(bn.quaternion, k));
  }
}
function setPhysicsAmount(a) {
  phys.amount = clamp(a, 0, 1);
  if (phys.world) phys.world.setGravity(physicsGravity());
}

function setPhysicsOn(on) {
  phys.on = on;
  if (!on && phys.rest) for (const [bn, pos, q] of phys.rest) { bn.position.copy(pos); bn.quaternion.copy(q); }
  if (on && phys.world) phys.world.reset();
}

/* ------------------------------------------------------------------ */
/* Pose                                                                */
/* ------------------------------------------------------------------ */
const _E = V(), _W = V(), _K = V(), _A = V(), _t1 = V(), _t2 = V(), _t3 = V(), _hq = new THREE.Quaternion();
const UP = V(0, 1, 0), FEET = V(0, 0, 1);

function applyPose(p) {
  if (!rig.ready || rig.debug) return;
  const lift = live.on ? STYLE.lift(p) : liftAt(p);
  const flare = state.flare;
  const theta = lerp(45, 88, flare) * DEG;   // elbow angle out from the torso
  const drop = lerp(14, 6, flare) * DEG;     // how far the elbows sink below shoulder level

  for (const f of rig.fingers) f.bone.quaternion.copy(f.restQ).multiply(f.curl);

  // Breathing lifts the chest; the head nods with effort and lolls when tired.
  if (rig.live) {
    const L = rig.live;
    L.spine.position.copy(L.spineRestPos).addScaledVector(L.breathDelta, (0.011 + 0.006 * live.fat) * live.sp.chest);
    if (L.head) {
      const nod = live.sp.head * DEG;
      const roll = reliefS * live.fat * 9 * DEG * Math.sin(live.t * 1.1);
      L.head.quaternion.copy(L.headRestQ).multiply(_qa.setFromAxisAngle(L.headLat, nod)).multiply(_qb.setFromAxisAngle(L.headLong, roll));
    }
    L.spine.updateMatrixWorld(true);
  }

  for (const { name, s } of SIDES) {
    const side = rig.sides[name];
    const L1 = side.arm.len, L2 = side.fore.len;
    const S = wp(side.arm.bone, side.shoulder); // moves slightly with breathing
    const lateral = _t1.set(s, 0, 0);
    const pole = _t2.set(0, 0, 0).addScaledVector(lateral, Math.sin(theta)).addScaledVector(FEET, Math.cos(theta)); // theta is measured from the torso line

    // Bottom: elbow out at `theta`, slightly below the shoulder, forearm upright.
    const Wb = _t3.copy(S).addScaledVector(pole, L1 * Math.cos(drop)).addScaledVector(UP, -L1 * Math.sin(drop) + L2);
    // Top: wrists over the shoulders, arms nearly straight.
    const topX = Math.max(Math.abs(S.x) - 0.015, DB.handleHalf + DB.headLen + 0.03);
    const Wt = V(s * topX, S.y + (L1 + L2) * 0.972, S.z);
    // When tired, one arm lags behind the other and both tremble under load.
    const lag = live.on ? STYLE.lag * (0.25 + 0.75 * live.fat) * Math.sin(Math.PI * clamp(lift, 0, 1)) * (s > 0 ? 1 : -0.4) : 0;
    const k = clamp(lift - lag, -0.12, 1.12);
    const Wtarget = V().lerpVectors(Wb, Wt, k);
    if (live.on && live.strain > 0.01) {
      const a = 0.007 * live.strain * live.fat * (live.rep === REPS_PER_SET ? 1.6 : 1), ph = s > 0 ? 0 : 1.7;
      Wtarget.x += a * Math.sin(live.t * 53 + ph);
      Wtarget.y += a * 0.8 * Math.sin(live.t * 47 + ph * 2);
      Wtarget.z += a * 0.6 * Math.sin(live.t * 41 + ph * 3);
    }
    if (live.on) { // dumbbells wobble after each beat and drift together when the style is unsteady
      Wtarget.x += live.sp.sway - s * live.sp.db * 0.004;
      Wtarget.z += live.sp.db * 0.003;
    }
    solveTwoBone(S, Wtarget, L1, L2, pole, _E, _W);

    const dirU = V().subVectors(_E, S).normalize();
    const dirF = V().subVectors(_W, _E).normalize();
    const hinge = V().crossVectors(dirU, dirF);
    aimLimb(side.arm, dirU, hinge);
    aimLimb(side.fore, dirF, hinge);
    side.hand.quaternion.copy(side.handRestLocal);
    side.hand.updateMatrixWorld(true);
    side.elbow.copy(_E); side.wrist.copy(_W);

    // Dumbbell in the palm.
    side.hand.getWorldQuaternion(_hq);
    const hp = wp(side.hand, _t1);
    const kp = side.knuckle ? wp(side.knuckle, _t2) : hp;
    const palmN = V().copy(side.palmNLocal).applyQuaternion(_hq);
    const across = V().copy(side.acrossLocal).applyQuaternion(_hq);
    side.dumbbell.position.copy(hp).lerp(kp, 0.72).addScaledVector(palmN, DB.handleR + 0.017);
    side.dumbbell.quaternion.setFromUnitVectors(Y_AXIS, across);
    if (live.on) side.dumbbell.quaternion.premultiply(_qa.setFromAxisAngle(palmN, s * live.sp.db * 0.16));

    // Legs: feet flat on the floor, knees up.
    const H = side.hip;
    _A.set(H.x + s * 0.11, rig.ankleH, H.z + 0.47);
    const lpole = V(s * (0.22 + (live.on ? live.sp.knee * 0.45 : 0)), 1, 0.1); // knees flare on the leg drive
    solveTwoBone(H, _A, side.thigh.len, side.shin.len, lpole, _K, _A);
    const dirT = V().subVectors(_K, H).normalize();
    const dirS = V().subVectors(_A, _K).normalize();
    const lh = V().crossVectors(dirT, dirS);
    aimLimb(side.thigh, dirT, lh);
    aimLimb(side.shin, dirS, lh);
    side.foot.parent.getWorldQuaternion(_qb).invert();
    side.foot.quaternion.copy(_qb).multiply(side.footFlatQ);
    side.foot.updateMatrixWorld(true);
    side.knee.copy(_K); side.ankle.copy(_A);
  }
}

/* ------------------------------------------------------------------ */
/* Elbow-angle wedge (drawn at the left shoulder)                      */
/* ------------------------------------------------------------------ */
const WEDGE_SEGS = 28;
const wedgeGeo = new THREE.BufferGeometry();
wedgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((WEDGE_SEGS + 2) * 3), 3));
{
  const idx = [];
  for (let i = 1; i <= WEDGE_SEGS; i++) idx.push(0, i, i + 1);
  wedgeGeo.setIndex(idx);
}
const wedgeMat = new THREE.MeshBasicMaterial({ color: 0x35d08a, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
const wedge = new THREE.Mesh(wedgeGeo, wedgeMat);
wedge.renderOrder = 10; wedge.frustumCulled = false; wedge.visible = false;
scene.add(wedge);
let wedgeAngleDeg = 45;

function updateWedge() {
  const side = rig.sides.Left;
  if (!side) return;
  const S = side.shoulder;
  const hx = side.elbow.x - S.x, hz = side.elbow.z - S.z;
  const hl = Math.hypot(hx, hz);
  const ang = Math.atan2(hx, hz); // 0 = along the torso toward the feet
  wedgeAngleDeg = ang / DEG;
  const R = 0.24, y = S.y - 0.02;
  const pos = wedgeGeo.attributes.position;
  pos.setXYZ(0, S.x, y, S.z);
  for (let i = 0; i <= WEDGE_SEGS; i++) {
    const a = ang * (i / WEDGE_SEGS);
    pos.setXYZ(i + 1, S.x + Math.sin(a) * R, y, S.z + Math.cos(a) * R);
  }
  pos.needsUpdate = true;
  const vis = smooth(0.06, 0.16, hl) * (state.labels ? 1 : 0);
  wedgeMat.opacity = 0.42 * vis;
  wedge.visible = vis > 0.01;
  wedgeMat.color.set(state.flare > 0.5 ? 0xff4d5e : 0x35d08a);
}

/* ------------------------------------------------------------------ */
/* Callouts                                                            */
/* ------------------------------------------------------------------ */
const labelsEl = $('labels');
const callouts = [];
function addCallout(id, text, getPos, opts = {}) {
  const el = document.createElement('div');
  el.className = 'callout' + (opts.left ? ' left' : '');
  el.style.opacity = 0;
  el.innerHTML = '<span class="dot"></span><span class="txt"></span>';
  el.querySelector('.txt').textContent = text;
  labelsEl.appendChild(el);
  const c = { id, el, txt: el.querySelector('.txt'), getPos, left: !!opts.left, text };
  callouts.push(c);
  return c;
}
const _proj = V();
function updateCallouts() {
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  const shown = [];
  for (const c of callouts) {
    const pos = c.getPos();
    if (!state.labels || !pos) { c.el.style.opacity = 0; continue; }
    _proj.copy(pos).project(camera);
    c.x = (_proj.x * 0.5 + 0.5) * w; c.y = (-_proj.y * 0.5 + 0.5) * h;
    const on = _proj.z < 1 && c.x > 8 && c.x < w - 8 && c.y > 56 && c.y < h - 56;
    c.el.style.opacity = on ? 1 : 0;
    if (on) shown.push(c);
    else {
      // Keep hidden labels parked on their point so they never fade in from the corner.
      const x0 = c.left ? c.x - c.el.offsetWidth + 4.5 : c.x - 4.5;
      c.el.style.transform = `translate(${x0.toFixed(1)}px, ${(c.y - c.el.offsetHeight / 2).toFixed(1)}px)`;
    }
  }
  // Keep labels from sitting on top of each other: push later ones down.
  shown.sort((a, b) => a.y - b.y);
  for (let i = 0; i < shown.length; i++) {
    const c = shown[i];
    c.w = c.el.offsetWidth; c.h = c.el.offsetHeight;
    c.x0 = c.left ? c.x - c.w + 4.5 : c.x - 4.5;
    c.ly = c.y;
    for (let k = 0; k < i; k++) {
      const o = shown[k];
      const overlapX = c.x0 < o.x0 + o.w + 6 && o.x0 < c.x0 + c.w + 6;
      if (overlapX && c.ly < o.ly + o.h + 4) c.ly = o.ly + o.h + 4;
    }
    c.el.style.transform = `translate(${c.x0.toFixed(1)}px, ${(c.ly - c.h / 2).toFixed(1)}px)`;
  }
}
function setupCallouts() {
  const L = rig.sides.Left, R = rig.sides.Right;
  const elbow = addCallout('elbow', 'Elbows about 45°', () => L.elbow);
  const wrist = addCallout('wrist', 'Wrists over elbows', () => R.wrist, { left: true });
  addCallout('feet', 'Feet flat on the floor', () => L.ankle);
  const sp = V();
  addCallout('back', 'Shoulder blades back and down', () => wp(bone('Spine2'), sp).setY(BENCH_TOP + 0.02).setX(-0.14), { left: true });
  rig.calloutElbow = elbow; rig.calloutWrist = wrist;
}
function refreshCalloutText() {
  if (!rig.calloutElbow) return;
  const bad = state.flare > 0.5;
  const t = bad ? 'Elbows flared 90°' : 'Elbows about 45°';
  if (rig.calloutElbow.txt.textContent !== t) rig.calloutElbow.txt.textContent = t;
  rig.calloutElbow.el.classList.toggle('bad', bad);
}

/* ------------------------------------------------------------------ */
/* Camera presets                                                      */
/* ------------------------------------------------------------------ */
const CAMS = {
  threeq: V(2.1, 1.2, 2.05),
  side: V(2.75, 0.3, 0.0),
  front: V(0.0, 0.8, 3.0),
  top: V(0.0, 3.1, 0.3)
};
function camPosFor(key2) {
  const aspect = camera.aspect || 1;
  const k = Math.max(1, 1.25 / aspect); // pull back on narrow (portrait) stages
  return CAM_TARGET.clone().addScaledVector(CAMS[key2], k);
}
function goCam(key2, instant = false) {
  state.activeCam = key2;
  const to = camPosFor(key2);
  if (instant) { camera.position.copy(to); controls.update(); state.camTween = null; }
  else state.camTween = { from: camera.position.clone(), to, t: 0 };
  document.querySelectorAll('#camButtons button').forEach((b) => b.classList.toggle('on', b.dataset.cam === key2));
}

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */
const ui = {
  phaseStep: $('phaseStep'), phaseName: $('phaseName'), cueTitle: $('cueTitle'), cueText: $('cueText'),
  breath: $('breath'), breathText: $('breathText'), scrub: $('scrub'), playBtn: $('playBtn'),
  iconPlay: $('iconPlay'), iconPause: $('iconPause'), speedBtn: $('speedBtn'), track: $('phaseTrack'),
  list: $('phaseList'), rep: $('repText'), chips: $('muscleChips'), banner: $('mistakeBanner')
};
let shownPhase = -1;
let scrubbing = false;

function phaseIndexAt(p) { for (let i = PHASES.length - 1; i >= 0; i--) if (p >= PHASES[i].from) return i; return 0; }

function buildPhaseUi() {
  PHASES.forEach((ph, i) => {
    const seg = document.createElement('button');
    seg.type = 'button'; seg.className = 'phase-seg'; seg.textContent = ph.name;
    seg.dataset.n = String(i + 1);
    seg.style.flex = `${ph.to - ph.from} 1 0`;
    seg.title = `Jump to: ${ph.name}`;
    seg.addEventListener('click', () => jumpToPhase(i));
    ui.track.appendChild(seg);

    const li = document.createElement('li');
    const b = document.createElement('button'); b.type = 'button';
    b.innerHTML = `<span class="num">${i + 1}</span><span></span><span class="tempo"></span>`;
    b.children[1].textContent = ph.name;
    b.children[2].textContent = ph.tempo;
    b.addEventListener('click', () => jumpToPhase(i));
    li.appendChild(b); ui.list.appendChild(li);
  });
}
function jumpToPhase(i) {
  const ph = PHASES[i];
  // Land on the most informative moment of the phase and hold there.
  const at = { setup: 0.04, lower: 0.34, bottom: 0.6, press: 0.8 }[ph.id];
  state.p = at; setPlaying(false); syncUi(true);
}
function setPlaying(on) {
  state.playing = on;
  ui.iconPlay.classList.toggle('hidden', on);
  ui.iconPause.classList.toggle('hidden', !on);
  ui.playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
}
function setForm(form) {
  state.form = form;
  document.querySelectorAll('#formToggle button').forEach((b) => b.classList.toggle('on', b.dataset.form === form));
  ui.banner.classList.toggle('hidden', form !== 'bad');
}
function syncUi(force = false) {
  const i = phaseIndexAt(state.p);
  if (i !== shownPhase || force) {
    shownPhase = i;
    const ph = PHASES[i];
    ui.phaseStep.textContent = `${i + 1} / ${PHASES.length}`;
    ui.phaseName.textContent = ph.name;
    ui.cueTitle.textContent = ph.name;
    ui.cueText.textContent = ph.cue;
    ui.breathText.textContent = ph.breath;
    ui.breath.classList.toggle('out', ph.out);
    [...ui.track.children].forEach((el, k) => el.classList.toggle('on', k === i));
    [...ui.list.children].forEach((el, k) => el.classList.toggle('on', k === i));
  }
  if (!scrubbing) ui.scrub.value = Math.round(state.p * 1000);
  const repLabel = live.on ? `Rep ${live.rep} / ${REPS_PER_SET}` : '';
  if (ui.rep.textContent !== repLabel) { ui.rep.textContent = repLabel; ui.rep.classList.remove('pop'); void ui.rep.offsetWidth; ui.rep.classList.add('pop'); }
  // Breathing dot: grows while breathing in (lowering), shrinks while breathing out (pressing).
  ui.breath.style.setProperty('--lung', (0.7 + 0.75 * (1 - liftAt(state.p))).toFixed(2));
}

function bindUi() {
  buildPhaseUi();
  ui.playBtn.addEventListener('click', () => setPlaying(!state.playing));
  ui.speedBtn.addEventListener('click', () => {
    state.speed = state.speed === 1 ? 0.5 : state.speed === 0.5 ? 0.25 : 1;
    ui.speedBtn.textContent = state.speed === 1 ? '1×' : state.speed === 0.5 ? '½×' : '¼×';
  });
  ui.scrub.addEventListener('pointerdown', () => { scrubbing = true; });
  window.addEventListener('pointerup', () => { scrubbing = false; });
  ui.scrub.addEventListener('input', () => { state.p = clamp(ui.scrub.value / 1000, 0, 0.9999); setPlaying(false); syncUi(); });
  ui.scrub.addEventListener('change', () => { scrubbing = false; });

  document.querySelectorAll('#formToggle button').forEach((b) => b.addEventListener('click', () => setForm(b.dataset.form)));
  $('showMistakeBtn').addEventListener('click', () => {
    setForm('bad'); goCam('top'); state.p = 0.6; setPlaying(false); syncUi(true);
    stageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.querySelectorAll('#camButtons button').forEach((b) => b.addEventListener('click', () => goCam(b.dataset.cam)));
  controls.addEventListener('start', () => {
    state.camTween = null;
    document.querySelectorAll('#camButtons button').forEach((b) => b.classList.remove('on'));
  });
  $('labelsToggle').addEventListener('change', (e) => { state.labels = e.target.checked; });
  $('liveToggle').addEventListener('change', (e) => { live.on = e.target.checked; if (!live.on) live.rep = 1; });
  $('cineToggle').addEventListener('change', (e) => { cine.on = e.target.checked; });
  $('physAmount').addEventListener('input', (e) => {
    setPhysicsAmount(e.target.value / 100);
    $('physAmountText').textContent = e.target.value + '%';
    try { localStorage.setItem('pulselift_physics_amount', String(phys.amount)); } catch (_) {}
  });
  $('physToggle').addEventListener('change', (e) => {
    try { localStorage.setItem('pulselift_physics', e.target.checked ? 'on' : 'off'); } catch (_) {}
    if (e.target.checked && !phys.world) { location.reload(); return; } // physics is set up at load
    setPhysicsOn(e.target.checked);
  });

  const applyIso = () => {
    const iso = state.isolate || state.pinned;
    ui.chips.classList.toggle('isolating', !!iso);
    ui.chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.muscle === iso));
  };
  ui.chips.querySelectorAll('.chip').forEach((chip) => {
    const m = chip.dataset.muscle;
    chip.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { state.isolate = m; applyIso(); } });
    chip.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { state.isolate = null; applyIso(); } });
    chip.addEventListener('click', () => { state.pinned = state.pinned === m ? null : m; applyIso(); });
    chip.addEventListener('focus', () => { state.isolate = m; applyIso(); });
    chip.addEventListener('blur', () => { state.isolate = null; applyIso(); });
  });

  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, button, a')) return;
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!state.playing); }
  });
}

function fail(msg) {
  const l = $('loader');
  l.classList.remove('hidden'); l.classList.add('error');
  $('loaderText').textContent = msg;
}

/* ------------------------------------------------------------------ */
/* Frame loop                                                          */
/* ------------------------------------------------------------------ */
function resize() {
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(() => { resize(); if (state.activeCam && !state.camTween && !userMovedCam) goCam(state.activeCam, true); }).observe(stageEl);
let userMovedCam = false;
controls.addEventListener('start', () => { userMovedCam = true; });

/* The camera as a second animator: it leans in on effort, shakes on the hard reps, closes in on the
   face when the last rep stalls and pulls back when the set is done. It is applied on top of wherever
   the user (or a preset) has put the camera, for the render only, so dragging still works. */
const cine = { on: true };
const _camPos = V(), _camQ = new THREE.Quaternion(), _look = V(), _headW = V(), _off = V();
function applyCineCamera() {
  if (!cine.on || !live.on || !rig.ready || rig.debug || !rig.live) return false;
  const sp = live.sp, last = live.rep === REPS_PER_SET;
  _camPos.copy(camera.position); _camQ.copy(camera.quaternion);
  _look.copy(controls.target);
  if (rig.live.head) _look.lerp(wp(rig.live.head, _headW), clamp(0.7 * sp.focus + 0.25 * sp.finish, 0, 1));
  const dolly = 1 - 0.07 * live.strain * live.fat - 0.3 * sp.focus + 0.12 * sp.finish;
  _off.subVectors(_camPos, controls.target).multiplyScalar(dolly);
  _off.applyAxisAngle(Y_AXIS, 0.035 * Math.sin(live.t * 0.33) + 0.12 * sp.finish);
  const shake = 0.0035 * live.strain * live.fat * (last ? 2.6 : 1);
  camera.position.copy(_look).add(_off);
  camera.position.x += shake * Math.sin(live.t * 61);
  camera.position.y += shake * Math.sin(live.t * 53 + 1) - sp.cam * 0.012 + 0.15 * sp.finish;
  camera.lookAt(_look);
  return true;
}

const clock = new THREE.Clock();
const act = { pecs: 1, frontDelts: 0.6, triceps: 0.6 };

function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (state.playing) {
    let rate = state.speed / CYCLE_SECONDS;
    if (live.on) { // tired reps grind; the last one nearly stalls halfway
      rate /= STYLE.tempo;
      rate *= 1 - 0.5 * live.fat * pressBump(state.p);
      if (live.rep === REPS_PER_SET && state.p > 0.74 && state.p < 0.8) rate *= 0.3;
    }
    if (live.hold > 0) { live.hold -= dt; rate = 0; } // brief freeze on the final lockout
    const np = state.p + dt * rate;
    if (live.on && rig.ready && !rig.debug) for (const [bt, bn] of BEATS) if (state.p < bt && np >= bt) onBeat(bn);
    if (np >= 1 && live.on) live.rep = (live.rep % REPS_PER_SET) + 1;
    state.p = np % 1;
  }
  if (rig.ready && !rig.debug) updateLive(dt, state.p);

  // Ease between correct and mistaken form.
  const flareTarget = state.form === 'bad' ? 1 : 0;
  state.flare += (flareTarget - state.flare) * Math.min(1, dt * 6);
  if (Math.abs(flareTarget - state.flare) < 0.002) state.flare = flareTarget;

  applyPose(state.p);
  stepPhysics(dt);
  updateSweat(dt);

  // Muscle glow.
  const iso = state.isolate || state.pinned;
  const effort = rig.debug ? 1 : effortAt(state.p);
  for (const m of MUSCLES) {
    const target = (iso && iso !== m ? 0 : (iso === m ? 1 : BASE_ACT[m])) * (rig.debug ? 1 : (0.55 + 0.45 * effort));
    act[m] += (target - act[m]) * Math.min(1, dt * 10);
  }
  glowUniforms.uAct.value.set(act.pecs, act.frontDelts, act.triceps);

  if (state.camTween) {
    const tw = state.camTween;
    tw.t = Math.min(1, tw.t + dt / 0.7);
    const k = ease(tw.t);
    // Move on an arc around the target rather than a straight line through the body.
    const a = tw.from.clone().sub(CAM_TARGET), b = tw.to.clone().sub(CAM_TARGET);
    const r = lerp(a.length(), b.length(), k);
    const d = a.normalize().lerp(b.normalize(), k);
    if (d.lengthSq() < 1e-6) d.set(0, 1, 0);
    camera.position.copy(CAM_TARGET).addScaledVector(d.normalize(), r);
    if (tw.t >= 1) { state.camTween = null; userMovedCam = false; }
  }
  controls.update();

  const cineOn = applyCineCamera();
  if (rig.ready && !rig.debug) { updateWedge(); refreshCalloutText(); }
  renderer.render(scene, camera);
  if (rig.ready && !rig.debug) updateCallouts();
  if (cineOn) { camera.position.copy(_camPos); camera.quaternion.copy(_camQ); }
  syncUi();
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ */
/* Start                                                               */
/* ------------------------------------------------------------------ */
bindUi();
resize();
goCam('threeq', true);
syncUi(true);

// Only the mesh and its normal map are needed. Skin colour, hair and eye textures are swapped
// for a 1-pixel image so they are never downloaded.
const BLANK_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const loadManager = new THREE.LoadingManager();
loadManager.setURLModifier((url) => (/\.(png|jpe?g|webp)$/i.test(url) && !/_Normal\.png$/i.test(url) || /T_(Hair|Eye)/i.test(url) ? BLANK_PNG : url));

initCharacters().then(() => loadCharacter(PROFILE)).then(async (model) => {
  setupRig(model, PROFILE);
  if (rig.debug) {
    controls.target.set(0, 1.25, 0); camera.position.set(0, 1.4, 3.2); controls.maxPolarAngle = Math.PI;
    $('labels').classList.add('hidden');
  } else {
    setupCallouts();
    applyPose(state.p);
    if (PROFILE.type === 'pmx') {
      $('physLabel').classList.remove('hidden');
      try { phys.on = localStorage.getItem('pulselift_physics') !== 'off'; } catch (_) {}
      try { const a = parseFloat(localStorage.getItem('pulselift_physics_amount')); if (isFinite(a)) phys.amount = clamp(a, 0, 1); } catch (_) {}
      if (QUERY.get('hair') != null) phys.amount = clamp(parseFloat(QUERY.get('hair')) / 100 || 0, 0, 1);
      $('physAmountWrap').classList.remove('hidden');
      $('physAmount').value = Math.round(phys.amount * 100);
      $('physAmountText').textContent = Math.round(phys.amount * 100) + '%';
      $('physToggle').checked = phys.on;
      if (phys.on) {
        $('loaderText').textContent = 'Starting hair and cloth physics…';
        try { await setupPhysics(rig.meshes[0]); } catch (err) {
          console.warn('Physics unavailable:', err);
          phys.error = String(err && err.message ? err.message : err);
          $('physToggle').checked = false; $('physToggle').disabled = true;
          $('physLabel').title = 'Physics could not start: ' + phys.error;
        }
      }
    }
  }
  $('loader').classList.add('hidden');
  window.__proto = { rig, state, scene, camera, controls, THREE, goCam, setForm, setPlaying, syncUi, characterId, CHARACTERS, live, cine, phys, setPhysicsAmount, springs, onBeat, STYLES, setStyle: (id) => { STYLE = pickStyle(id); return STYLE.name; } };
  requestAnimationFrame(frame);
}).catch((err) => {
  console.error(err);
  fail('The "' + PROFILE.name + '" model could not be loaded. Pick another character below, or check the connection and reload. (' + (err && err.message ? err.message : err) + ')');
});
