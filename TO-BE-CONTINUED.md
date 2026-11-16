# To be continued — human-model update

Last updated: 16 November 2026. Branch: `feature/human-model` (not complete; do not merge into `main`).

## Done

- Proposal agreed in outline. **Decision: smooth grey faceless mannequin** (not the skinless anatomy figure).
- Snapshot of v19: `docs/snapshot-v19-2026-11-16/` (screenshots of every view, capture script).
- Detailed report: `docs/REPORT.md` (current code, problems found, proposed update).

## Prototype (built 16 November 2026, awaiting review)

`prototype/index.html`, `proto.css`, `proto.js` — a standalone page; the existing app is untouched.

Working and checked in the browser:

- Rigged muscular mannequin lying on a bench, pressing two dumbbells.
- Heat glow on pectorals (strong), front delts and triceps (fainter); tap a muscle chip to isolate it.
- Four phases with cues, scrubber, play/pause, 1× / ½× / ¼× speed, breathing indicator.
- Correct form / common mistake toggle: elbows at 45° (green wedge) versus flared to 90° (red wedge and banner).
- Camera presets, drag to rotate, callouts pinned to the body.
- Phone width (375 px): no sideways overflow.

Character setting (added 16 November 2026):

- The side panel has a **Character** selector, remembered in `localStorage` (`pulselift_character`); `?character=<id>` overrides it.
- `human` (default) and `mannequin` (X Bot, loaded from the Three.js CDN) are built in (`CHARACTERS` in `proto.js`).
- Extra characters are MMD `.pmx` files listed in `prototype/models/zzz/manifest.json`. 71 Zenless Zone Zero models are installed (versions 1.1 to 3.2, including alternate outfits), downloaded on 16 November 2026 from the official Bilibili creator pages. All were load-tested. Not installed: the 1.0 launch page is empty; Remielle (3.1) was unpacked by the user and added afterwards as six entries (white, black, swimsuit, each with and without wings), bringing the total to 71. Pan Yinhu loads but his proportions do not suit the pose. Original archives are kept in `_zips/` (about 1 GB) and can be deleted. `boneOpt` maps Mixamo, Unreal and MMD bone names; legs use the MMD "D" bones.
- **`prototype/models/zzz/` is local-only.** The models are miHoYo's, not open source: their readme forbids redistribution and commercial use. Never commit that folder or serve it from a public site. Add `prototype/models/zzz/` to `.gitignore` in the GitHub clone before copying the prototype across.
- Game characters get no muscle glow (they keep their own materials), and hair, coats and skirts stay rigid because there is no cloth simulation.

Liveliness layer (added 16 November 2026, "Lively" checkbox in the stage, on by default):

- A set is 10 reps; fatigue rises from rep 1 to rep 10 (`live` in `proto.js`), then the set restarts.
- Breathing moves the chest bone; tired reps slow down, one arm lags, both arms tremble, and rep 10 nearly stalls halfway.
- Game characters use their built-in face shapes (`FACE_MORPHS`): strain and gritted teeth on the press, panting, blinking, a happy face after the last rep. The Human and Mannequin have no face shapes.
- Sweat droplets appear on the face as fatigue rises, slide and drip (`pickSweatAnchors`, `updateSweat`). On game models they are placed on the face material so they avoid the hair.
- Game-model colours were washed out because the loader adds each material's ambient colour as a flat glow. `fixToonMaterials` zeroes it, skips tone mapping and adds a white ambient light instead.
- **Rebuilt after researching how the game animates** (hand-keyed poses, follow-through, clear silhouettes, personality, camera as a "second animator"; main source: GCORES interview with the action-design lead, https://www.gcores.com/articles/209117):
  - The rep is now key poses with easing (`STYLES[...].lift` via `makeTrack`): anticipation dips before lowering and before the press, overshoot at the bottom and at lockout.
  - Follow-through springs (`spring`, `kick`, `onBeat`): chest, head, dumbbell wobble and knee flare arrive late and settle after each beat of the rep.
  - Four movement styles: Steady (textbook), Powerhouse, Clumsy, Sleepy. "Auto" picks one per game character from its id; the Human and Mannequin use Steady. Stored in `localStorage` (`pulselift_style`), `?style=` overrides.
  - Cinematic camera (`applyCineCamera`, "Camera" checkbox): leans in with effort, shakes on hard reps, closes in on the face when rep 10 stalls, pulls back at the finish. It is applied for the render only, on top of the user's camera.
  - Rep counter pops on each rep; rep 10 lockout freezes briefly and shows "Set complete".
- **Physics (added 16 November 2026, "Physics" checkbox, game models only):** each model's own rigid bodies and joints, simulated with ammo.js through Three.js `MMDPhysics` (`setupPhysics` in `proto.js`). Tested on Claret (741 bodies, about 8 ms per step on this PC), Yanagi and Zhao.
  - Gravity is turned into the model's own space so "down" matches the body lying on the bench; the bench is a static box so hair and cloth rest on it.
  - `MMDPhysics` must be constructed with the mesh detached, unscaled and in its rest pose, then `reset()` after posing. Building it on the posed, scaled mesh makes sleeves and skirts fly apart.
  - "Hair and cloth movement" slider (`phys.amount`, default 30%, stored as `pulselift_physics_amount`, `?hair=` overrides). The user found full real-world physics unnatural: with the body lying down, every strand hangs straight off the bench. Below 100% gravity leans toward the direction the model was styled for and the simulated bones are blended back toward their rest shape (`physicsGravity`, `stepPhysics`), leaving a light sway.
  - Characters under 1.52 m keep chest and hip soft-body parts rigid (`SMALL_CHARACTER_HEIGHT`).
  - Ammo loads from a CDN; vendor it for offline or NAS use.
- Not done: full goofy animations (celebrations and the like), per-character style assignment by personality, and checking physics on the other 68 characters.

Known limits:

- **Model changed to a muscular human figure**: "Superhero Male" from Quaternius's Universal Base Characters pack (CC0, https://quaternius.com/packs/universalbasecharacters.html). Hair, brows and eyes are hidden, the skin is grey, shorts are drawn in the shader. The first attempt used the robot-style X Bot, which the user rejected as "a puppet with no muscles".
- Muscles are now drawn per pixel in the shader from rest-pose position (`pecMuscle`, `deltMuscle`, `triMuscle` in `proto.js`; outline numbers in `MUSCLE`), so outlines are sharp and fibres are visible.
- The model files are stored in `prototype/models/superhero-male/` (mesh, binary and normal map, about 5 MB), copied from a public GitHub mirror of the CC0 pack; see `SOURCE.md` there.
- Three.js also loads from a CDN, so the prototype needs internet. Vendor it locally before launch.
- Smooth real-time playback was not timed (the test browser ran in the background). Each frame was verified step by step.
- The grip is approximate: fingers curl round the handle but the thumb does not wrap fully.
- Form notes are not yet reviewed by a trainer.

## Not done

- Decision on the final mannequin model.
- Scope: all 165 exercises at launch, or a core set of 30–40 first (recommended).
- Step 2 onward in `docs/REPORT.md`: convert the existing pose builders, form layer for every exercise, site restructure.

### How the prototype works (for the next session)

- Body laid down by rotating the model root −90° about X; back depth measured from the mesh so it rests on the bench.
- Arms and legs: analytic two-bone IK, then each bone's world orientation is set by mapping its rest frame (bone axis + hinge axis) onto the target frame (`aimLimb` in `proto.js`). Rest hinge axes in character space: left arm −Y, right arm +Y, legs +X.
- Elbow angle is measured from the torso line: pole = lateral·sin θ + feet·cos θ (45° correct, 88° mistake).
- Muscle glow: per-vertex weights computed once in the rest pose (`computeMuscleWeights`), blended in the shader through `onBeforeCompile`.
- `?debug=tpose` shows the standing rest pose with all muscles lit, for tuning muscle regions.
- The existing pose builders in `anatomical3d.js` return joint positions per rep fraction and can feed the same IK.

## Running locally

```bash
python server.py 8765
```

Then open `http://localhost:8765/`. The prototype is at `http://localhost:8765/prototype/`.

## Notes

- The working copy is `D:\CODES\workout-tracker` (not a git folder). The GitHub clone is `C:\Users\Administrator\GitHub\PulseLift-Workout-Tracker`. Copy changes across before committing.
- `workout-backup.json` and `backups/` are personal data and are git-ignored. Screenshots that show logged history are kept out of the repository for the same reason.
- Opening the app rewrites `workout-backup.json` (start-up sync). History content is preserved.
- Changes are tried locally first and pushed only to this branch, never straight to `main`.
