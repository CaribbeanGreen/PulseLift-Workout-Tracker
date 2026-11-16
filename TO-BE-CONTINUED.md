# To be continued — human-model update

Last updated: 16 November 2026. Branch: `feature/human-model` (not complete; do not merge into `main`).

## Done

- Proposal agreed in outline. **Decision: smooth grey faceless mannequin** (not the skinless anatomy figure).
- Snapshot of v19: `docs/snapshot-v19-2026-11-16/` (screenshots of every view, capture script).
- Detailed report: `docs/REPORT.md` (current code, problems found, proposed update).

## Not done

- **Prototype (next step).** Nothing has been built yet. No app code has changed; `main` and this branch have identical app files.
- Scope question still open: all 165 exercises at launch, or a core set of 30–40 first (recommended).

## Next step: the prototype

One exercise — dumbbell bench press — in a standalone page at `prototype/index.html`, leaving the existing app untouched. The user judges the look before anything else is built.

Must show:

1. Rigged grey mannequin lying on a flat bench, pressing two dumbbells, looping.
2. Heat glow on the skin: pectorals strong; front delts and triceps fainter.
3. Phase scrubber (setup, lower, bottom, press) with a cue per phase; play/pause; half speed.
4. Right/wrong toggle: elbows flared to 90° versus tucked to about 45°, wrong version marked in red.
5. Camera presets (three-quarter, side, front, top) and drag to rotate.
6. Joint callouts pinned to the body; breathing/tempo indicator.
7. Works at phone width.

### Technical plan (so a new session can start straight away)

- Three.js r170 as ES modules through an import map (jsDelivr): `three`, `GLTFLoader`, `OrbitControls`, `RoomEnvironment`.
- Model: `Xbot.glb` from the Three.js examples (Mixamo skeleton, bone names like `mixamorigLeftArm`). Check the names and that it loads in T-pose before relying on them. Licence to be confirmed before any public launch.
- Lay the body down by rotating the model root −90° about X (head toward −Z, feet +Z, face up). Measure the back's depth from the mesh to rest it on the bench top.
- Arms and legs: analytic two-bone IK. Compute the elbow/knee from the end target and a pole direction, then set each bone's world orientation by mapping its rest frame (bone axis + hinge axis) onto the target frame (bone direction + `upper × lower`). Rest hinge axes in character space: left arm −Y, right arm +Y, legs +X. This keeps the palm facing the feet for a press with no forearm twist.
- Bench press path: bottom = elbow 45° from the torso and about 15° below shoulder level with the forearm vertical; top = wrists over shoulders, reach limited to 98.5% so the elbow never locks. Wrong-form mode uses a 90° pole.
- Dumbbells follow the hand bone each frame (palm centre, handle across the palm); fingers curled around the handle.
- Muscle glow: per-vertex weights computed once in the rest pose from ellipsoid/capsule regions anchored to bone positions (pecs, front delts, triceps), filtered by surface normal. Stored as a vertex attribute; shader added to `MeshStandardMaterial` through `onBeforeCompile`, with a rim light.
- Existing pose builders in `anatomical3d.js` return joint positions per rep fraction, so step 2 (engine swap) can feed them into the same IK.

## Running locally

```bash
python server.py 8765
```

Then open `http://localhost:8765/`. The prototype will be at `http://localhost:8765/prototype/`.

## Notes

- The working copy is `D:\CODES\workout-tracker` (not a git folder). The GitHub clone is `C:\Users\Administrator\GitHub\PulseLift-Workout-Tracker`. Copy changes across before committing.
- `workout-backup.json` and `backups/` are personal data and are git-ignored. Screenshots that show logged history are kept out of the repository for the same reason.
- Opening the app rewrites `workout-backup.json` (start-up sync). History content is preserved.
- Changes are tried locally first and pushed only to this branch, never straight to `main`.
