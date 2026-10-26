/**
 * PulseLift — Real WebGL 3D Anatomical Mannequin & Muscle Thermal-Glow Engine (anatomical3d.js)
 *
 * Updates:
 * - Removed the red ✕ mark and orange laser lines for a clean, unobstructed 3D view.
 * - True 3D Solid Flat Rectangular Floor / Exercise Mat Mesh (createUnitBoxBuffer)
 *   so supine exercises (Dumbbell Floor Press & Core/Post-Workout Decompression)
 *   lie level on a solid, flat rectangular surface (never a tapered/curved capsule).
 * - Uncrowded Top Muscle Indicator Badge:
 *   Compact single mini-torso badge in top-left on cards (never overlapping "⤢ 360° Studio"),
 *   and spacious, non-overlapping layout in the 360° Studio Modal.
 * - Hover-Only Muscle Name Tooltip:
 *   Moving the cursor over any muscle on the 3D body (or hovering a muscle pill)
 *   spotlights that muscle and shows only its name.
 */

(function () {
  const DEG2RAD = Math.PI / 180;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function smoothstep(t) {
    const c = clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
  }
  function vec3(x, y, z) {
    return { x: x || 0, y: y || 0, z: z || 0 };
  }
  function add3(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }
  function sub3(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }
  function scale3(a, s) {
    return { x: a.x * s, y: a.y * s, z: a.z * s };
  }
  function mid3(a, b, t = 0.5) {
    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      z: lerp(a.z, b.z, t)
    };
  }
  function norm3(a) {
    const l = Math.hypot(a.x, a.y, a.z) || 1;
    return { x: a.x / l, y: a.y / l, z: a.z / l };
  }
  function len3(a) {
    return Math.hypot(a.x, a.y, a.z);
  }
  function dot3(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
  function cross3(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  const MUSCLE_DISPLAY_NAMES = {
    pecs: 'Pectoralis Major (Chest)',
    frontDelts: 'Anterior Deltoid (Front Shoulder)',
    sideDelts: 'Lateral Deltoid (Side Shoulder)',
    rearDelts: 'Posterior Deltoid (Rear Shoulder)',
    biceps: 'Biceps Brachii (Front Arm)',
    triceps: 'Triceps Brachii (Back Arm)',
    forearms: 'Brachioradialis & Forearm Flexors',
    core: 'Rectus & Transverse Abdominis (Core)',
    lats: 'Latissimus Dorsi (Lats / Back)',
    upperBack: 'Rhomboids & Trapezius (Upper Back)',
    lowerBack: 'Erector Spinae & Lumbar Spine',
    glutes: 'Gluteus Maximus & Medius',
    quads: 'Quadriceps Femoris (Front Thigh)',
    hamstrings: 'Hamstrings (Biceps Femoris)',
    calves: 'Gastrocnemius & Soleus (Calves)'
  };

  /* ==========================================================================
     4x4 Matrix Math for WebGL Perspective & Camera Orbit
     ========================================================================== */
  function mat4Perspective(fovRad, aspect, near, far) {
    const f = 1.0 / Math.tan(fovRad / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }

  function mat4LookAt(eye, center, up) {
    const z = norm3(sub3(eye, center));
    const x = norm3(cross3(up, z));
    const y = cross3(z, x);
    return new Float32Array([
      x.x, y.x, z.x, 0,
      x.y, y.y, z.y, 0,
      x.z, y.z, z.z, 0,
      -(x.x * eye.x + x.y * eye.y + x.z * eye.z),
      -(y.x * eye.x + y.y * eye.y + y.z * eye.z),
      -(z.x * eye.x + z.y * eye.y + z.z * eye.z),
      1
    ]);
  }

  function mat4Multiply(a, b) {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      const ai0 = a[i], ai1 = a[i + 4], ai2 = a[i + 8], ai3 = a[i + 12];
      out[i]      = ai0 * b[0]  + ai1 * b[1]  + ai2 * b[2]  + ai3 * b[3];
      out[i + 4]  = ai0 * b[4]  + ai1 * b[5]  + ai2 * b[6]  + ai3 * b[7];
      out[i + 8]  = ai0 * b[8]  + ai1 * b[9]  + ai2 * b[10] + ai3 * b[11];
      out[i + 12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
    }
    return out;
  }

  function buildOrientedMatrix(p1, p2, rx1, rz1, rx2, rz2) {
    const dir = sub3(p2, p1);
    const len = Math.hypot(dir.x, dir.y, dir.z) || 0.0001;
    const yAxis = { x: dir.x / len, y: dir.y / len, z: dir.z / len };
    const ref = Math.abs(yAxis.y) > 0.92 ? vec3(1, 0, 0) : vec3(0, 1, 0);
    const xAxis = norm3(cross3(ref, yAxis));
    const zAxis = norm3(cross3(yAxis, xAxis));

    return { p1, xAxis, yAxis, zAxis, len, rx1, rz1, rx2, rz2 };
  }

  /* ==========================================================================
     Shared WebGL GPU Renderer with Custom Anatomical & Flat Surface Meshes
     ========================================================================== */
  const glCanvas = document.createElement('canvas');
  glCanvas.width = 640;
  glCanvas.height = 480;
  const gl =
    glCanvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: true }) ||
    glCanvas.getContext('experimental-webgl');

  let shaderProgram = null;
  let glLocations = null;
  let unitBuffers = null;

  if (gl) {
    initWebGLPipeline();
  }

  function initWebGLPipeline() {
    const vsSource = `
      attribute vec3 aPos;
      attribute vec3 aNorm;
      attribute vec2 aUv;

      uniform mat4 uViewProj;
      uniform vec3 uP1;
      uniform vec3 uXAxis;
      uniform vec3 uYAxis;
      uniform vec3 uZAxis;
      uniform vec4 uRadii;
      uniform float uLen;
      uniform float uShapeType; // 0.0 = lofted muscle capsule, 1.0 = ellipsoid/sphere, 2.0 = solid flat box

      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying vec2 vUv;

      void main() {
        vec3 worldPos;
        vec3 worldNorm;

        if (uShapeType > 1.5) {
          // Solid Flat Rectangular Box centered at uP1 with half-extents (uRadii.x, uLen, uRadii.y)
          vec3 scaled = vec3(aPos.x * uRadii.x, aPos.y * uLen, aPos.z * uRadii.y);
          worldPos = uP1 + uXAxis * scaled.x + uYAxis * scaled.y + uZAxis * scaled.z;
          worldNorm = normalize(uXAxis * aNorm.x + uYAxis * aNorm.y + uZAxis * aNorm.z);
        } else if (uShapeType > 0.5) {
          // Ellipsoid centered at uP1 with radii (uRadii.x, uLen, uRadii.y)
          vec3 scaled = vec3(aPos.x * uRadii.x, aPos.y * uLen, aPos.z * uRadii.y);
          worldPos = uP1 + uXAxis * scaled.x + uYAxis * scaled.y + uZAxis * scaled.z;
          vec3 invR = vec3(
            aNorm.x / max(0.001, uRadii.x),
            aNorm.y / max(0.001, uLen),
            aNorm.z / max(0.001, uRadii.y)
          );
          worldNorm = normalize(uXAxis * invR.x + uYAxis * invR.y + uZAxis * invR.z);
        } else {
          // Tapered anatomical muscle loft from uP1 (t=0) to uP2 (t=1)
          float t = clamp(aUv.y, 0.0, 1.0);
          float belly = sin(t * 3.14159265) * uRadii.w;
          float rx = mix(uRadii.x, uRadii.z, t) + belly;
          float rz = mix(uRadii.y, uRadii.z, t) + belly * 0.85;

          float yDist = aPos.y * uLen;
          worldPos = uP1
            + uYAxis * yDist
            + uXAxis * (aPos.x * rx)
            + uZAxis * (aPos.z * rz);

          worldNorm = normalize(
            uXAxis * (aNorm.x / max(0.001, rx)) +
            uYAxis * (aNorm.y / max(0.001, uLen)) +
            uZAxis * (aNorm.z / max(0.001, rz))
          );
        }

        vWorldPos = worldPos;
        vNormal = worldNorm;
        vUv = aUv;
        gl_Position = uViewProj * vec4(worldPos, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;

      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying vec2 vUv;

      uniform vec3 uCamPos;
      uniform vec3 uBaseColor;
      uniform vec3 uGlowColor;
      uniform float uActivation;
      uniform float uStriation;
      uniform float uRimColorMode; // 0 = porcelain rim, 1 = active muscle rim, 2 = green posture rim, 3 = flat mat/surface (no fresnel glow)

      void main() {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(uCamPos - vWorldPos);

        vec3 L1 = normalize(vec3(0.45, 0.82, 0.40));
        vec3 L2 = normalize(vec3(-0.65, 0.30, -0.45));
        float diff1 = max(dot(N, L1), 0.0);
        float diff2 = max(dot(N, L2), 0.0) * 0.32;
        float wrap = max(0.0, (dot(N, L1) + 0.35) / 1.35);

        vec3 H = normalize(L1 + V);
        float spec = pow(max(dot(N, H), 0.0), 28.0) * (uRimColorMode > 2.5 ? 0.08 : 0.28);
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.6);

        float fiberPattern = 1.0;
        if (uStriation > 0.05) {
          float s = sin(vUv.x * 62.83185) * 0.5 + 0.5;
          fiberPattern = mix(1.0, 0.84 + 0.22 * s, uStriation);
        }

        vec3 ambient = uBaseColor * 0.38;
        vec3 litColor = (ambient + uBaseColor * (wrap * 0.66 + diff2)) * fiberPattern + vec3(spec);

        if (uActivation > 0.01) {
          float coreHeat = pow(max(dot(N, V), 0.0), 1.25);
          vec3 hotCenter = mix(uGlowColor, vec3(1.0, 0.88, 0.52), coreHeat * 0.48 * uActivation);
          vec3 muscleLit = hotCenter * (0.55 + 0.55 * wrap) * fiberPattern;
          litColor = mix(litColor, muscleLit, clamp(uActivation * 1.1, 0.0, 1.0));
        }

        if (uRimColorMode < 2.5) {
          vec3 rimTint = vec3(0.55, 0.72, 1.0);
          if (uRimColorMode > 1.5) {
            rimTint = vec3(0.15, 0.95, 0.45);
          } else if (uRimColorMode > 0.5) {
            rimTint = vec3(0.78, 0.88, 1.0);
          }
          litColor += rimTint * fresnel * (0.40 + 0.35 * uActivation);
        } else {
          // Subtle grid/border line on flat exercise mat surface
          float edgeX = abs(vUv.x - 0.5) * 2.0;
          float edgeY = abs(vUv.y - 0.5) * 2.0;
          if (edgeX > 0.94 || edgeY > 0.94) {
            litColor += vec3(0.08, 0.35, 0.32);
          }
        }

        gl_FragColor = vec4(litColor, 1.0);
      }
    `;

    function compileShader(type, source) {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    }

    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vs);
    gl.attachShader(shaderProgram, fs);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);

    glLocations = {
      aPos: gl.getAttribLocation(shaderProgram, 'aPos'),
      aNorm: gl.getAttribLocation(shaderProgram, 'aNorm'),
      aUv: gl.getAttribLocation(shaderProgram, 'aUv'),
      uViewProj: gl.getUniformLocation(shaderProgram, 'uViewProj'),
      uP1: gl.getUniformLocation(shaderProgram, 'uP1'),
      uXAxis: gl.getUniformLocation(shaderProgram, 'uXAxis'),
      uYAxis: gl.getUniformLocation(shaderProgram, 'uYAxis'),
      uZAxis: gl.getUniformLocation(shaderProgram, 'uZAxis'),
      uRadii: gl.getUniformLocation(shaderProgram, 'uRadii'),
      uLen: gl.getUniformLocation(shaderProgram, 'uLen'),
      uShapeType: gl.getUniformLocation(shaderProgram, 'uShapeType'),
      uCamPos: gl.getUniformLocation(shaderProgram, 'uCamPos'),
      uBaseColor: gl.getUniformLocation(shaderProgram, 'uBaseColor'),
      uGlowColor: gl.getUniformLocation(shaderProgram, 'uGlowColor'),
      uActivation: gl.getUniformLocation(shaderProgram, 'uActivation'),
      uStriation: gl.getUniformLocation(shaderProgram, 'uStriation'),
      uRimColorMode: gl.getUniformLocation(shaderProgram, 'uRimColorMode')
    };

    unitBuffers = {
      capsule: createUnitLoftBuffer(22, 14),
      sphere: createUnitSphereBuffer(22, 16),
      box: createUnitBoxBuffer()
    };
  }

  /**
   * Creates a solid, flat-faced 3D rectangular box buffer in [-1, 1]^3
   * for rendering flat gym mats, flat benches, and floor platforms.
   */
  function createUnitBoxBuffer() {
    const faces = [
      // Top (+Y) - solid flat surface
      { n: [0, 1, 0], v: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]] },
      // Bottom (-Y)
      { n: [0, -1, 0], v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
      // Front (+X)
      { n: [1, 0, 0], v: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] },
      // Back (-X)
      { n: [-1, 0, 0], v: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
      // Right (+Z)
      { n: [0, 0, 1], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
      // Left (-Z)
      { n: [0, 0, -1], v: [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]] }
    ];

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    faces.forEach((f, idx) => {
      const base = idx * 4;
      const faceUvs = [[0, 0], [0, 1], [1, 1], [1, 0]];
      for (let i = 0; i < 4; i++) {
        positions.push(f.v[i][0], f.v[i][1], f.v[i][2]);
        normals.push(f.n[0], f.n[1], f.n[2]);
        uvs.push(faceUvs[i][0], faceUvs[i][1]);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });

    return uploadMeshBuffers(positions, normals, uvs, indices);
  }

  function createUnitLoftBuffer(radialSegs, heightSegs) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const rings = [];
    const capSteps = 4;
    for (let i = 0; i < capSteps; i++) {
      const frac = i / capSteps;
      const ang = (1 - frac) * (Math.PI * 0.5);
      rings.push({
        y: -Math.sin(ang) * 0.14,
        rScale: Math.cos(ang),
        ny: -Math.sin(ang),
        uvY: 0
      });
    }
    for (let j = 0; j <= heightSegs; j++) {
      const v = j / heightSegs;
      rings.push({ y: v, rScale: 1.0, ny: 0, uvY: v });
    }
    for (let i = 1; i <= capSteps; i++) {
      const frac = i / capSteps;
      const ang = frac * (Math.PI * 0.5);
      rings.push({
        y: 1.0 + Math.sin(ang) * 0.14,
        rScale: Math.cos(ang),
        ny: Math.sin(ang),
        uvY: 1
      });
    }

    for (let r = 0; r < rings.length; r++) {
      const ring = rings[r];
      for (let i = 0; i <= radialSegs; i++) {
        const u = i / radialSegs;
        const theta = u * Math.PI * 2;
        const cx = Math.cos(theta);
        const cz = Math.sin(theta);

        positions.push(cx * ring.rScale, ring.y, cz * ring.rScale);
        const nLen = Math.hypot(cx * ring.rScale, ring.ny, cz * ring.rScale) || 1;
        normals.push((cx * ring.rScale) / nLen, ring.ny / nLen, (cz * ring.rScale) / nLen);
        uvs.push(u, ring.uvY);
      }
    }

    const stride = radialSegs + 1;
    for (let r = 0; r < rings.length - 1; r++) {
      for (let i = 0; i < radialSegs; i++) {
        const a = r * stride + i;
        const b = a + stride;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }

    return uploadMeshBuffers(positions, normals, uvs, indices);
  }

  function createUnitSphereBuffer(lonSegs, latSegs) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let y = 0; y <= latSegs; y++) {
      const v = y / latSegs;
      const phi = v * Math.PI;
      for (let x = 0; x <= lonSegs; x++) {
        const u = x / lonSegs;
        const theta = u * Math.PI * 2;
        const px = -Math.cos(theta) * Math.sin(phi);
        const py = Math.cos(phi);
        const pz = Math.sin(theta) * Math.sin(phi);
        positions.push(px, py, pz);
        normals.push(px, py, pz);
        uvs.push(u, v);
      }
    }

    const stride = lonSegs + 1;
    for (let y = 0; y < latSegs; y++) {
      for (let x = 0; x < lonSegs; x++) {
        const a = y * stride + x;
        const b = a + stride;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }

    return uploadMeshBuffers(positions, normals, uvs, indices);
  }

  function uploadMeshBuffers(positions, normals, uvs, indices) {
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const normBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return { posBuf, normBuf, uvBuf, idxBuf, count: indices.length };
  }

  /* ==========================================================================
     Rep Cycle & Biomechanical Pose Builders for All 8 Exercises
     ========================================================================== */
  function evaluateRepCycle(cycle) {
    let repT = 0;
    let phaseName = 'Ready / Setup';
    if (cycle < 0.42) {
      repT = smoothstep(cycle / 0.42);
      phaseName = 'Eccentric / Load';
    } else if (cycle < 0.56) {
      repT = 1.0;
      phaseName = 'Peak Contraction';
    } else if (cycle < 0.92) {
      repT = 1.0 - smoothstep((cycle - 0.56) / 0.36);
      phaseName = 'Concentric Drive';
    } else {
      repT = 0.0;
      phaseName = 'Lockout / Reset';
    }
    return { repT, phaseName };
  }

  /**
   * Analytical 3D Two-Bone Inverse Kinematics solver (Law of Cosines).
   * Guarantees constant upper-arm (len1) and forearm (len2) bone lengths
   * throughout any pressing, pulling, or squatting trajectory so limbs move
   * along natural biomechanical arcs instead of telescoping like a piston.
   */
  function solveTwoBoneIK(rootPos, targetPos, len1, len2, poleDir) {
    const dir = sub3(targetPos, rootPos);
    const rawDist = len3(dir);
    const minReach = Math.abs(len1 - len2) + 0.015;
    const maxReach = (len1 + len2) - 0.008;
    const d = clamp(rawDist, minReach, maxReach);
    const forward = rawDist > 1e-5 ? scale3(dir, 1 / rawDist) : vec3(0, 1, 0);

    // Project poleDir perpendicular to the root->target axis (Gram-Schmidt)
    const proj = dot3(poleDir, forward);
    let bendAxis = sub3(poleDir, scale3(forward, proj));
    const bendLen = len3(bendAxis);
    if (bendLen < 1e-5) {
      bendAxis = norm3(cross3(forward, vec3(1, 0, 0)));
    } else {
      bendAxis = scale3(bendAxis, 1 / bendLen);
    }

    const cosAngle = clamp((len1 * len1 + d * d - len2 * len2) / (2 * len1 * d), -1, 1);
    const sinAngle = Math.sqrt(Math.max(0, 1 - cosAngle * cosAngle));

    return add3(
      rootPos,
      add3(scale3(forward, len1 * cosAngle), scale3(bendAxis, len1 * sinAngle))
    );
  }

  const POSE_BUILDERS = {
    'goblet-squats': (repT) => {
      const hipY = lerp(0.92, 0.48, repT);
      const hipX = lerp(-0.04, -0.22, repT);
      const shoulderY = hipY + lerp(0.50, 0.44, repT);
      const shoulderX = hipX + lerp(0.05, 0.22, repT);
      const kneeX = lerp(0.04, 0.25, repT);
      const kneeY = lerp(0.48, 0.43, repT);
      const kneeZ = lerp(0.18, 0.28, repT);
      const ankleZ = 0.21;

      const pelvis = vec3(hipX, hipY, 0);
      const waist = mid3(pelvis, vec3(shoulderX, shoulderY, 0), 0.38);
      const chest = mid3(pelvis, vec3(shoulderX, shoulderY, 0), 0.78);
      const neck = vec3(shoulderX, shoulderY, 0);
      const head = vec3(shoulderX + 0.05, shoulderY + 0.20, 0);
      const dbCenter = vec3(chest.x + 0.21, chest.y + 0.02, 0);

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(hipX, hipY, -0.13),
        hipR: vec3(hipX, hipY, 0.13),
        kneeL: vec3(kneeX, kneeY, -kneeZ),
        kneeR: vec3(kneeX, kneeY, kneeZ),
        ankleL: vec3(0.02, 0.08, -ankleZ),
        ankleR: vec3(0.02, 0.08, ankleZ),
        toeL: vec3(0.20, 0.04, -ankleZ - 0.05),
        toeR: vec3(0.20, 0.04, ankleZ + 0.05),
        shoulderL: vec3(shoulderX, shoulderY - 0.03, -0.23),
        shoulderR: vec3(shoulderX, shoulderY - 0.03, 0.23),
        elbowL: vec3(chest.x + 0.14, chest.y - 0.17, -0.14),
        elbowR: vec3(chest.x + 0.14, chest.y - 0.17, 0.14),
        wristL: vec3(dbCenter.x, dbCenter.y + 0.04, -0.05),
        wristR: vec3(dbCenter.x, dbCenter.y + 0.04, 0.05),
        props: {
          flatFloorPlatform: true,
          gobletDumbbell: {
            top: vec3(dbCenter.x, dbCenter.y + 0.14, 0),
            bottom: vec3(dbCenter.x, dbCenter.y - 0.14, 0)
          }
        },
        hudTargetRegion: 'legs_front',
        activeMuscles: {
          quads: 1.0,
          glutes: 1.0,
          core: 0.72,
          upperBack: 0.65,
          biceps: 0.45
        }
      };
    },

    'floor-press': (repT) => {
      // Athlete lies completely level and flat on a solid flat floor mat (mat top is Y = 0.03)
      const pressHeight = lerp(0.0, 1.0, 1.0 - repT);

      const spineY = 0.14;
      const pelvis = vec3(0.12, spineY, 0);
      const waist = vec3(-0.07, spineY, 0);
      const chest = vec3(-0.27, spineY + 0.01, 0);
      const neck = vec3(-0.44, spineY, 0);
      const head = vec3(-0.60, spineY + 0.01, 0);

      const shoulderL = vec3(-0.33, spineY + 0.01, -0.23);
      const shoulderR = vec3(-0.33, spineY + 0.01, 0.23);

      // Hands press vertically above chest with forearms stacked; IK keeps bone lengths fixed
      const wristX = lerp(-0.24, -0.31, pressHeight);
      const wristY = lerp(0.37, 0.64, pressHeight);
      const wristZ = lerp(0.41, 0.30, pressHeight * pressHeight);
      const wristL = vec3(wristX, wristY, -wristZ);
      const wristR = vec3(wristX, wristY, wristZ);

      const elbowL = solveTwoBoneIK(shoulderL, wristL, 0.27, 0.26, vec3(0.45, -0.35, -0.82));
      const elbowR = solveTwoBoneIK(shoulderR, wristR, 0.27, 0.26, vec3(0.45, -0.35, 0.82));

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0.12, spineY, -0.13),
        hipR: vec3(0.12, spineY, 0.13),
        kneeL: vec3(0.40, 0.44, -0.16),
        kneeR: vec3(0.40, 0.44, 0.16),
        ankleL: vec3(0.62, 0.07, -0.16),
        ankleR: vec3(0.62, 0.07, 0.16),
        toeL: vec3(0.77, 0.04, -0.17),
        toeR: vec3(0.77, 0.04, 0.17),
        shoulderL,
        shoulderR,
        elbowL,
        elbowR,
        wristL,
        wristR,
        props: {
          flatExerciseMat: true,
          pairDumbbells: {
            leftCenter: vec3(wristX, wristY + 0.02, -wristZ),
            rightCenter: vec3(wristX, wristY + 0.02, wristZ),
            axis: vec3(0, 0, 1)
          }
        },
        hudTargetRegion: 'chest_front',
        activeMuscles: {
          pecs: 1.0,
          triceps: 1.0,
          frontDelts: 0.88,
          core: 0.55
        }
      };
    },

    'bent-over-rows': (repT) => {
      const rowPull = repT;
      const pelvis = vec3(-0.18, 0.78, 0);
      const waist = vec3(-0.03, 0.90, 0);
      const chest = vec3(0.14, 1.03, 0);
      const neck = vec3(0.25, 1.12, 0);
      const head = vec3(0.38, 1.22, 0);

      const shoulderL = vec3(0.20, 1.06, -0.23);
      const shoulderR = vec3(0.20, 1.06, 0.23);

      // Pull dumbbells in a natural arc from below shoulders toward the hip crease
      const wristX = lerp(0.21, -0.02, rowPull);
      const wristY = lerp(0.55, 0.82, rowPull);
      const wristZ = 0.25;
      const wristL = vec3(wristX, wristY, -wristZ);
      const wristR = vec3(wristX, wristY, wristZ);

      const elbowL = solveTwoBoneIK(shoulderL, wristL, 0.27, 0.26, vec3(-0.75, 0.55, -0.35));
      const elbowR = solveTwoBoneIK(shoulderR, wristR, 0.27, 0.26, vec3(-0.75, 0.55, 0.35));

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(-0.18, 0.78, -0.13),
        hipR: vec3(-0.18, 0.78, 0.13),
        kneeL: vec3(0.02, 0.44, -0.15),
        kneeR: vec3(0.02, 0.44, 0.15),
        ankleL: vec3(-0.04, 0.08, -0.15),
        ankleR: vec3(-0.04, 0.08, 0.15),
        toeL: vec3(0.13, 0.04, -0.16),
        toeR: vec3(0.13, 0.04, 0.16),
        shoulderL,
        shoulderR,
        elbowL,
        elbowR,
        wristL,
        wristR,
        props: {
          flatFloorPlatform: true,
          pairDumbbells: {
            leftCenter: vec3(wristX, wristY - 0.02, -wristZ),
            rightCenter: vec3(wristX, wristY - 0.02, wristZ),
            axis: vec3(1, 0, 0)
          }
        },
        hudTargetRegion: 'back_posterior',
        activeMuscles: {
          lats: 1.0,
          upperBack: 1.0,
          rearDelts: 0.88,
          biceps: 0.75,
          lowerBack: 0.60
        }
      };
    },

    'core-decompression': (repT, rawCycle) => {
      // Athlete lies completely flat on a wide, solid rectangular exercise mat on the floor!
      const isRightSide = rawCycle < 0.5;
      const localCycle = (rawCycle * 2) % 1;
      const ext = evaluateRepCycle(localCycle).repT;

      const spineY = 0.14;
      const pelvis = vec3(0.10, spineY, 0);
      const waist = vec3(-0.09, spineY, 0);
      const chest = vec3(-0.28, spineY, 0);
      const neck = vec3(-0.44, spineY, 0);
      const head = vec3(-0.60, spineY + 0.01, 0);

      const extL = isRightSide ? ext : 0;
      const extR = isRightSide ? 0 : ext;

      const kneeLX = lerp(0.10, 0.48, extL);
      const kneeLY = lerp(0.48, 0.20, extL);
      const ankleLX = lerp(0.44, 0.82, extL);
      const ankleLY = lerp(0.48, 0.15, extL);

      const kneeRX = lerp(0.10, 0.48, extR);
      const kneeRY = lerp(0.48, 0.20, extR);
      const ankleRX = lerp(0.44, 0.82, extR);
      const ankleRY = lerp(0.48, 0.15, extR);

      const armReachR = extL;
      const armReachL = extR;

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0.10, spineY, -0.13),
        hipR: vec3(0.10, spineY, 0.13),
        kneeL: vec3(kneeLX, kneeLY, -0.15),
        kneeR: vec3(kneeRX, kneeRY, 0.15),
        ankleL: vec3(ankleLX, ankleLY, -0.15),
        ankleR: vec3(ankleRX, ankleRY, 0.15),
        toeL: vec3(ankleLX + 0.05, ankleLY + 0.09, -0.15),
        toeR: vec3(ankleRX + 0.05, ankleRY + 0.09, 0.15),
        shoulderL: vec3(-0.34, spineY + 0.01, -0.22),
        shoulderR: vec3(-0.34, spineY + 0.01, 0.22),
        elbowL: vec3(lerp(-0.34, -0.58, armReachL), lerp(0.44, 0.24, armReachL), -0.21),
        elbowR: vec3(lerp(-0.34, -0.58, armReachR), lerp(0.44, 0.24, armReachR), 0.21),
        wristL: vec3(lerp(-0.34, -0.82, armReachL), lerp(0.68, 0.18, armReachL), -0.21),
        wristR: vec3(lerp(-0.34, -0.82, armReachR), lerp(0.68, 0.18, armReachR), 0.21),
        props: {
          flatExerciseMat: true
        },
        hudTargetRegion: 'core_front',
        activeMuscles: {
          core: 1.0,
          lowerBack: 0.9,
          quads: 0.45
        }
      };
    },

    'rdls': (repT) => {
      const hipX = lerp(-0.02, -0.28, repT);
      const hipY = lerp(0.92, 0.82, repT);
      const shoulderX = lerp(0.02, 0.35, repT);
      const shoulderY = lerp(1.42, 0.91, repT);
      const headX = lerp(0.05, 0.52, repT);
      const headY = lerp(1.63, 0.97, repT);

      const pelvis = vec3(hipX, hipY, 0);
      const neck = vec3(shoulderX, shoulderY, 0);
      const waist = mid3(pelvis, neck, 0.38);
      const chest = mid3(pelvis, neck, 0.76);
      const head = vec3(headX, headY, 0);

      const dbX = lerp(0.11, 0.12, repT);
      const dbY = lerp(0.78, 0.35, repT);

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(hipX, hipY, -0.13),
        hipR: vec3(hipX, hipY, 0.13),
        kneeL: vec3(lerp(0.02, -0.04, repT), 0.48, -0.14),
        kneeR: vec3(lerp(0.02, -0.04, repT), 0.48, 0.14),
        ankleL: vec3(0.0, 0.08, -0.14),
        ankleR: vec3(0.0, 0.08, 0.14),
        toeL: vec3(0.17, 0.04, -0.15),
        toeR: vec3(0.17, 0.04, 0.15),
        shoulderL: vec3(shoulderX, shoulderY - 0.03, -0.23),
        shoulderR: vec3(shoulderX, shoulderY - 0.03, 0.23),
        elbowL: vec3(lerp(0.06, 0.22, repT), lerp(1.08, 0.64, repT), -0.21),
        elbowR: vec3(lerp(0.06, 0.22, repT), lerp(1.08, 0.64, repT), 0.21),
        wristL: vec3(dbX, dbY, -0.19),
        wristR: vec3(dbX, dbY, 0.19),
        props: {
          flatFloorPlatform: true,
          pairDumbbells: {
            leftCenter: vec3(dbX, dbY - 0.02, -0.19),
            rightCenter: vec3(dbX, dbY - 0.02, 0.19),
            axis: vec3(0, 0, 1)
          }
        },
        hudTargetRegion: 'legs_posterior',
        activeMuscles: {
          hamstrings: 1.0,
          glutes: 1.0,
          lowerBack: 0.85,
          lats: 0.58,
          forearms: 0.65
        }
      };
    },

    'overhead-press': (repT) => {
      const press = repT;
      const pelvis = vec3(0, 0.92, 0);
      const waist = vec3(0, 1.10, 0);
      const chest = vec3(0.01, 1.28, 0);
      const neck = vec3(0.01, 1.44, 0);
      const head = vec3(0.03, 1.64, 0);

      const shoulderL = vec3(0.01, 1.41, -0.23);
      const shoulderR = vec3(0.01, 1.41, 0.23);

      // Natural Dumbbell Overhead Press biomechanics:
      // Dumbbells start racked just outside the shoulders with vertical forearms,
      // then drive smoothly overhead as the elbows swing wide in the 30° scapular plane.
      const wristX = lerp(0.08, 0.02, press);
      const wristY = lerp(1.48, 1.91, press);
      const wristZ = lerp(0.41, 0.29, press * press) + Math.sin(press * Math.PI) * 0.025;
      const wristL = vec3(wristX, wristY, -wristZ);
      const wristR = vec3(wristX, wristY, wristZ);

      const elbowL = solveTwoBoneIK(shoulderL, wristL, 0.27, 0.26, vec3(0.32, -0.55, -0.90));
      const elbowR = solveTwoBoneIK(shoulderR, wristR, 0.27, 0.26, vec3(0.32, -0.55, 0.90));

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0, 0.92, -0.13),
        hipR: vec3(0, 0.92, 0.13),
        kneeL: vec3(0.02, 0.49, -0.15),
        kneeR: vec3(0.02, 0.49, 0.15),
        ankleL: vec3(0, 0.08, -0.16),
        ankleR: vec3(0, 0.08, 0.16),
        toeL: vec3(0.17, 0.04, -0.17),
        toeR: vec3(0.17, 0.04, 0.17),
        shoulderL,
        shoulderR,
        elbowL,
        elbowR,
        wristL,
        wristR,
        props: {
          flatFloorPlatform: true,
          pairDumbbells: {
            leftCenter: vec3(wristX, wristY + 0.02, -wristZ),
            rightCenter: vec3(wristX, wristY + 0.02, wristZ),
            axis: vec3(0, 0, 1)
          }
        },
        hudTargetRegion: 'shoulders_front',
        activeMuscles: {
          frontDelts: 1.0,
          sideDelts: 1.0,
          triceps: 0.95,
          pecs: 0.62,
          core: 0.72
        }
      };
    },

    'reverse-lunges': (repT) => {
      const lungeDepth = repT;
      const hipX = lerp(0.0, -0.18, lungeDepth);
      const hipY = lerp(0.92, 0.56, lungeDepth);
      const shoulderX = hipX + lerp(0.02, 0.14, lungeDepth);
      const shoulderY = hipY + 0.49;

      const pelvis = vec3(hipX, hipY, 0);
      const neck = vec3(shoulderX, shoulderY, 0);
      const waist = mid3(pelvis, neck, 0.38);
      const chest = mid3(pelvis, neck, 0.76);
      const head = vec3(shoulderX + 0.04, shoulderY + 0.20, 0);

      const backStepX = lerp(0.0, -0.58, lungeDepth);
      const backKneeX = lerp(0.02, -0.22, lungeDepth);
      const backKneeY = lerp(0.49, 0.15, lungeDepth);

      const wristX = shoulderX - 0.02;
      const wristY = hipY - 0.06;

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(hipX, hipY, -0.13),
        hipR: vec3(hipX, hipY, 0.13),
        kneeL: vec3(lerp(0.03, 0.18, lungeDepth), lerp(0.49, 0.50, lungeDepth), -0.14),
        ankleL: vec3(0.14, 0.08, -0.14),
        toeL: vec3(0.30, 0.04, -0.14),
        kneeR: vec3(backKneeX, backKneeY, 0.14),
        ankleR: vec3(backStepX, lerp(0.08, 0.12, lungeDepth), 0.14),
        toeR: vec3(backStepX + 0.14, 0.04, 0.14),
        shoulderL: vec3(shoulderX, shoulderY - 0.03, -0.23),
        shoulderR: vec3(shoulderX, shoulderY - 0.03, 0.23),
        elbowL: vec3(shoulderX - 0.01, shoulderY - 0.28, -0.23),
        elbowR: vec3(shoulderX - 0.01, shoulderY - 0.28, 0.23),
        wristL: vec3(wristX, wristY, -0.23),
        wristR: vec3(wristX, wristY, 0.23),
        props: {
          flatFloorPlatform: true,
          pairDumbbells: {
            leftCenter: vec3(wristX, wristY - 0.02, -0.23),
            rightCenter: vec3(wristX, wristY - 0.02, 0.23),
            axis: vec3(1, 0, 0)
          }
        },
        hudTargetRegion: 'legs_front',
        activeMuscles: {
          quads: 1.0,
          glutes: 1.0,
          hamstrings: 0.72,
          calves: 0.55
        }
      };
    },

    'core-spinal-hang': (repT) => {
      const tractionDrop = lerp(0.0, 0.07, repT);
      const shoulderY = 1.48 - tractionDrop * 0.45;
      const hipY = 0.94 - tractionDrop;

      const pelvis = vec3(0, hipY, 0);
      const waist = vec3(0, lerp(hipY, shoulderY, 0.36), 0);
      const chest = vec3(0, lerp(hipY, shoulderY, 0.74), 0);
      const neck = vec3(0, shoulderY, 0);
      const head = vec3(0.03, shoulderY + 0.18, 0);

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0, hipY, -0.12),
        hipR: vec3(0, hipY, 0.12),
        kneeL: vec3(0.03, hipY - 0.42, -0.13),
        kneeR: vec3(0.03, hipY - 0.42, 0.13),
        ankleL: vec3(-0.02, hipY - 0.80, -0.13),
        ankleR: vec3(-0.02, hipY - 0.80, 0.13),
        toeL: vec3(0.10, hipY - 0.85, -0.13),
        toeR: vec3(0.10, hipY - 0.85, 0.13),
        shoulderL: vec3(0, shoulderY, -0.21),
        shoulderR: vec3(0, shoulderY, 0.21),
        elbowL: vec3(0.02, 1.73 - tractionDrop * 0.2, -0.23),
        elbowR: vec3(0.02, 1.73 - tractionDrop * 0.2, 0.23),
        wristL: vec3(0, 1.96, -0.24),
        wristR: vec3(0, 1.96, 0.24),
        props: {
          flatFloorPlatform: true,
          pullUpBar: true
        },
        hudTargetRegion: 'back_posterior',
        activeMuscles: {
          lats: 1.0,
          lowerBack: 1.0,
          forearms: 0.88,
          core: 0.65
        }
      };
    },

    'childs-pose-traction': (repT) => {
      // No-Bar Floor Alternative: Kneeling Child's Pose & Overhead Lat Spinal Traction on the flat exercise mat
      const stretch = repT;
      const pelvis = vec3(lerp(-0.06, -0.32, stretch), lerp(0.42, 0.22, stretch), 0);
      const neck = vec3(lerp(0.34, 0.18, stretch), lerp(0.44, 0.25, stretch), 0);
      const waist = mid3(pelvis, neck, 0.38);
      const chest = mid3(pelvis, neck, 0.75);
      const head = vec3(lerp(0.48, 0.33, stretch), lerp(0.44, 0.21, stretch), 0);

      const shoulderL = vec3(neck.x - 0.02, neck.y - 0.01, -0.22);
      const shoulderR = vec3(neck.x - 0.02, neck.y - 0.01, 0.22);
      const wristX = lerp(0.46, 0.66, stretch);
      const wristL = vec3(wristX, 0.06, -0.21);
      const wristR = vec3(wristX, 0.06, 0.21);

      const elbowL = solveTwoBoneIK(shoulderL, wristL, 0.27, 0.26, vec3(0.10, -0.45, -0.88));
      const elbowR = solveTwoBoneIK(shoulderR, wristR, 0.27, 0.26, vec3(0.10, -0.45, 0.88));

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(pelvis.x, pelvis.y, -0.14),
        hipR: vec3(pelvis.x, pelvis.y, 0.14),
        kneeL: vec3(0.08, 0.08, -0.19),
        kneeR: vec3(0.08, 0.08, 0.19),
        ankleL: vec3(-0.34, 0.07, -0.16),
        ankleR: vec3(-0.34, 0.07, 0.16),
        toeL: vec3(-0.48, 0.05, -0.15),
        toeR: vec3(-0.48, 0.05, 0.15),
        shoulderL,
        shoulderR,
        elbowL,
        elbowR,
        wristL,
        wristR,
        props: {
          flatExerciseMat: true
        },
        hudTargetRegion: 'back_posterior',
        activeMuscles: {
          lowerBack: 1.0,
          lats: 1.0,
          core: 0.78,
          glutes: 0.60
        }
      };
    },

    /* ========================================================================
       Interactive GUI Muscle Filter Mannequin Pose (Athletic Anatomical Stance)
       ======================================================================== */
    'anatomical-mannequin': (repT, rawCycle) => {
      const breath = Math.sin(rawCycle * Math.PI * 2) * 0.008;
      const pelvis = vec3(0, 0.92, 0);
      const waist = vec3(0, 1.11 + breath * 0.5, 0);
      const chest = vec3(0.01, 1.30 + breath, 0);
      const neck = vec3(0.01, 1.46 + breath, 0);
      const head = vec3(0.03, 1.66 + breath, 0);

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0, 0.92, -0.135),
        hipR: vec3(0, 0.92, 0.135),
        kneeL: vec3(0.02, 0.49, -0.16),
        kneeR: vec3(0.02, 0.49, 0.16),
        ankleL: vec3(0, 0.08, -0.17),
        ankleR: vec3(0, 0.08, 0.17),
        toeL: vec3(0.17, 0.04, -0.19),
        toeR: vec3(0.17, 0.04, 0.19),
        shoulderL: vec3(0.0, 1.42 + breath, -0.24),
        shoulderR: vec3(0.0, 1.42 + breath, 0.24),
        elbowL: vec3(-0.02, 1.14 + breath * 0.5, -0.34),
        elbowR: vec3(-0.02, 1.14 + breath * 0.5, 0.34),
        wristL: vec3(0.03, 0.86, -0.41),
        wristR: vec3(0.03, 0.86, 0.41),
        props: {
          flatFloorPlatform: true
        },
        hudTargetRegion: 'chest_front',
        activeMuscles: {}
      };
    },

    /* ========================================================================
       Additional Dumbbell Library Exercises
       ======================================================================== */
    'db-lateral-raise': (repT) => {
      const raise = repT;
      const pelvis = vec3(0, 0.92, 0);
      const waist = vec3(0, 1.10, 0);
      const chest = vec3(0.02, 1.29, 0);
      const neck = vec3(0.02, 1.45, 0);
      const head = vec3(0.04, 1.65, 0);

      // True circular shoulder-abduction arc in the 20° scapular plane (fixed bone lengths)
      const abdAngle = lerp(0.18, 1.48, raise);
      const elbowX = 0.02 + Math.sin(abdAngle) * 0.04;
      const elbowY = 1.41 - Math.cos(abdAngle) * 0.265;
      const elbowZ = 0.23 + Math.sin(abdAngle) * 0.265;

      const forearmAngle = abdAngle - 0.12;
      const wristX = elbowX + 0.05;
      const wristY = elbowY - Math.cos(forearmAngle) * 0.255;
      const wristZ = elbowZ + Math.sin(forearmAngle) * 0.255;

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0, 0.92, -0.13),
        hipR: vec3(0, 0.92, 0.13),
        kneeL: vec3(0.02, 0.49, -0.15),
        kneeR: vec3(0.02, 0.49, 0.15),
        ankleL: vec3(0, 0.08, -0.15),
        ankleR: vec3(0, 0.08, 0.15),
        toeL: vec3(0.17, 0.04, -0.16),
        toeR: vec3(0.17, 0.04, 0.16),
        shoulderL: vec3(0.02, 1.41, -0.23),
        shoulderR: vec3(0.02, 1.41, 0.23),
        elbowL: vec3(elbowX, elbowY, -elbowZ),
        elbowR: vec3(elbowX, elbowY, elbowZ),
        wristL: vec3(wristX, wristY, -wristZ),
        wristR: vec3(wristX, wristY, wristZ),
        props: {
          flatFloorPlatform: true,
          pairDumbbells: {
            leftCenter: vec3(wristX, wristY, -wristZ),
            rightCenter: vec3(wristX, wristY, wristZ),
            axis: vec3(1, 0, 0)
          }
        },
        hudTargetRegion: 'shoulders_front',
        activeMuscles: {
          sideDelts: 1.0,
          frontDelts: 0.78,
          upperBack: 0.65,
          forearms: 0.55
        }
      };
    },

    'db-bicep-curl': (repT) => {
      const curl = repT;
      const pelvis = vec3(0, 0.92, 0);
      const waist = vec3(0, 1.10, 0);
      const chest = vec3(0.01, 1.29, 0);
      const neck = vec3(0.01, 1.45, 0);
      const head = vec3(0.03, 1.65, 0);

      // True circular forearm hinge around pinned elbows (constant forearm length 0.26)
      const elbowX = 0.03;
      const elbowY = 1.14;
      const elbowZ = 0.26;
      const curlAngle = lerp(-1.35, 1.05, curl);
      const wristX = elbowX + Math.cos(curlAngle) * 0.26;
      const wristY = elbowY + Math.sin(curlAngle) * 0.26;

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0, 0.92, -0.13),
        hipR: vec3(0, 0.92, 0.13),
        kneeL: vec3(0.02, 0.49, -0.15),
        kneeR: vec3(0.02, 0.49, 0.15),
        ankleL: vec3(0, 0.08, -0.15),
        ankleR: vec3(0, 0.08, 0.15),
        toeL: vec3(0.17, 0.04, -0.16),
        toeR: vec3(0.17, 0.04, 0.16),
        shoulderL: vec3(0.01, 1.41, -0.23),
        shoulderR: vec3(0.01, 1.41, 0.23),
        elbowL: vec3(elbowX, elbowY, -elbowZ),
        elbowR: vec3(elbowX, elbowY, elbowZ),
        wristL: vec3(wristX, wristY, -0.25),
        wristR: vec3(wristX, wristY, 0.25),
        props: {
          flatFloorPlatform: true,
          pairDumbbells: {
            leftCenter: vec3(wristX, wristY, -0.25),
            rightCenter: vec3(wristX, wristY, 0.25),
            axis: vec3(0, 0, 1)
          }
        },
        hudTargetRegion: 'chest_front',
        activeMuscles: {
          biceps: 1.0,
          forearms: 0.88,
          frontDelts: 0.55,
          core: 0.45
        }
      };
    },

    /* ========================================================================
       Barbell Library Exercises
       ======================================================================== */
    'bb-back-squat': (repT) => {
      const hipY = lerp(0.92, 0.47, repT);
      const hipX = lerp(-0.04, -0.24, repT);
      const shoulderY = hipY + lerp(0.50, 0.43, repT);
      const shoulderX = hipX + lerp(0.05, 0.24, repT);
      const kneeX = lerp(0.04, 0.24, repT);
      const kneeY = lerp(0.48, 0.43, repT);
      const kneeZ = lerp(0.18, 0.26, repT);

      const pelvis = vec3(hipX, hipY, 0);
      const waist = mid3(pelvis, vec3(shoulderX, shoulderY, 0), 0.38);
      const chest = mid3(pelvis, vec3(shoulderX, shoulderY, 0), 0.78);
      const neck = vec3(shoulderX, shoulderY, 0);
      const head = vec3(shoulderX + 0.05, shoulderY + 0.20, 0);
      const barCenter = vec3(shoulderX - 0.07, shoulderY - 0.02, 0);

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(hipX, hipY, -0.13),
        hipR: vec3(hipX, hipY, 0.13),
        kneeL: vec3(kneeX, kneeY, -kneeZ),
        kneeR: vec3(kneeX, kneeY, kneeZ),
        ankleL: vec3(0.02, 0.08, -0.20),
        ankleR: vec3(0.02, 0.08, 0.20),
        toeL: vec3(0.20, 0.04, -0.24),
        toeR: vec3(0.20, 0.04, 0.24),
        shoulderL: vec3(shoulderX, shoulderY - 0.03, -0.23),
        shoulderR: vec3(shoulderX, shoulderY - 0.03, 0.23),
        elbowL: vec3(shoulderX - 0.12, shoulderY - 0.22, -0.32),
        elbowR: vec3(shoulderX - 0.12, shoulderY - 0.22, 0.32),
        wristL: vec3(barCenter.x, barCenter.y, -0.38),
        wristR: vec3(barCenter.x, barCenter.y, 0.38),
        props: {
          flatFloorPlatform: true,
          barbell: { center: barCenter, halfWidth: 0.75 }
        },
        hudTargetRegion: 'legs_front',
        activeMuscles: {
          quads: 1.0,
          glutes: 1.0,
          hamstrings: 0.75,
          lowerBack: 0.80,
          core: 0.78
        }
      };
    },

    'bb-bench-press': (repT) => {
      const pressHeight = lerp(0.0, 1.0, 1.0 - repT);
      const benchY = 0.42;
      const pelvis = vec3(0.16, benchY, 0);
      const waist = vec3(-0.04, benchY, 0);
      const chest = vec3(-0.25, benchY + 0.02, 0);
      const neck = vec3(-0.42, benchY, 0);
      const head = vec3(-0.58, benchY + 0.01, 0);

      const shoulderL = vec3(-0.30, benchY + 0.01, -0.23);
      const shoulderR = vec3(-0.30, benchY + 0.01, 0.23);

      // Fixed grip width on barbell; 2-bone IK keeps upper-arm and forearm lengths exact
      const wristX = lerp(-0.21, -0.29, pressHeight);
      const wristY = lerp(0.58, 0.90, pressHeight);
      const wristZ = 0.37;
      const wristL = vec3(wristX, wristY, -wristZ);
      const wristR = vec3(wristX, wristY, wristZ);

      const elbowL = solveTwoBoneIK(shoulderL, wristL, 0.27, 0.26, vec3(0.45, -0.45, -0.80));
      const elbowR = solveTwoBoneIK(shoulderR, wristR, 0.27, 0.26, vec3(0.45, -0.45, 0.80));

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0.16, benchY, -0.13),
        hipR: vec3(0.16, benchY, 0.13),
        kneeL: vec3(0.46, 0.40, -0.22),
        kneeR: vec3(0.46, 0.40, 0.22),
        ankleL: vec3(0.44, 0.08, -0.24),
        ankleR: vec3(0.44, 0.08, 0.24),
        toeL: vec3(0.58, 0.04, -0.25),
        toeR: vec3(0.58, 0.04, 0.25),
        shoulderL,
        shoulderR,
        elbowL,
        elbowR,
        wristL,
        wristR,
        props: {
          flatFloorPlatform: true,
          flatBench: true,
          barbell: { center: vec3(wristX, wristY + 0.02, 0), halfWidth: 0.76 }
        },
        hudTargetRegion: 'chest_front',
        activeMuscles: {
          pecs: 1.0,
          triceps: 0.95,
          frontDelts: 0.90,
          core: 0.55
        }
      };
    },

    'bb-deadlift': (repT) => {
      const hipX = lerp(-0.02, -0.26, repT);
      const hipY = lerp(0.92, 0.64, repT);
      const shoulderX = lerp(0.02, 0.30, repT);
      const shoulderY = lerp(1.42, 0.88, repT);
      const kneeX = lerp(0.02, 0.16, repT);
      const kneeY = lerp(0.48, 0.42, repT);

      const pelvis = vec3(hipX, hipY, 0);
      const neck = vec3(shoulderX, shoulderY, 0);
      const waist = mid3(pelvis, neck, 0.38);
      const chest = mid3(pelvis, neck, 0.76);
      const head = vec3(lerp(0.05, 0.46, repT), lerp(1.63, 0.98, repT), 0);

      const barX = 0.12;
      const barY = lerp(0.78, 0.22, repT);

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(hipX, hipY, -0.13),
        hipR: vec3(hipX, hipY, 0.13),
        kneeL: vec3(kneeX, kneeY, -0.14),
        kneeR: vec3(kneeX, kneeY, 0.14),
        ankleL: vec3(0.0, 0.08, -0.14),
        ankleR: vec3(0.0, 0.08, 0.14),
        toeL: vec3(0.17, 0.04, -0.15),
        toeR: vec3(0.17, 0.04, 0.15),
        shoulderL: vec3(shoulderX, shoulderY - 0.03, -0.23),
        shoulderR: vec3(shoulderX, shoulderY - 0.03, 0.23),
        elbowL: vec3(lerp(0.06, 0.21, repT), lerp(1.08, 0.54, repT), -0.22),
        elbowR: vec3(lerp(0.06, 0.21, repT), lerp(1.08, 0.54, repT), 0.22),
        wristL: vec3(barX, barY, -0.22),
        wristR: vec3(barX, barY, 0.22),
        props: {
          flatFloorPlatform: true,
          barbell: { center: vec3(barX, barY - 0.02, 0), halfWidth: 0.78 }
        },
        hudTargetRegion: 'legs_posterior',
        activeMuscles: {
          hamstrings: 1.0,
          glutes: 1.0,
          lowerBack: 1.0,
          lats: 0.78,
          quads: 0.75,
          forearms: 0.85
        }
      };
    },

    'bb-bent-row': (repT) => {
      const pull = repT;
      const pelvis = vec3(-0.20, 0.78, 0);
      const waist = vec3(-0.04, 0.88, 0);
      const chest = vec3(0.14, 0.99, 0);
      const neck = vec3(0.26, 1.07, 0);
      const head = vec3(0.40, 1.15, 0);

      const shoulderL = vec3(0.20, 1.02, -0.23);
      const shoulderR = vec3(0.20, 1.02, 0.23);

      const barX = lerp(0.20, -0.02, pull);
      const barY = lerp(0.52, 0.80, pull);
      const wristZ = 0.28;
      const wristL = vec3(barX, barY, -wristZ);
      const wristR = vec3(barX, barY, wristZ);

      const elbowL = solveTwoBoneIK(shoulderL, wristL, 0.27, 0.26, vec3(-0.70, 0.55, -0.45));
      const elbowR = solveTwoBoneIK(shoulderR, wristR, 0.27, 0.26, vec3(-0.70, 0.55, 0.45));

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(-0.20, 0.78, -0.13),
        hipR: vec3(-0.20, 0.78, 0.13),
        kneeL: vec3(0.02, 0.44, -0.15),
        kneeR: vec3(0.02, 0.44, 0.15),
        ankleL: vec3(-0.04, 0.08, -0.15),
        ankleR: vec3(-0.04, 0.08, 0.15),
        toeL: vec3(0.13, 0.04, -0.16),
        toeR: vec3(0.13, 0.04, 0.16),
        shoulderL,
        shoulderR,
        elbowL,
        elbowR,
        wristL,
        wristR,
        props: {
          flatFloorPlatform: true,
          barbell: { center: vec3(barX, barY - 0.02, 0), halfWidth: 0.74 }
        },
        hudTargetRegion: 'back_posterior',
        activeMuscles: {
          lats: 1.0,
          upperBack: 1.0,
          rearDelts: 0.88,
          biceps: 0.78,
          lowerBack: 0.82
        }
      };
    },

    'bb-overhead-press': (repT) => {
      const press = repT;
      const pelvis = vec3(0, 0.92, 0);
      const waist = vec3(0, 1.10, 0);
      const chest = vec3(0.01, 1.28, 0);
      const neck = vec3(0.01, 1.44, 0);
      const head = vec3(lerp(0.01, 0.04, press), 1.64, 0);

      const shoulderL = vec3(0.01, 1.41, -0.23);
      const shoulderR = vec3(0.01, 1.41, 0.23);

      // Fixed grip width on barbell shaft (wristZ = 0.36); 2-bone IK keeps bone lengths fixed
      const barX = lerp(0.10, 0.02, press) + Math.sin(press * Math.PI) * 0.03;
      const barY = lerp(1.46, 1.90, press);
      const wristZ = 0.36;
      const wristL = vec3(barX, barY, -wristZ);
      const wristR = vec3(barX, barY, wristZ);

      const elbowL = solveTwoBoneIK(shoulderL, wristL, 0.27, 0.26, vec3(0.42, -0.55, -0.75));
      const elbowR = solveTwoBoneIK(shoulderR, wristR, 0.27, 0.26, vec3(0.42, -0.55, 0.75));

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0, 0.92, -0.13),
        hipR: vec3(0, 0.92, 0.13),
        kneeL: vec3(0.02, 0.49, -0.15),
        kneeR: vec3(0.02, 0.49, 0.15),
        ankleL: vec3(0, 0.08, -0.16),
        ankleR: vec3(0, 0.08, 0.16),
        toeL: vec3(0.17, 0.04, -0.17),
        toeR: vec3(0.17, 0.04, 0.17),
        shoulderL,
        shoulderR,
        elbowL,
        elbowR,
        wristL,
        wristR,
        props: {
          flatFloorPlatform: true,
          barbell: { center: vec3(barX, barY + 0.02, 0), halfWidth: 0.74 }
        },
        hudTargetRegion: 'shoulders_front',
        activeMuscles: {
          frontDelts: 1.0,
          sideDelts: 0.92,
          triceps: 0.95,
          upperBack: 0.70,
          core: 0.80
        }
      };
    },

    /* ========================================================================
       Kettlebell Library Exercises
       ======================================================================== */
    'kb-swing': (repT) => {
      // repT=1 is hip hinge back; repT=0 is explosive hip lockout with KB at chest height
      const hinge = repT;
      const hipX = lerp(0.0, -0.26, hinge);
      const hipY = lerp(0.92, 0.76, hinge);
      const shoulderX = lerp(0.01, 0.28, hinge);
      const shoulderY = lerp(1.42, 0.98, hinge);

      const pelvis = vec3(hipX, hipY, 0);
      const neck = vec3(shoulderX, shoulderY, 0);
      const waist = mid3(pelvis, neck, 0.38);
      const chest = mid3(pelvis, neck, 0.76);
      const head = vec3(lerp(0.04, 0.44, hinge), lerp(1.63, 1.08, hinge), 0);

      const wristX = lerp(0.48, -0.14, hinge);
      const wristY = lerp(1.26, 0.46, hinge);

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(hipX, hipY, -0.15),
        hipR: vec3(hipX, hipY, 0.15),
        kneeL: vec3(lerp(0.02, 0.08, hinge), lerp(0.49, 0.45, hinge), -0.20),
        kneeR: vec3(lerp(0.02, 0.08, hinge), lerp(0.49, 0.45, hinge), 0.20),
        ankleL: vec3(0.0, 0.08, -0.22),
        ankleR: vec3(0.0, 0.08, 0.22),
        toeL: vec3(0.17, 0.04, -0.24),
        toeR: vec3(0.17, 0.04, 0.24),
        shoulderL: vec3(shoulderX, shoulderY - 0.03, -0.23),
        shoulderR: vec3(shoulderX, shoulderY - 0.03, 0.23),
        elbowL: vec3(lerp(0.26, 0.08, hinge), lerp(1.32, 0.72, hinge), -0.14),
        elbowR: vec3(lerp(0.26, 0.08, hinge), lerp(1.32, 0.72, hinge), 0.14),
        wristL: vec3(wristX, wristY, -0.05),
        wristR: vec3(wristX, wristY, 0.05),
        props: {
          flatFloorPlatform: true,
          kettlebell: { pos: vec3(wristX + lerp(0.10, -0.08, hinge), wristY - 0.11, 0) }
        },
        hudTargetRegion: 'legs_posterior',
        activeMuscles: {
          glutes: 1.0,
          hamstrings: 1.0,
          lowerBack: 0.90,
          core: 0.85,
          frontDelts: 0.65,
          forearms: 0.75
        }
      };
    },

    'kb-goblet-squat': (repT) => {
      const base = POSE_BUILDERS['goblet-squats'](repT);
      const kbPos = vec3(base.chest.x + 0.20, base.chest.y - 0.02, 0);
      base.props = {
        flatFloorPlatform: true,
        kettlebell: { pos: kbPos }
      };
      return base;
    },

    'kb-clean-press': (repT) => {
      const press = repT;
      const pelvis = vec3(0, 0.92, 0);
      const waist = vec3(0, 1.10, 0);
      const chest = vec3(0.01, 1.28, 0);
      const neck = vec3(0.01, 1.44, 0);
      const head = vec3(0.03, 1.64, 0);

      const shoulderL = vec3(0.01, 1.41, -0.23);
      const shoulderR = vec3(0.01, 1.41, 0.23);

      // Right arm presses kettlebell from front-rack to overhead lockout using 2-bone IK
      const rWristX = lerp(0.10, 0.03, press);
      const rWristY = lerp(1.44, 1.90, press);
      const rWristZ = lerp(0.32, 0.27, press * press) + Math.sin(press * Math.PI) * 0.035;
      const wristR = vec3(rWristX, rWristY, rWristZ);
      const elbowR = solveTwoBoneIK(shoulderR, wristR, 0.27, 0.26, vec3(0.38, -0.55, 0.80));

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0, 0.92, -0.13),
        hipR: vec3(0, 0.92, 0.13),
        kneeL: vec3(0.02, 0.49, -0.16),
        kneeR: vec3(0.02, 0.49, 0.16),
        ankleL: vec3(0, 0.08, -0.17),
        ankleR: vec3(0, 0.08, 0.17),
        toeL: vec3(0.17, 0.04, -0.18),
        toeR: vec3(0.17, 0.04, 0.18),
        shoulderL,
        shoulderR,
        elbowL: vec3(0.02, 1.16, -0.32),
        elbowR,
        wristL: vec3(0.08, 0.98, -0.38),
        wristR,
        props: {
          flatFloorPlatform: true,
          kettlebell: { pos: vec3(rWristX - 0.02, rWristY - 0.06, rWristZ + 0.04) }
        },
        hudTargetRegion: 'shoulders_front',
        activeMuscles: {
          frontDelts: 1.0,
          sideDelts: 1.0,
          triceps: 0.92,
          core: 0.88,
          glutes: 0.65
        }
      };
    },

    'kb-row': (repT) => {
      const base = POSE_BUILDERS['bent-over-rows'](repT);
      base.props = {
        flatFloorPlatform: true,
        kettlebell: { pos: vec3(base.wristR.x, base.wristR.y - 0.12, base.wristR.z) }
      };
      return base;
    },

    /* ========================================================================
       Bodyweight Library Exercises
       ======================================================================== */
    'bw-pushup': (repT) => {
      const depth = repT;
      const shoulderY = lerp(0.54, 0.24, depth);
      const hipY = lerp(0.35, 0.16, depth);

      const ankleL = vec3(-0.68, 0.12, -0.14);
      const ankleR = vec3(-0.68, 0.12, 0.14);
      const pelvis = vec3(-0.08, hipY, 0);
      const neck = vec3(0.46, shoulderY, 0);
      const waist = mid3(pelvis, neck, 0.38);
      const chest = mid3(pelvis, neck, 0.76);
      const head = vec3(0.64, shoulderY + 0.06, 0);

      const shoulderL = vec3(0.44, shoulderY - 0.02, -0.22);
      const shoulderR = vec3(0.44, shoulderY - 0.02, 0.22);
      const wristL = vec3(0.44, 0.05, -0.29);
      const wristR = vec3(0.44, 0.05, 0.29);

      const elbowL = solveTwoBoneIK(shoulderL, wristL, 0.27, 0.26, vec3(-0.65, 0.20, -0.75));
      const elbowR = solveTwoBoneIK(shoulderR, wristR, 0.27, 0.26, vec3(-0.65, 0.20, 0.75));

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(-0.08, hipY, -0.12),
        hipR: vec3(-0.08, hipY, 0.12),
        kneeL: mid3(vec3(-0.08, hipY, -0.13), ankleL, 0.52),
        kneeR: mid3(vec3(-0.08, hipY, 0.13), ankleR, 0.52),
        ankleL,
        ankleR,
        toeL: vec3(-0.72, 0.03, -0.14),
        toeR: vec3(-0.72, 0.03, 0.14),
        shoulderL,
        shoulderR,
        elbowL,
        elbowR,
        wristL,
        wristR,
        props: {
          flatExerciseMat: true
        },
        hudTargetRegion: 'chest_front',
        activeMuscles: {
          pecs: 1.0,
          triceps: 0.95,
          frontDelts: 0.88,
          core: 0.85
        }
      };
    },

    'bw-pullup': (repT) => {
      const pull = repT;
      const bodyLift = lerp(0.0, 0.42, pull);
      const shoulderY = 1.46 + bodyLift;
      const hipY = 0.94 + bodyLift;

      const pelvis = vec3(0, hipY, 0);
      const waist = vec3(0, lerp(hipY, shoulderY, 0.36), 0);
      const chest = vec3(0.02, lerp(hipY, shoulderY, 0.74), 0);
      const neck = vec3(0.02, shoulderY, 0);
      const head = vec3(0.05, shoulderY + 0.19, 0);

      const shoulderL = vec3(0.01, shoulderY, -0.22);
      const shoulderR = vec3(0.01, shoulderY, 0.22);
      const wristL = vec3(0, 1.96, -0.34);
      const wristR = vec3(0, 1.96, 0.34);

      const elbowL = solveTwoBoneIK(shoulderL, wristL, 0.27, 0.26, vec3(0.20, -0.55, -0.82));
      const elbowR = solveTwoBoneIK(shoulderR, wristR, 0.27, 0.26, vec3(0.20, -0.55, 0.82));

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0, hipY, -0.12),
        hipR: vec3(0, hipY, 0.12),
        kneeL: vec3(0.02, hipY - 0.40, -0.13),
        kneeR: vec3(0.02, hipY - 0.40, 0.13),
        ankleL: vec3(-0.08, hipY - 0.72, -0.13),
        ankleR: vec3(-0.08, hipY - 0.72, 0.13),
        toeL: vec3(0.02, hipY - 0.78, -0.13),
        toeR: vec3(0.02, hipY - 0.78, 0.13),
        shoulderL,
        shoulderR,
        elbowL,
        elbowR,
        wristL,
        wristR,
        props: {
          flatFloorPlatform: true,
          pullUpBar: true
        },
        hudTargetRegion: 'back_posterior',
        activeMuscles: {
          lats: 1.0,
          biceps: 0.95,
          upperBack: 0.92,
          rearDelts: 0.78,
          forearms: 0.85,
          core: 0.70
        }
      };
    },

    'bw-squat': (repT) => {
      const base = POSE_BUILDERS['goblet-squats'](repT);
      // Reach arms forward for counterbalance during bodyweight squat
      const reachX = lerp(0.12, 0.44, repT);
      const reachY = lerp(0.95, 0.96, repT);
      base.elbowL = vec3(lerp(0.04, 0.24, repT), lerp(1.12, 0.92, repT), -0.22);
      base.elbowR = vec3(lerp(0.04, 0.24, repT), lerp(1.12, 0.92, repT), 0.22);
      base.wristL = vec3(reachX, reachY, -0.18);
      base.wristR = vec3(reachX, reachY, 0.18);
      base.props = { flatFloorPlatform: true };
      return base;
    },

    /* ========================================================================
       Other Equipment Library Exercises (Dip Station, Cable, Med Ball, Carry)
       ======================================================================== */
    'other-dips': (repT) => {
      const dip = repT;
      const drop = lerp(0.0, 0.28, dip);
      const shoulderY = 1.42 - drop;
      const hipY = 0.90 - drop * 0.85;
      const leanX = lerp(0.02, 0.12, dip);

      const pelvis = vec3(-0.06, hipY, 0);
      const neck = vec3(leanX, shoulderY, 0);
      const waist = mid3(pelvis, neck, 0.38);
      const chest = mid3(pelvis, neck, 0.76);
      const head = vec3(leanX + 0.05, shoulderY + 0.19, 0);

      const shoulderL = vec3(leanX, shoulderY - 0.02, -0.22);
      const shoulderR = vec3(leanX, shoulderY - 0.02, 0.22);
      const wristL = vec3(0.02, 0.96, -0.27);
      const wristR = vec3(0.02, 0.96, 0.27);

      const elbowL = solveTwoBoneIK(shoulderL, wristL, 0.27, 0.26, vec3(-0.85, 0.25, -0.45));
      const elbowR = solveTwoBoneIK(shoulderR, wristR, 0.27, 0.26, vec3(-0.85, 0.25, 0.45));

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(-0.06, hipY, -0.12),
        hipR: vec3(-0.06, hipY, 0.12),
        kneeL: vec3(-0.04, hipY - 0.36, -0.13),
        kneeR: vec3(-0.04, hipY - 0.36, 0.13),
        ankleL: vec3(-0.22, hipY - 0.56, -0.13),
        ankleR: vec3(-0.22, hipY - 0.56, 0.13),
        toeL: vec3(-0.14, hipY - 0.64, -0.13),
        toeR: vec3(-0.14, hipY - 0.64, 0.13),
        shoulderL,
        shoulderR,
        elbowL,
        elbowR,
        wristL,
        wristR,
        props: {
          flatFloorPlatform: true,
          dipBars: true
        },
        hudTargetRegion: 'chest_front',
        activeMuscles: {
          pecs: 1.0,
          triceps: 1.0,
          frontDelts: 0.90,
          core: 0.68
        }
      };
    },

    'other-face-pull': (repT) => {
      const pull = repT;
      const pelvis = vec3(-0.04, 0.92, 0);
      const waist = vec3(-0.03, 1.10, 0);
      const chest = vec3(-0.02, 1.29, 0);
      const neck = vec3(-0.02, 1.45, 0);
      const head = vec3(0.01, 1.65, 0);

      const shoulderL = vec3(-0.02, 1.41, -0.23);
      const shoulderR = vec3(-0.02, 1.41, 0.23);

      const wristX = lerp(0.46, 0.06, pull);
      const wristY = lerp(1.46, 1.60, pull);
      const wristZ = lerp(0.14, 0.26, pull);
      const wristL = vec3(wristX, wristY, -wristZ);
      const wristR = vec3(wristX, wristY, wristZ);

      const elbowL = solveTwoBoneIK(shoulderL, wristL, 0.27, 0.26, vec3(-0.45, 0.20, -0.88));
      const elbowR = solveTwoBoneIK(shoulderR, wristR, 0.27, 0.26, vec3(-0.45, 0.20, 0.88));

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(-0.04, 0.92, -0.13),
        hipR: vec3(-0.04, 0.92, 0.13),
        kneeL: vec3(0.0, 0.49, -0.15),
        kneeR: vec3(0.0, 0.49, 0.15),
        ankleL: vec3(-0.02, 0.08, -0.16),
        ankleR: vec3(-0.02, 0.08, 0.16),
        toeL: vec3(0.15, 0.04, -0.17),
        toeR: vec3(0.15, 0.04, 0.17),
        shoulderL,
        shoulderR,
        elbowL,
        elbowR,
        wristL,
        wristR,
        props: {
          flatFloorPlatform: true,
          cableRig: { anchor: vec3(0.68, 1.56, 0), handL: wristL, handR: wristR }
        },
        hudTargetRegion: 'back_posterior',
        activeMuscles: {
          rearDelts: 1.0,
          upperBack: 1.0,
          sideDelts: 0.78,
          forearms: 0.65
        }
      };
    },

    'other-farmers-carry': (repT, rawCycle) => {
      const stride = Math.sin(rawCycle * Math.PI * 2);
      const pelvis = vec3(0, 0.92, 0);
      const waist = vec3(0, 1.11, 0);
      const chest = vec3(0.01, 1.30, 0);
      const neck = vec3(0.01, 1.46, 0);
      const head = vec3(0.03, 1.66, 0);

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0, 0.92, -0.13),
        hipR: vec3(0, 0.92, 0.13),
        kneeL: vec3(stride * 0.14, 0.49 + Math.max(0, stride) * 0.06, -0.15),
        kneeR: vec3(-stride * 0.14, 0.49 + Math.max(0, -stride) * 0.06, 0.15),
        ankleL: vec3(stride * 0.20, 0.08 + Math.max(0, stride) * 0.04, -0.15),
        ankleR: vec3(-stride * 0.20, 0.08 + Math.max(0, -stride) * 0.04, 0.15),
        toeL: vec3(stride * 0.20 + 0.16, 0.04, -0.16),
        toeR: vec3(-stride * 0.20 + 0.16, 0.04, 0.16),
        shoulderL: vec3(0.01, 1.42, -0.24),
        shoulderR: vec3(0.01, 1.42, 0.24),
        elbowL: vec3(0.0, 1.12, -0.26),
        elbowR: vec3(0.0, 1.12, 0.26),
        wristL: vec3(0.01, 0.84, -0.27),
        wristR: vec3(0.01, 0.84, 0.27),
        props: {
          flatFloorPlatform: true,
          pairDumbbells: {
            leftCenter: vec3(0.01, 0.80, -0.27),
            rightCenter: vec3(0.01, 0.80, 0.27),
            axis: vec3(1, 0, 0)
          }
        },
        hudTargetRegion: 'back_posterior',
        activeMuscles: {
          forearms: 1.0,
          upperBack: 1.0,
          core: 0.92,
          glutes: 0.78,
          quads: 0.75,
          calves: 0.72
        }
      };
    },

    'other-medball-slam': (repT) => {
      const slam = repT;
      const hipY = lerp(0.94, 0.68, slam);
      const shoulderX = lerp(-0.02, 0.22, slam);
      const shoulderY = lerp(1.46, 0.98, slam);

      const pelvis = vec3(lerp(0.0, -0.16, slam), hipY, 0);
      const neck = vec3(shoulderX, shoulderY, 0);
      const waist = mid3(pelvis, neck, 0.38);
      const chest = mid3(pelvis, neck, 0.76);
      const head = vec3(shoulderX + 0.06, shoulderY + 0.19, 0);

      const wristX = lerp(0.04, 0.32, slam);
      const wristY = lerp(1.92, 0.38, slam);

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(pelvis.x, hipY, -0.13),
        hipR: vec3(pelvis.x, hipY, 0.13),
        kneeL: vec3(lerp(0.02, 0.14, slam), lerp(0.49, 0.44, slam), -0.16),
        kneeR: vec3(lerp(0.02, 0.14, slam), lerp(0.49, 0.44, slam), 0.16),
        ankleL: vec3(0, 0.08, -0.16),
        ankleR: vec3(0, 0.08, 0.16),
        toeL: vec3(0.17, 0.04, -0.17),
        toeR: vec3(0.17, 0.04, 0.17),
        shoulderL: vec3(shoulderX, shoulderY - 0.02, -0.23),
        shoulderR: vec3(shoulderX, shoulderY - 0.02, 0.23),
        elbowL: vec3(lerp(0.04, 0.24, slam), lerp(1.68, 0.68, slam), -0.18),
        elbowR: vec3(lerp(0.04, 0.24, slam), lerp(1.68, 0.68, slam), 0.18),
        wristL: vec3(wristX, wristY, -0.11),
        wristR: vec3(wristX, wristY, 0.11),
        props: {
          flatFloorPlatform: true,
          medBall: { center: vec3(wristX, Math.max(0.16, wristY - 0.04), 0) }
        },
        hudTargetRegion: 'core_front',
        activeMuscles: {
          core: 1.0,
          lats: 0.95,
          pecs: 0.82,
          frontDelts: 0.85,
          triceps: 0.80
        }
      };
    },

    'db-bench-press': (repT) => {
      const base = POSE_BUILDERS['bb-bench-press'](repT);
      const pressHeight = lerp(0.0, 1.0, 1.0 - repT);
      const wristX = lerp(-0.21, -0.29, pressHeight);
      const wristY = lerp(0.58, 0.90, pressHeight);
      const wristZ = lerp(0.40, 0.29, pressHeight * pressHeight);
      base.wristL = vec3(wristX, wristY, -wristZ);
      base.wristR = vec3(wristX, wristY, wristZ);
      base.elbowL = solveTwoBoneIK(base.shoulderL, base.wristL, 0.27, 0.26, vec3(0.45, -0.45, -0.80));
      base.elbowR = solveTwoBoneIK(base.shoulderR, base.wristR, 0.27, 0.26, vec3(0.45, -0.45, 0.80));
      base.props = {
        flatFloorPlatform: true,
        flatBench: true,
        pairDumbbells: {
          leftCenter: vec3(wristX, wristY + 0.02, -wristZ),
          rightCenter: vec3(wristX, wristY + 0.02, wristZ),
          axis: vec3(0, 0, 1)
        }
      };
      return base;
    },

    'db-chest-fly': (repT) => {
      const base = POSE_BUILDERS['bb-bench-press'](repT);
      const open = repT;
      // Wide circular chest-fly hug arc around shoulders (constant L1=0.27, L2=0.26)
      const flyAngle = lerp(0.18, 1.32, open);
      const elbowAngle = flyAngle + 0.18;
      const elbowY = 0.43 + Math.cos(elbowAngle) * 0.27;
      const elbowZ = 0.23 + Math.sin(elbowAngle) * 0.27;
      const wristAngle = flyAngle - 0.18;
      const wristY = elbowY + Math.cos(wristAngle) * 0.26;
      const wristZ = elbowZ + Math.sin(wristAngle) * 0.26;

      base.elbowL = vec3(-0.26, elbowY, -elbowZ);
      base.elbowR = vec3(-0.26, elbowY, elbowZ);
      base.wristL = vec3(-0.26, wristY, -wristZ);
      base.wristR = vec3(-0.26, wristY, wristZ);
      base.props = {
        flatFloorPlatform: true,
        flatBench: true,
        pairDumbbells: {
          leftCenter: vec3(-0.26, wristY + 0.02, -wristZ),
          rightCenter: vec3(-0.26, wristY + 0.02, wristZ),
          axis: vec3(1, 0, 0)
        }
      };
      return base;
    },

    'tricep-overhead': (repT) => {
      const ext = 1.0 - repT;
      const pelvis = vec3(0, 0.92, 0);
      const waist = vec3(0, 1.10, 0);
      const chest = vec3(0.01, 1.29, 0);
      const neck = vec3(0.01, 1.45, 0);
      const head = vec3(0.04, 1.65, 0);

      // True circular forearm hinge around overhead elbows (constant forearm length 0.26)
      const elbowX = 0.03;
      const elbowY = 1.67;
      const extAngle = lerp(-2.15, 1.45, ext);
      const wristX = elbowX + Math.cos(extAngle) * 0.25;
      const wristY = elbowY + Math.sin(extAngle) * 0.25;

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0, 0.92, -0.13),
        hipR: vec3(0, 0.92, 0.13),
        kneeL: vec3(0.02, 0.49, -0.15),
        kneeR: vec3(0.02, 0.49, 0.15),
        ankleL: vec3(0, 0.08, -0.15),
        ankleR: vec3(0, 0.08, 0.15),
        toeL: vec3(0.17, 0.04, -0.16),
        toeR: vec3(0.17, 0.04, 0.16),
        shoulderL: vec3(0.01, 1.41, -0.22),
        shoulderR: vec3(0.01, 1.41, 0.22),
        elbowL: vec3(elbowX, elbowY, -0.17),
        elbowR: vec3(elbowX, elbowY, 0.17),
        wristL: vec3(wristX, wristY, -0.05),
        wristR: vec3(wristX, wristY, 0.05),
        props: {
          flatFloorPlatform: true,
          gobletDumbbell: {
            top: vec3(wristX, wristY + 0.11, 0),
            bottom: vec3(wristX, wristY - 0.11, 0)
          }
        },
        hudTargetRegion: 'shoulders_front',
        activeMuscles: { triceps: 1.0, core: 0.55, frontDelts: 0.45 }
      };
    },

    'shrug-upright': (repT) => {
      const pull = repT;
      const shY = lerp(1.40, 1.49, pull);
      const pelvis = vec3(0, 0.92, 0);
      const waist = vec3(0, 1.10, 0);
      const chest = vec3(0.01, 1.29, 0);
      const neck = vec3(0.01, 1.46, 0);
      const head = vec3(0.03, 1.66, 0);

      const shoulderL = vec3(0.01, shY, -0.23);
      const shoulderR = vec3(0.01, shY, 0.23);
      const wrY = lerp(0.89, 1.28, pull);
      const wristL = vec3(0.08, wrY, -0.22);
      const wristR = vec3(0.08, wrY, 0.22);

      const elbowL = solveTwoBoneIK(shoulderL, wristL, 0.27, 0.26, vec3(0.15, 0.40, -0.90));
      const elbowR = solveTwoBoneIK(shoulderR, wristR, 0.27, 0.26, vec3(0.15, 0.40, 0.90));

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0, 0.92, -0.13),
        hipR: vec3(0, 0.92, 0.13),
        kneeL: vec3(0.02, 0.49, -0.15),
        kneeR: vec3(0.02, 0.49, 0.15),
        ankleL: vec3(0, 0.08, -0.15),
        ankleR: vec3(0, 0.08, 0.15),
        toeL: vec3(0.17, 0.04, -0.16),
        toeR: vec3(0.17, 0.04, 0.16),
        shoulderL,
        shoulderR,
        elbowL,
        elbowR,
        wristL,
        wristR,
        props: {
          flatFloorPlatform: true,
          pairDumbbells: {
            leftCenter: vec3(0.08, wrY - 0.02, -0.22),
            rightCenter: vec3(0.08, wrY - 0.02, 0.22),
            axis: vec3(0, 0, 1)
          }
        },
        hudTargetRegion: 'back_posterior',
        activeMuscles: { upperBack: 1.0, sideDelts: 0.85, forearms: 0.72 }
      };
    },

    'hip-thrust': (repT) => {
      const thrust = 1.0 - repT;
      const hipY = lerp(0.16, 0.44, thrust);
      const pelvis = vec3(0.06, hipY, 0);
      const neck = vec3(-0.42, 0.40, 0);
      const waist = mid3(pelvis, neck, 0.38);
      const chest = mid3(pelvis, neck, 0.76);
      const head = vec3(-0.56, 0.48, 0);

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0.06, hipY, -0.13),
        hipR: vec3(0.06, hipY, 0.13),
        kneeL: vec3(0.44, 0.44, -0.16),
        kneeR: vec3(0.44, 0.44, 0.16),
        ankleL: vec3(0.46, 0.08, -0.16),
        ankleR: vec3(0.46, 0.08, 0.16),
        toeL: vec3(0.60, 0.04, -0.17),
        toeR: vec3(0.60, 0.04, 0.17),
        shoulderL: vec3(-0.34, 0.40, -0.22),
        shoulderR: vec3(-0.34, 0.40, 0.22),
        elbowL: vec3(-0.16, hipY + 0.06, -0.26),
        elbowR: vec3(-0.16, hipY + 0.06, 0.26),
        wristL: vec3(0.06, hipY + 0.10, -0.24),
        wristR: vec3(0.06, hipY + 0.10, 0.24),
        props: {
          flatFloorPlatform: true,
          flatBench: true,
          barbell: { center: vec3(0.06, hipY + 0.11, 0), halfWidth: 0.74 }
        },
        hudTargetRegion: 'legs_posterior',
        activeMuscles: { glutes: 1.0, hamstrings: 0.88, core: 0.65, quads: 0.55 }
      };
    },

    'calf-raise': (repT) => {
      const lift = repT * 0.09;
      const pelvis = vec3(0, 0.92 + lift, 0);
      const waist = vec3(0, 1.11 + lift, 0);
      const chest = vec3(0.01, 1.30 + lift, 0);
      const neck = vec3(0.01, 1.46 + lift, 0);
      const head = vec3(0.03, 1.66 + lift, 0);

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(0, 0.92 + lift, -0.13),
        hipR: vec3(0, 0.92 + lift, 0.13),
        kneeL: vec3(0.02, 0.49 + lift, -0.15),
        kneeR: vec3(0.02, 0.49 + lift, 0.15),
        ankleL: vec3(0.02, 0.08 + lift, -0.15),
        ankleR: vec3(0.02, 0.08 + lift, 0.15),
        toeL: vec3(0.17, 0.04, -0.16),
        toeR: vec3(0.17, 0.04, 0.16),
        shoulderL: vec3(0.01, 1.42 + lift, -0.23),
        shoulderR: vec3(0.01, 1.42 + lift, 0.23),
        elbowL: vec3(0.0, 1.12 + lift, -0.26),
        elbowR: vec3(0.0, 1.12 + lift, 0.26),
        wristL: vec3(0.01, 0.84 + lift, -0.27),
        wristR: vec3(0.01, 0.84 + lift, 0.27),
        props: {
          flatFloorPlatform: true,
          pairDumbbells: {
            leftCenter: vec3(0.01, 0.82 + lift, -0.27),
            rightCenter: vec3(0.01, 0.82 + lift, 0.27),
            axis: vec3(1, 0, 0)
          }
        },
        hudTargetRegion: 'legs_posterior',
        activeMuscles: { calves: 1.0, forearms: 0.65, glutes: 0.45 }
      };
    },

    'cable-pulldown': (repT) => {
      const pull = repT;
      const pelvis = vec3(-0.04, 0.92, 0);
      const waist = vec3(-0.03, 1.10, 0);
      const chest = vec3(-0.01, 1.29, 0);
      const neck = vec3(-0.01, 1.45, 0);
      const head = vec3(0.02, 1.65, 0);

      const shoulderL = vec3(-0.01, 1.41, -0.23);
      const shoulderR = vec3(-0.01, 1.41, 0.23);
      const wrY = lerp(1.88, 1.36, pull);
      const wrZ = 0.34;
      const wristL = vec3(0.10, wrY, -wrZ);
      const wristR = vec3(0.10, wrY, wrZ);

      const elbowL = solveTwoBoneIK(shoulderL, wristL, 0.27, 0.26, vec3(0.15, -0.60, -0.78));
      const elbowR = solveTwoBoneIK(shoulderR, wristR, 0.27, 0.26, vec3(0.15, -0.60, 0.78));

      return {
        pelvis, waist, chest, neck, head,
        hipL: vec3(-0.04, 0.92, -0.13),
        hipR: vec3(-0.04, 0.92, 0.13),
        kneeL: vec3(0.0, 0.49, -0.15),
        kneeR: vec3(0.0, 0.49, 0.15),
        ankleL: vec3(-0.02, 0.08, -0.16),
        ankleR: vec3(-0.02, 0.08, 0.16),
        toeL: vec3(0.15, 0.04, -0.17),
        toeR: vec3(0.15, 0.04, 0.17),
        shoulderL,
        shoulderR,
        elbowL,
        elbowR,
        wristL,
        wristR,
        props: {
          flatFloorPlatform: true,
          cableRig: { anchor: vec3(0.24, 1.96, 0), handL: wristL, handR: wristR }
        },
        hudTargetRegion: 'back_posterior',
        activeMuscles: { lats: 1.0, biceps: 0.85, upperBack: 0.88, rearDelts: 0.72 }
      };
    },

    'plank-rollout': (repT) => {
      const reach = repT;
      const base = POSE_BUILDERS['bw-pushup'](0.25);
      const wrX = lerp(0.42, 0.78, reach);
      const elX = lerp(0.38, 0.62, reach);
      base.elbowL = vec3(elX, 0.18, -0.20);
      base.elbowR = vec3(elX, 0.18, 0.20);
      base.wristL = vec3(wrX, 0.08, -0.16);
      base.wristR = vec3(wrX, 0.08, 0.16);
      base.hudTargetRegion = 'core_front';
      base.activeMuscles = { core: 1.0, lats: 0.85, frontDelts: 0.75, triceps: 0.65, glutes: 0.65 };
      return base;
    }
  };

  /* ==========================================================================
     Anatomical3DViewer Class
     ========================================================================== */
  class Anatomical3DViewer {
    constructor(canvas, exerciseId, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.exerciseId = exerciseId;
      this.poseId = options.poseId || exerciseId;
      this.customActiveMuscles = options.activeMuscles || null;
      this.yaw = options.initialYaw !== undefined ? options.initialYaw : 42;
      this.pitch = options.initialPitch !== undefined ? options.initialPitch : 18;
      this.zoom = options.initialZoom || 1.0;
      this.autoSpin = Boolean(options.autoSpin);
      this.clinicalLightMode = Boolean(options.clinicalLightMode);
      this.isFilterMannequin = Boolean(options.isFilterMannequin);
      this.selectedMuscleSet = new Set(options.selectedMuscles || []);
      this.onMuscleClick = options.onMuscleClick || null;
      this.spotlightMuscleKey = null;
      this.cursorHoverMuscle = null;
      this.projectedHitZones = [];
      this.speed = 1.0;
      this.paused = false;
      this.manualCycle = null;
      this.cycle = Math.random() * 0.25;
      this.isDragging = false;
      this.dragMovedDist = 0;
      this.lastPointerX = 0;
      this.lastPointerY = 0;
      this.onPhaseUpdate = options.onPhaseUpdate || null;
      this.onSpinStateChange = options.onSpinStateChange || null;

      this.bindInteraction();
    }

    setSelectedMuscles(muscleKeysArray) {
      this.selectedMuscleSet = new Set(muscleKeysArray || []);
    }

    bindInteraction() {
      const startDrag = (clientX, clientY) => {
        this.isDragging = true;
        this.dragMovedDist = 0;
        this.autoSpin = false;
        this.lastPointerX = clientX;
        this.lastPointerY = clientY;
        if (this.onSpinStateChange) this.onSpinStateChange(false);
      };

      const moveDrag = (clientX, clientY) => {
        if (!this.isDragging) return;
        const dx = clientX - this.lastPointerX;
        const dy = clientY - this.lastPointerY;
        this.dragMovedDist += Math.hypot(dx, dy);
        this.lastPointerX = clientX;
        this.lastPointerY = clientY;
        this.yaw = (this.yaw + dx * 0.8) % 360;
        this.pitch = clamp(this.pitch + dy * 0.5, -10, 72);
      };

      const endDrag = () => {
        this.isDragging = false;
      };

      this.canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
      });
      window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
      window.addEventListener('mouseup', endDrag);

      this.canvas.addEventListener('click', (e) => {
        if (!this.isFilterMannequin || this.dragMovedDist > 7) return;
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        this.updateCursorMuscleHit(mx, my);
        if (this.cursorHoverMuscle && this.onMuscleClick) {
          this.onMuscleClick(this.cursorHoverMuscle.key);
        }
      });

      this.canvas.addEventListener('mousemove', (e) => {
        if (this.isDragging && this.dragMovedDist > 4) {
          this.cursorHoverMuscle = null;
          return;
        }
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        this.updateCursorMuscleHit(mx, my);
      });

      this.canvas.addEventListener('mouseleave', () => {
        this.cursorHoverMuscle = null;
        this.canvas.style.cursor = 'grab';
      });

      this.canvas.addEventListener(
        'touchstart',
        (e) => {
          if (e.touches.length === 1) {
            const rect = this.canvas.getBoundingClientRect();
            this.updateCursorMuscleHit(
              e.touches[0].clientX - rect.left,
              e.touches[0].clientY - rect.top
            );
            startDrag(e.touches[0].clientX, e.touches[0].clientY);
          }
        },
        { passive: true }
      );
      this.canvas.addEventListener(
        'touchmove',
        (e) => {
          if (e.touches.length === 1 && this.isDragging) {
            moveDrag(e.touches[0].clientX, e.touches[0].clientY);
          }
        },
        { passive: true }
      );
      this.canvas.addEventListener('touchend', () => {
        if (this.isFilterMannequin && this.dragMovedDist <= 7 && this.cursorHoverMuscle && this.onMuscleClick) {
          this.onMuscleClick(this.cursorHoverMuscle.key);
        }
        endDrag();
      });

      this.canvas.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault();
          this.zoom = clamp(this.zoom - e.deltaY * 0.001, 0.72, 1.65);
        },
        { passive: false }
      );
    }

    updateCursorMuscleHit(mx, my) {
      let bestHit = null;
      let bestScore = Infinity;

      for (const zone of this.projectedHitZones) {
        const dist = Math.hypot(mx - zone.x, my - zone.y);
        if (dist <= zone.radius) {
          const score = dist + zone.depth * 8;
          if (score < bestScore) {
            bestScore = score;
            bestHit = zone;
          }
        }
      }

      this.cursorHoverMuscle = bestHit;
      this.canvas.style.cursor = bestHit ? 'pointer' : 'grab';
    }

    setCameraAngle(yaw, pitch = 16) {
      this.autoSpin = false;
      this.yaw = yaw;
      this.pitch = pitch;
      if (this.onSpinStateChange) this.onSpinStateChange(false);
    }

    toggleAutoSpin() {
      this.autoSpin = !this.autoSpin;
      if (this.onSpinStateChange) this.onSpinStateChange(this.autoSpin);
      return this.autoSpin;
    }

    toggleClinicalLight() {
      this.clinicalLightMode = !this.clinicalLightMode;
      return this.clinicalLightMode;
    }

    setSpotlightMuscle(muscleKey) {
      this.spotlightMuscleKey = muscleKey || null;
    }

    getActiveHoverKey() {
      if (this.cursorHoverMuscle) return this.cursorHoverMuscle.key;
      if (this.spotlightMuscleKey) return this.spotlightMuscleKey;
      return null;
    }

    getCameraPosition(targetY) {
      const yawRad = this.yaw * DEG2RAD;
      const pitchRad = this.pitch * DEG2RAD;
      const dist = 2.75 / this.zoom;
      return vec3(
        Math.sin(yawRad) * Math.cos(pitchRad) * dist,
        targetY + Math.sin(pitchRad) * dist,
        Math.cos(yawRad) * Math.cos(pitchRad) * dist
      );
    }

    project3DTo2D(pt, W, H, viewProj) {
      const x = pt.x, y = pt.y, z = pt.z;
      const clipX = viewProj[0] * x + viewProj[4] * y + viewProj[8] * z + viewProj[12];
      const clipY = viewProj[1] * x + viewProj[5] * y + viewProj[9] * z + viewProj[13];
      const clipZ = viewProj[2] * x + viewProj[6] * y + viewProj[10] * z + viewProj[14];
      const clipW = viewProj[3] * x + viewProj[7] * y + viewProj[11] * z + viewProj[15];
      const invW = 1.0 / Math.max(0.001, clipW);
      const ndcX = clipX * invW;
      const ndcY = clipY * invW;
      return {
        x: (ndcX * 0.5 + 0.5) * W,
        y: (0.5 - ndcY * 0.5) * H,
        depth: clipZ * invW
      };
    }

    getMaterialParams(muscleKey, activeMap, repT) {
      const porcelain = [0.85, 0.89, 0.94];
      if (!muscleKey) {
        return {
          baseColor: porcelain,
          glowColor: [0, 0, 0],
          activation: 0,
          striation: 0.15,
          rimMode: 0
        };
      }

      const hoveredKey = this.getActiveHoverKey();
      let act = activeMap[muscleKey] || 0;

      if (hoveredKey) {
        if (hoveredKey === muscleKey) {
          act = 1.0;
        } else {
          act *= 0.25;
        }
      }

      const dynamicAct = clamp(act * (0.78 + 0.22 * repT), 0, 1);
      if (dynamicAct <= 0.06) {
        return {
          baseColor: porcelain,
          glowColor: [0, 0, 0],
          activation: 0,
          striation: 0.22,
          rimMode: 0
        };
      }

      if (act < 0.65 && !hoveredKey && (muscleKey === 'upperBack' || muscleKey === 'lowerBack')) {
        return {
          baseColor: porcelain,
          glowColor: [0.13, 0.82, 0.38],
          activation: dynamicAct * 0.85,
          striation: 0.6,
          rimMode: 2
        };
      }

      if (act < 0.88 && hoveredKey !== muscleKey) {
        return {
          baseColor: porcelain,
          glowColor: [1.0, 0.48, 0.12],
          activation: dynamicAct,
          striation: 0.65,
          rimMode: 1
        };
      }

      return {
        baseColor: porcelain,
        glowColor: [1.0, 0.26, 0.06],
        activation: dynamicAct,
        striation: 0.95,
        rimMode: 1
      };
    }

    renderFrame(dt) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
        this.canvas.width = targetW;
        this.canvas.height = targetH;
      }

      if (this.autoSpin && !this.isDragging && !this.cursorHoverMuscle) {
        this.yaw = (this.yaw + dt * 30) % 360;
      }
      if (!this.paused && this.manualCycle === null) {
        this.cycle = (this.cycle + dt * 0.34 * this.speed) % 1.0;
      }
      const activeCycle = this.manualCycle !== null ? this.manualCycle : this.cycle;
      const { repT, phaseName } = evaluateRepCycle(activeCycle);

      if (this.onPhaseUpdate) {
        this.onPhaseUpdate(repT, phaseName, activeCycle, Math.round(((this.yaw % 360) + 360) % 360));
      }

      const builder =
        POSE_BUILDERS[this.poseId] ||
        POSE_BUILDERS[this.exerciseId] ||
        POSE_BUILDERS['goblet-squats'];
      const pose = builder(repT, activeCycle);

      if (this.isFilterMannequin) {
        pose.activeMuscles = {};
        this.selectedMuscleSet.forEach((mKey) => {
          pose.activeMuscles[mKey] = 1.0;
        });
      } else if (this.customActiveMuscles) {
        pose.activeMuscles = this.customActiveMuscles;
      }

      const pKey = this.poseId || this.exerciseId;
      const isSupine =
        pKey === 'floor-press' ||
        pKey === 'core-decompression' ||
        pKey === 'childs-pose-traction' ||
        pKey === 'bw-pushup' ||
        pKey === 'plank-rollout';
      const isBench =
        pKey === 'bb-bench-press' ||
        pKey === 'db-bench-press' ||
        pKey === 'db-chest-fly' ||
        pKey === 'hip-thrust';
      const targetY = isSupine ? 0.28 : isBench ? 0.45 : 0.92;

      const W = rect.width;
      const H = rect.height;

      const camPos = this.getCameraPosition(targetY);
      const lookCenter = vec3(0, targetY, 0);
      const projMat = mat4Perspective(38 * DEG2RAD, W / H, 0.1, 20.0);
      const viewMat = mat4LookAt(camPos, lookCenter, vec3(0, 1, 0));
      const viewProj = mat4Multiply(projMat, viewMat);

      this.buildProjectedMuscleHitZones(pose, W, H, viewProj);

      // 1. Render 3D WebGL Scene
      if (gl && shaderProgram) {
        this.renderWebGLMannequin(targetW, targetH, camPos, viewProj, pose, repT);
        this.ctx.save();
        this.ctx.clearRect(0, 0, targetW, targetH);
        this.ctx.drawImage(glCanvas, 0, 0, targetW, targetH, 0, 0, targetW, targetH);
        this.ctx.restore();
      }

      // 2. Render Clean, Uncrowded 2D Overlays
      const ctx = this.ctx;
      ctx.save();
      ctx.scale(dpr, dpr);

      if (!this.isFilterMannequin) {
        const isModal = Boolean(this.canvas.dataset.modalViewer);
        this.drawTopGlassMuscleHUD(ctx, W, H, pose.hudTargetRegion, repT, isModal);
      }

      // ONLY show muscle name when cursor moves over a muscle (or hovers a muscle tag pill)!
      this.drawSingleHoveredMuscleTooltip(ctx, W, H, pose.activeMuscles);

      // Bottom Viewport Status Badge
      this.drawViewportHUD(
        ctx,
        W,
        H,
        this.isFilterMannequin ? 'Click Muscle to Filter' : phaseName
      );

      ctx.restore();
    }

    buildProjectedMuscleHitZones(pose, W, H, viewProj) {
      const spineUp = norm3(sub3(pose.neck, pose.pelvis));
      const torsoFront = norm3(cross3(spineUp, vec3(0, 0, 1)));
      const zones3D = [
        { key: 'pecs', pt: add3(mid3(pose.chest, pose.shoulderL, 0.45), scale3(torsoFront, 0.085)), r: 24 },
        { key: 'pecs', pt: add3(mid3(pose.chest, pose.shoulderR, 0.45), scale3(torsoFront, 0.085)), r: 24 },
        { key: 'frontDelts', pt: add3(pose.shoulderL, scale3(torsoFront, 0.04)), r: 18 },
        { key: 'frontDelts', pt: add3(pose.shoulderR, scale3(torsoFront, 0.04)), r: 18 },
        { key: 'sideDelts', pt: add3(pose.shoulderL, vec3(0, 0, -0.04)), r: 18 },
        { key: 'sideDelts', pt: add3(pose.shoulderR, vec3(0, 0, 0.04)), r: 18 },
        { key: 'rearDelts', pt: add3(pose.shoulderL, scale3(torsoFront, -0.04)), r: 18 },
        { key: 'rearDelts', pt: add3(pose.shoulderR, scale3(torsoFront, -0.04)), r: 18 },
        { key: 'biceps', pt: add3(mid3(pose.shoulderL, pose.elbowL, 0.5), scale3(torsoFront, 0.025)), r: 18 },
        { key: 'biceps', pt: add3(mid3(pose.shoulderR, pose.elbowR, 0.5), scale3(torsoFront, 0.025)), r: 18 },
        { key: 'triceps', pt: add3(mid3(pose.shoulderL, pose.elbowL, 0.5), scale3(torsoFront, -0.028)), r: 19 },
        { key: 'triceps', pt: add3(mid3(pose.shoulderR, pose.elbowR, 0.5), scale3(torsoFront, -0.028)), r: 19 },
        { key: 'forearms', pt: mid3(pose.elbowL, pose.wristL, 0.5), r: 16 },
        { key: 'forearms', pt: mid3(pose.elbowR, pose.wristR, 0.5), r: 16 },
        { key: 'core', pt: add3(pose.waist, scale3(torsoFront, 0.088)), r: 24 },
        { key: 'lats', pt: add3(mid3(pose.waist, pose.shoulderL, 0.5), scale3(torsoFront, -0.06)), r: 22 },
        { key: 'lats', pt: add3(mid3(pose.waist, pose.shoulderR, 0.5), scale3(torsoFront, -0.06)), r: 22 },
        { key: 'upperBack', pt: add3(mid3(pose.chest, pose.neck, 0.5), scale3(torsoFront, -0.08)), r: 22 },
        { key: 'lowerBack', pt: add3(mid3(pose.pelvis, pose.waist, 0.5), scale3(torsoFront, -0.075)), r: 22 },
        { key: 'glutes', pt: add3(pose.hipL, scale3(torsoFront, -0.06)), r: 22 },
        { key: 'glutes', pt: add3(pose.hipR, scale3(torsoFront, -0.06)), r: 22 },
        { key: 'quads', pt: add3(mid3(pose.hipL, pose.kneeL, 0.5), vec3(0.03, 0.02, 0)), r: 24 },
        { key: 'quads', pt: add3(mid3(pose.hipR, pose.kneeR, 0.5), vec3(0.03, 0.02, 0)), r: 24 },
        { key: 'hamstrings', pt: add3(mid3(pose.hipL, pose.kneeL, 0.5), vec3(-0.04, -0.02, 0)), r: 23 },
        { key: 'hamstrings', pt: add3(mid3(pose.hipR, pose.kneeR, 0.5), vec3(-0.04, -0.02, 0)), r: 23 },
        { key: 'calves', pt: mid3(pose.kneeL, pose.ankleL, 0.45), r: 18 },
        { key: 'calves', pt: mid3(pose.kneeR, pose.ankleR, 0.45), r: 18 }
      ];

      this.projectedHitZones = zones3D.map((z) => {
        const p2d = this.project3DTo2D(z.pt, W, H, viewProj);
        return {
          key: z.key,
          name: MUSCLE_DISPLAY_NAMES[z.key] || z.key,
          x: p2d.x,
          y: p2d.y,
          depth: p2d.depth,
          radius: z.r * this.zoom
        };
      });
    }

    drawSingleHoveredMuscleTooltip(ctx, W, H, activeMap) {
      let targetZone = this.cursorHoverMuscle;
      if (!targetZone && this.spotlightMuscleKey) {
        targetZone = this.projectedHitZones.find((z) => z.key === this.spotlightMuscleKey) || null;
      }
      if (!targetZone) return;

      const actLevel = activeMap[targetZone.key] || 0;
      let roleText = 'Neutral / Antagonist';
      let accentColor = '#38bdf8';
      if (this.isFilterMannequin) {
        if (this.selectedMuscleSet.has(targetZone.key)) {
          roleText = '✓ Filter Active (Click to Clear)';
          accentColor = '#ff4810';
        } else {
          roleText = 'Click Muscle to Filter Library';
          accentColor = '#2dd4bf';
        }
      } else if (actLevel >= 0.88) {
        roleText = 'Primary Target';
        accentColor = '#ff4810';
      } else if (actLevel > 0.08) {
        roleText = 'Synergist / Stabilizer';
        accentColor = '#22c55e';
      }

      const ptX = clamp(targetZone.x, 14, W - 14);
      const ptY = clamp(targetZone.y, 48, H - 28);

      const isLeft = ptX < W * 0.5;
      const tipX = isLeft ? Math.min(W - 12, ptX + 22) : Math.max(12, ptX - 22);
      const tipY = clamp(ptY - 18, 48, H - 34);

      ctx.save();
      ctx.strokeStyle = accentColor;
      ctx.fillStyle = accentColor;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(ptX, ptY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(ptX, ptY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = '700 10px "Inter", sans-serif';
      const titleW = ctx.measureText(targetZone.name).width;
      ctx.font = '600 8.5px "JetBrains Mono", monospace';
      const subW = ctx.measureText(roleText).width;
      const boxW = Math.max(titleW, subW) + 16;
      const boxH = 29;
      const boxX = clamp(isLeft ? tipX : tipX - boxW, 6, W - boxW - 6);
      const boxY = clamp(tipY - boxH * 0.5, 44, H - boxH - 24);

      ctx.fillStyle = 'rgba(11, 17, 32, 0.94)';
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 10px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(targetZone.name, boxX + 8, boxY + 12.5);

      ctx.fillStyle = accentColor;
      ctx.font = '600 8.5px "JetBrains Mono", monospace';
      ctx.fillText(roleText, boxX + 8, boxY + 23.5);
      ctx.restore();
    }

    renderWebGLMannequin(pixelW, pixelH, camPos, viewProj, pose, repT) {
      if (glCanvas.width !== pixelW || glCanvas.height !== pixelH) {
        glCanvas.width = pixelW;
        glCanvas.height = pixelH;
      }

      gl.viewport(0, 0, pixelW, pixelH);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      if (this.clinicalLightMode) {
        gl.clearColor(0.93, 0.95, 0.97, 1.0);
      } else {
        gl.clearColor(0.12, 0.145, 0.18, 1.0);
      }
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(shaderProgram);
      gl.uniformMatrix4fv(glLocations.uViewProj, false, viewProj);
      gl.uniform3f(glLocations.uCamPos, camPos.x, camPos.y, camPos.z);

      const bindMesh = (buf) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.posBuf);
        gl.enableVertexAttribArray(glLocations.aPos);
        gl.vertexAttribPointer(glLocations.aPos, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, buf.normBuf);
        gl.enableVertexAttribArray(glLocations.aNorm);
        gl.vertexAttribPointer(glLocations.aNorm, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, buf.uvBuf);
        gl.enableVertexAttribArray(glLocations.aUv);
        gl.vertexAttribPointer(glLocations.aUv, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.idxBuf);
      };

      const drawLoft = (p1, p2, rx1, rz1, rx2, belly, mat) => {
        const m = buildOrientedMatrix(p1, p2, rx1, rz1, rx2, rx2);
        gl.uniform1f(glLocations.uShapeType, 0.0);
        gl.uniform3f(glLocations.uP1, m.p1.x, m.p1.y, m.p1.z);
        gl.uniform3f(glLocations.uXAxis, m.xAxis.x, m.xAxis.y, m.xAxis.z);
        gl.uniform3f(glLocations.uYAxis, m.yAxis.x, m.yAxis.y, m.yAxis.z);
        gl.uniform3f(glLocations.uZAxis, m.zAxis.x, m.zAxis.y, m.zAxis.z);
        gl.uniform4f(glLocations.uRadii, rx1, rz1, rx2, belly);
        gl.uniform1f(glLocations.uLen, m.len);

        gl.uniform3fv(glLocations.uBaseColor, mat.baseColor);
        gl.uniform3fv(glLocations.uGlowColor, mat.glowColor);
        gl.uniform1f(glLocations.uActivation, mat.activation);
        gl.uniform1f(glLocations.uStriation, mat.striation);
        gl.uniform1f(glLocations.uRimColorMode, mat.rimMode);

        gl.drawElements(gl.TRIANGLES, unitBuffers.capsule.count, gl.UNSIGNED_SHORT, 0);
      };

      const drawEllipsoid = (center, xAxis, yAxis, zAxis, rx, ry, rz, mat) => {
        gl.uniform1f(glLocations.uShapeType, 1.0);
        gl.uniform3f(glLocations.uP1, center.x, center.y, center.z);
        gl.uniform3f(glLocations.uXAxis, xAxis.x, xAxis.y, xAxis.z);
        gl.uniform3f(glLocations.uYAxis, yAxis.x, yAxis.y, yAxis.z);
        gl.uniform3f(glLocations.uZAxis, zAxis.x, zAxis.y, zAxis.z);
        gl.uniform4f(glLocations.uRadii, rx, rz, rx, 0);
        gl.uniform1f(glLocations.uLen, ry);

        gl.uniform3fv(glLocations.uBaseColor, mat.baseColor);
        gl.uniform3fv(glLocations.uGlowColor, mat.glowColor);
        gl.uniform1f(glLocations.uActivation, mat.activation);
        gl.uniform1f(glLocations.uStriation, mat.striation);
        gl.uniform1f(glLocations.uRimColorMode, mat.rimMode);

        gl.drawElements(gl.TRIANGLES, unitBuffers.sphere.count, gl.UNSIGNED_SHORT, 0);
      };

      const drawFlatBox = (center, halfX, halfY, halfZ, mat) => {
        gl.uniform1f(glLocations.uShapeType, 2.0);
        gl.uniform3f(glLocations.uP1, center.x, center.y, center.z);
        gl.uniform3f(glLocations.uXAxis, 1, 0, 0);
        gl.uniform3f(glLocations.uYAxis, 0, 1, 0);
        gl.uniform3f(glLocations.uZAxis, 0, 0, 1);
        gl.uniform4f(glLocations.uRadii, halfX, halfZ, halfX, 0);
        gl.uniform1f(glLocations.uLen, halfY);

        gl.uniform3fv(glLocations.uBaseColor, mat.baseColor);
        gl.uniform3fv(glLocations.uGlowColor, mat.glowColor);
        gl.uniform1f(glLocations.uActivation, mat.activation);
        gl.uniform1f(glLocations.uStriation, mat.striation);
        gl.uniform1f(glLocations.uRimColorMode, mat.rimMode);

        gl.drawElements(gl.TRIANGLES, unitBuffers.box.count, gl.UNSIGNED_SHORT, 0);
      };

      const neutralMat = this.getMaterialParams(null, pose.activeMuscles, repT);
      const shortsMat = {
        baseColor: [0.11, 0.13, 0.16],
        glowColor: [0, 0, 0],
        activation: 0,
        striation: 0.05,
        rimMode: 0
      };
      const ironMat = {
        baseColor: [0.16, 0.18, 0.21],
        glowColor: [0, 0, 0],
        activation: 0,
        striation: 0.1,
        rimMode: 0
      };
      const chromeMat = {
        baseColor: [0.85, 0.88, 0.92],
        glowColor: [0, 0, 0],
        activation: 0,
        striation: 0,
        rimMode: 0
      };
      const flatMatSurface = {
        baseColor: [0.16, 0.21, 0.27], // Solid flat slate-navy exercise mat
        glowColor: [0, 0, 0],
        activation: 0,
        striation: 0,
        rimMode: 3 // Flat mat mode with subtle border edge
      };
      const floorBaseMat = {
        baseColor: [0.10, 0.13, 0.17],
        glowColor: [0, 0, 0],
        activation: 0,
        striation: 0,
        rimMode: 3
      };

      // --- 0. Render Solid Flat Rectangular Floor / Exercise Mat / Flat Bench using Box Mesh ---
      bindMesh(unitBuffers.box);
      if (pose.props && pose.props.flatExerciseMat) {
        // Wide, solid, completely flat rectangular floor mat + sub-floor slab
        drawFlatBox(vec3(0.05, -0.025, 0), 1.05, 0.015, 0.62, floorBaseMat);
        drawFlatBox(vec3(0.05, 0.01, 0), 0.92, 0.02, 0.46, flatMatSurface);
      } else if (pose.props && pose.props.flatFloorPlatform) {
        // Solid flat rectangular standing gym platform
        drawFlatBox(vec3(0.0, 0.005, 0), 0.72, 0.02, 0.56, flatMatSurface);
      }
      if (pose.props && pose.props.flatBench) {
        // Solid flat rectangular weight bench pad + steel support legs
        drawFlatBox(vec3(-0.22, 0.28, 0), 0.56, 0.04, 0.17, flatMatSurface);
        drawFlatBox(vec3(-0.62, 0.14, 0), 0.04, 0.14, 0.14, ironMat);
        drawFlatBox(vec3(0.22, 0.14, 0), 0.04, 0.14, 0.14, ironMat);
      }

      const spineUp = norm3(sub3(pose.neck, pose.pelvis));
      const torsoRight = vec3(0, 0, 1);
      const torsoFront = norm3(cross3(spineUp, torsoRight));

      // --- 1. Bind Lofted Capsule Buffer for Limbs, Torso & Muscle Bundles ---
      bindMesh(unitBuffers.capsule);

      drawLoft(
        add3(pose.pelvis, scale3(spineUp, -0.05)),
        add3(pose.pelvis, scale3(spineUp, 0.09)),
        0.115,
        0.175,
        0.118,
        0.01,
        shortsMat
      );
      drawLoft(pose.hipL, mid3(pose.hipL, pose.kneeL, 0.38), 0.096, 0.096, 0.088, 0.005, shortsMat);
      drawLoft(pose.hipR, mid3(pose.hipR, pose.kneeR, 0.38), 0.096, 0.096, 0.088, 0.005, shortsMat);

      const quadMat = this.getMaterialParams('quads', pose.activeMuscles, repT);
      const hamMat = this.getMaterialParams('hamstrings', pose.activeMuscles, repT);
      const calfMat = this.getMaterialParams('calves', pose.activeMuscles, repT);

      [
        { hip: pose.hipL, knee: pose.kneeL, ankle: pose.ankleL, toe: pose.toeL },
        { hip: pose.hipR, knee: pose.kneeR, ankle: pose.ankleR, toe: pose.toeR }
      ].forEach(({ hip, knee, ankle, toe }) => {
        const legAxis = norm3(sub3(knee, hip));
        const legFront = norm3(cross3(legAxis, vec3(0, 0, -1)));
        const thighStart = mid3(hip, knee, 0.25);

        drawLoft(hip, knee, 0.072, 0.072, 0.056, 0.01, neutralMat);
        drawLoft(
          add3(thighStart, scale3(legFront, 0.028)),
          add3(knee, scale3(legFront, 0.020)),
          0.064,
          0.068,
          0.048,
          0.022,
          quadMat
        );
        drawLoft(
          add3(thighStart, scale3(legFront, -0.032)),
          add3(knee, scale3(legFront, -0.020)),
          0.062,
          0.064,
          0.045,
          0.020,
          hamMat
        );
        drawLoft(knee, ankle, 0.056, 0.056, 0.038, 0.012, neutralMat);
        drawLoft(
          add3(knee, scale3(legFront, -0.022)),
          add3(mid3(knee, ankle, 0.65), scale3(legFront, -0.015)),
          0.048,
          0.054,
          0.035,
          0.022,
          calfMat
        );
        drawLoft(ankle, toe, 0.042, 0.046, 0.032, 0.008, neutralMat);
      });

      drawLoft(pose.pelvis, pose.waist, 0.105, 0.155, 0.115, 0.01, neutralMat);
      drawLoft(pose.waist, pose.chest, 0.115, 0.165, 0.132, 0.015, neutralMat);
      drawLoft(pose.chest, pose.neck, 0.128, 0.185, 0.068, 0.01, neutralMat);

      const sternalNotch = add3(mid3(pose.chest, pose.neck, 0.72), scale3(torsoFront, 0.075));
      drawLoft(sternalNotch, pose.shoulderL, 0.024, 0.024, 0.022, 0.0, neutralMat);
      drawLoft(sternalNotch, pose.shoulderR, 0.024, 0.024, 0.022, 0.0, neutralMat);

      const pecMat = this.getMaterialParams('pecs', pose.activeMuscles, repT);
      const sternumHigh = add3(mid3(pose.chest, pose.neck, 0.52), scale3(torsoFront, 0.088));
      const sternumMid = add3(pose.chest, scale3(torsoFront, 0.102));
      const sternumLow = add3(mid3(pose.waist, pose.chest, 0.68), scale3(torsoFront, 0.095));

      [
        { sh: pose.shoulderL, side: -1 },
        { sh: pose.shoulderR, side: 1 }
      ].forEach(({ sh, side }) => {
        const insertion = add3(
          mid3(pose.chest, sh, 0.78),
          add3(scale3(torsoFront, 0.052), vec3(0, 0, side * 0.02))
        );
        drawLoft(
          add3(sternumHigh, vec3(0, 0, side * 0.018)),
          insertion,
          0.048,
          0.042,
          0.038,
          0.016,
          pecMat
        );
        drawLoft(
          add3(sternumMid, vec3(0, 0, side * 0.018)),
          insertion,
          0.058,
          0.052,
          0.042,
          0.022,
          pecMat
        );
        drawLoft(
          add3(sternumLow, vec3(0, 0, side * 0.018)),
          insertion,
          0.048,
          0.045,
          0.036,
          0.018,
          pecMat
        );
      });

      const latMat = this.getMaterialParams('lats', pose.activeMuscles, repT);
      const upperBackMat = this.getMaterialParams('upperBack', pose.activeMuscles, repT);
      const lowerBackMat = this.getMaterialParams('lowerBack', pose.activeMuscles, repT);

      const backWaistL = add3(pose.waist, add3(scale3(torsoFront, -0.075), vec3(0, 0, -0.06)));
      const backWaistR = add3(pose.waist, add3(scale3(torsoFront, -0.075), vec3(0, 0, 0.06)));
      const axillaL = add3(mid3(pose.chest, pose.shoulderL, 0.72), scale3(torsoFront, -0.045));
      const axillaR = add3(mid3(pose.chest, pose.shoulderR, 0.72), scale3(torsoFront, -0.045));
      drawLoft(backWaistL, axillaL, 0.055, 0.065, 0.078, 0.02, latMat);
      drawLoft(backWaistR, axillaR, 0.055, 0.065, 0.078, 0.02, latMat);

      drawLoft(
        add3(pose.chest, scale3(torsoFront, -0.088)),
        add3(pose.neck, scale3(torsoFront, -0.068)),
        0.068,
        0.105,
        0.058,
        0.018,
        upperBackMat
      );
      drawLoft(
        add3(pose.pelvis, scale3(torsoFront, -0.075)),
        add3(pose.waist, scale3(torsoFront, -0.082)),
        0.058,
        0.085,
        0.062,
        0.015,
        lowerBackMat
      );

      drawLoft(pose.neck, mid3(pose.neck, pose.head, 0.55), 0.056, 0.058, 0.052, 0.005, neutralMat);

      const bicepMat = this.getMaterialParams('biceps', pose.activeMuscles, repT);
      const tricepMat = this.getMaterialParams('triceps', pose.activeMuscles, repT);
      const forearmMat = this.getMaterialParams('forearms', pose.activeMuscles, repT);

      [
        { sh: pose.shoulderL, el: pose.elbowL, wr: pose.wristL, side: -1 },
        { sh: pose.shoulderR, el: pose.elbowR, wr: pose.wristR, side: 1 }
      ].forEach(({ sh, el, wr, side }) => {
        const bicepOffset = add3(scale3(torsoFront, 0.022), vec3(0, 0, -side * 0.01));
        const tricepOffset = add3(scale3(torsoFront, -0.024), vec3(0, 0, side * 0.016));

        drawLoft(
          add3(sh, bicepOffset),
          add3(el, bicepOffset),
          0.044,
          0.044,
          0.038,
          0.018,
          bicepMat
        );
        drawLoft(
          add3(sh, tricepOffset),
          add3(el, tricepOffset),
          0.048,
          0.048,
          0.040,
          0.020,
          tricepMat
        );
        drawLoft(el, wr, 0.050, 0.046, 0.034, 0.014, forearmMat);
      });

      if (pose.props && pose.props.gobletDumbbell) {
        const g = pose.props.gobletDumbbell;
        drawLoft(g.bottom, g.top, 0.020, 0.020, 0.020, 0, chromeMat);
      }
      if (pose.props && pose.props.pairDumbbells) {
        const pd = pose.props.pairDumbbells;
        const ax = scale3(pd.axis, 0.13);
        ['leftCenter', 'rightCenter'].forEach((k) => {
          const c = pd[k];
          drawLoft(sub3(c, ax), add3(c, ax), 0.019, 0.019, 0.019, 0, chromeMat);
        });
      }
      if (pose.props && pose.props.pullUpBar) {
        drawLoft(vec3(0, 1.98, -0.58), vec3(0, 1.98, 0.58), 0.022, 0.022, 0.022, 0, chromeMat);
        drawLoft(vec3(0, 0.0, -0.56), vec3(0, 1.98, -0.56), 0.028, 0.028, 0.028, 0, ironMat);
        drawLoft(vec3(0, 0.0, 0.56), vec3(0, 1.98, 0.56), 0.028, 0.028, 0.028, 0, ironMat);
      }
      if (pose.props && pose.props.barbell) {
        const bb = pose.props.barbell;
        const hw = bb.halfWidth || 0.75;
        drawLoft(
          vec3(bb.center.x, bb.center.y, -hw),
          vec3(bb.center.x, bb.center.y, hw),
          0.018,
          0.018,
          0.018,
          0,
          chromeMat
        );
      }
      if (pose.props && pose.props.kettlebell) {
        const kb = pose.props.kettlebell.pos;
        drawLoft(vec3(kb.x, kb.y + 0.09, -0.065), vec3(kb.x, kb.y + 0.09, 0.065), 0.016, 0.016, 0.016, 0, chromeMat);
        drawLoft(vec3(kb.x, kb.y + 0.01, -0.055), vec3(kb.x, kb.y + 0.09, -0.065), 0.015, 0.015, 0.015, 0, chromeMat);
        drawLoft(vec3(kb.x, kb.y + 0.01, 0.055), vec3(kb.x, kb.y + 0.09, 0.065), 0.015, 0.015, 0.015, 0, chromeMat);
      }
      if (pose.props && pose.props.dipBars) {
        drawLoft(vec3(-0.35, 0.94, -0.28), vec3(0.35, 0.94, -0.28), 0.022, 0.022, 0.022, 0, chromeMat);
        drawLoft(vec3(-0.35, 0.94, 0.28), vec3(0.35, 0.94, 0.28), 0.022, 0.022, 0.022, 0, chromeMat);
        drawLoft(vec3(-0.30, 0.0, -0.28), vec3(-0.30, 0.94, -0.28), 0.026, 0.026, 0.026, 0, ironMat);
        drawLoft(vec3(-0.30, 0.0, 0.28), vec3(-0.30, 0.94, 0.28), 0.026, 0.026, 0.026, 0, ironMat);
      }
      if (pose.props && pose.props.cableRig) {
        const cr = pose.props.cableRig;
        drawLoft(vec3(cr.anchor.x, 0.0, 0), vec3(cr.anchor.x, 1.95, 0), 0.032, 0.032, 0.032, 0, ironMat);
        drawLoft(cr.anchor, cr.handL, 0.008, 0.008, 0.008, 0, chromeMat);
        drawLoft(cr.anchor, cr.handR, 0.008, 0.008, 0.008, 0, chromeMat);
      }

      bindMesh(unitBuffers.sphere);

      drawEllipsoid(pose.head, torsoFront, spineUp, torsoRight, 0.105, 0.132, 0.092, neutralMat);

      const coreMat = this.getMaterialParams('core', pose.activeMuscles, repT);
      [0.24, 0.46, 0.68].forEach((t) => {
        const rowCenter = add3(mid3(pose.pelvis, pose.chest, t), scale3(torsoFront, 0.088));
        drawEllipsoid(
          add3(rowCenter, vec3(0, 0, -0.038)),
          torsoFront,
          spineUp,
          torsoRight,
          0.036,
          0.034,
          0.036,
          coreMat
        );
        drawEllipsoid(
          add3(rowCenter, vec3(0, 0, 0.038)),
          torsoFront,
          spineUp,
          torsoRight,
          0.036,
          0.034,
          0.036,
          coreMat
        );
      });

      const fDeltMat = this.getMaterialParams('frontDelts', pose.activeMuscles, repT);
      const sDeltMat = this.getMaterialParams('sideDelts', pose.activeMuscles, repT);
      const rDeltMat = this.getMaterialParams('rearDelts', pose.activeMuscles, repT);

      [
        { sh: pose.shoulderL, side: -1 },
        { sh: pose.shoulderR, side: 1 }
      ].forEach(({ sh, side }) => {
        drawEllipsoid(
          add3(sh, scale3(torsoFront, 0.036)),
          torsoFront,
          spineUp,
          torsoRight,
          0.056,
          0.064,
          0.052,
          fDeltMat
        );
        drawEllipsoid(
          add3(sh, vec3(0, 0, side * 0.038)),
          torsoFront,
          spineUp,
          torsoRight,
          0.054,
          0.068,
          0.056,
          sDeltMat
        );
        drawEllipsoid(
          add3(sh, scale3(torsoFront, -0.036)),
          torsoFront,
          spineUp,
          torsoRight,
          0.054,
          0.062,
          0.052,
          rDeltMat
        );
      });

      const gluteMat = this.getMaterialParams('glutes', pose.activeMuscles, repT);
      drawEllipsoid(
        add3(pose.hipL, scale3(torsoFront, -0.058)),
        torsoFront,
        spineUp,
        torsoRight,
        0.088,
        0.095,
        0.085,
        gluteMat
      );
      drawEllipsoid(
        add3(pose.hipR, scale3(torsoFront, -0.058)),
        torsoFront,
        spineUp,
        torsoRight,
        0.088,
        0.095,
        0.085,
        gluteMat
      );

      drawEllipsoid(pose.wristL, vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1), 0.042, 0.046, 0.038, neutralMat);
      drawEllipsoid(pose.wristR, vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1), 0.042, 0.046, 0.038, neutralMat);

      const drawDumbbellPlates = (pA, pB, radius) => {
        const dir = norm3(sub3(pB, pA));
        const ref = Math.abs(dir.y) > 0.9 ? vec3(1, 0, 0) : vec3(0, 1, 0);
        const u = norm3(cross3(ref, dir));
        const v = norm3(cross3(dir, u));

        [
          { pt: add3(pA, scale3(dir, 0.028)), r: radius, w: 0.016 },
          { pt: add3(pA, scale3(dir, 0.006)), r: radius * 0.88, w: 0.014 },
          { pt: sub3(pB, scale3(dir, 0.028)), r: radius, w: 0.016 },
          { pt: sub3(pB, scale3(dir, 0.006)), r: radius * 0.88, w: 0.014 }
        ].forEach((plate) => {
          drawEllipsoid(plate.pt, u, dir, v, plate.r, plate.w, plate.r, ironMat);
        });
      };

      if (pose.props && pose.props.gobletDumbbell) {
        const g = pose.props.gobletDumbbell;
        drawDumbbellPlates(g.bottom, g.top, 0.092);
      }
      if (pose.props && pose.props.pairDumbbells) {
        const pd = pose.props.pairDumbbells;
        const ax = scale3(pd.axis, 0.13);
        ['leftCenter', 'rightCenter'].forEach((k) => {
          const c = pd[k];
          drawDumbbellPlates(sub3(c, ax), add3(c, ax), 0.084);
        });
      }
      if (pose.props && pose.props.barbell) {
        const bb = pose.props.barbell;
        const hw = bb.halfWidth || 0.75;
        drawDumbbellPlates(
          vec3(bb.center.x, bb.center.y, -hw * 0.76),
          vec3(bb.center.x, bb.center.y, hw * 0.76),
          0.165
        );
      }
      if (pose.props && pose.props.kettlebell) {
        const kb = pose.props.kettlebell.pos;
        drawEllipsoid(vec3(kb.x, kb.y - 0.02, kb.z), vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1), 0.105, 0.105, 0.105, ironMat);
      }
      if (pose.props && pose.props.medBall) {
        const mb = pose.props.medBall.center;
        drawEllipsoid(mb, vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1), 0.145, 0.145, 0.145, ironMat);
      }
    }

    /**
     * Uncrowded Top Muscle Map Indicator:
     * - On compact cards (!isModal): Renders a single compact active-muscle badge in the top-left corner (34x32px)
     *   so it NEVER collides with "⤢ 360° Studio" on the right or with the 3D athlete in the center!
     * - In the spacious 360° Studio Modal (isModal): Renders the 3-panel bar cleanly at top-center.
     */
    drawTopGlassMuscleHUD(ctx, W, H, targetRegion, repT, isModal) {
      ctx.save();

      if (!isModal) {
        // Compact Single Badge in Top-Left Corner (zero crowding!)
        const boxX = 6;
        const boxY = 6;
        const boxW = 36;
        const boxH = 34;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
        ctx.strokeStyle = '#22c55e';
        ctx.shadowColor = 'rgba(34, 197, 94, 0.45)';
        ctx.shadowBlur = 5;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 7);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        this.drawMiniTorsoIcon(ctx, boxX + boxW * 0.5, boxY + boxH * 0.52, true, targetRegion, repT, 0.84);
        ctx.restore();
        return;
      }

      // In Full 360° Studio Modal: Clean 3-panel bar at top-center (with no overlapping text pills)
      const barW = 148;
      const barH = 38;
      const barX = (W - barW) * 0.5;
      const barY = 8;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 8);
      ctx.fill();
      ctx.stroke();

      const slotW = barW / 3;
      const slots = [
        { mode: 'front_dim', cx: barX + slotW * 0.5 },
        { mode: 'active_green', cx: barX + slotW * 1.5 },
        { mode: 'back_dim', cx: barX + slotW * 2.5 }
      ];

      slots.forEach((slot) => {
        if (slot.mode === 'active_green') {
          ctx.save();
          ctx.strokeStyle = '#22c55e';
          ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = 6;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(slot.cx - slotW * 0.44, barY - 1.5, slotW * 0.88, barH + 3, 6);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        this.drawMiniTorsoIcon(
          ctx,
          slot.cx,
          barY + barH * 0.52,
          slot.mode === 'active_green',
          targetRegion,
          repT,
          0.88
        );
      });

      ctx.restore();
    }

    drawMiniTorsoIcon(ctx, cx, cy, isHighlighted, targetRegion, repT, scaleFactor = 1.0) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scaleFactor, scaleFactor);

      ctx.fillStyle = isHighlighted ? '#cbd5e1' : 'rgba(148, 163, 184, 0.42)';
      ctx.fillRect(-2.5, -14, 5, 3.5);
      ctx.beginPath();
      ctx.roundRect(-10.5, -10.5, 21, 8.5, 3);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-7, -1.5, 14, 12, 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-10.5, -8.5);
      ctx.lineTo(-14.5, 5.5);
      ctx.moveTo(10.5, -8.5);
      ctx.lineTo(14.5, 5.5);
      ctx.stroke();

      if (isHighlighted) {
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 4 + 2 * repT;

        if (targetRegion === 'chest_front') {
          ctx.beginPath();
          ctx.roundRect(-9, -9.5, 8.3, 7, 2.5);
          ctx.roundRect(0.7, -9.5, 8.3, 7, 2.5);
          ctx.fill();
        } else if (targetRegion === 'shoulders_front') {
          ctx.beginPath();
          ctx.arc(-10.5, -7.5, 4, 0, Math.PI * 2);
          ctx.arc(10.5, -7.5, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (targetRegion === 'back_posterior') {
          ctx.beginPath();
          ctx.moveTo(-9.5, -9.5);
          ctx.lineTo(9.5, -9.5);
          ctx.lineTo(5.5, 4.5);
          ctx.lineTo(-5.5, 4.5);
          ctx.closePath();
          ctx.fill();
        } else if (targetRegion === 'core_front') {
          ctx.beginPath();
          ctx.roundRect(-5, -1, 10, 10, 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.roundRect(-7.5, 2.5, 6, 10, 2);
          ctx.roundRect(1.5, 2.5, 6, 10, 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    drawViewportHUD(ctx, W, H, phaseName) {
      const deg = Math.round(((this.yaw % 360) + 360) % 360);
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.38)';
      ctx.lineWidth = 1;
      const badgeW = Math.min(W - 14, 148);
      ctx.beginPath();
      ctx.roundRect(6, H - 22, badgeW, 16, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#2dd4bf';
      ctx.font = '700 8.5px "Inter", sans-serif';
      ctx.fillText(`${phaseName} · ${deg}°`, 11, H - 11);
      ctx.restore();
    }
  }

  /* ==========================================================================
     Global Animation Loop Manager for All Active 3D Viewers
     ========================================================================== */
  const activeViewers = new Map();
  let lastFrameTime = performance.now();

  function tickAllViewers(now) {
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    const winH = window.innerHeight || 900;
    activeViewers.forEach((viewer, canvas) => {
      if (!document.body.contains(canvas)) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (rect.bottom < -60 || rect.top > winH + 60) return;
      viewer.renderFrame(dt);
    });

    requestAnimationFrame(tickAllViewers);
  }

  requestAnimationFrame(tickAllViewers);

  window.PulseLift3D = {
    createViewer(canvasId, exerciseId, options) {
      const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
      if (!canvas) return null;
      const viewer = new Anatomical3DViewer(canvas, exerciseId, options);
      activeViewers.set(canvas, viewer);
      return viewer;
    },
    destroyAllCardViewers() {
      for (const [canvas] of activeViewers.entries()) {
        if (!canvas.dataset.modalViewer && !canvas.dataset.libraryViewer && !canvas.dataset.filterMannequin) {
          activeViewers.delete(canvas);
        }
      }
    },
    destroyLibraryViewers() {
      for (const [canvas] of activeViewers.entries()) {
        if (canvas.dataset.libraryViewer) {
          activeViewers.delete(canvas);
        }
      }
    },
    removeViewer(canvas) {
      activeViewers.delete(canvas);
    },
    getViewer(canvas) {
      return activeViewers.get(canvas);
    }
  };
})();
