## DEV

Commit: 18e1370

Summary:
- Replaced the single camera trigger with auto-named multi-point detection panels.
- Moved webcam controls above the video, merged start/stop into one icon button, added refresh icon and FPS readout.
- Added sound functions, direct on/off point actions, and a transition-driven script evaluator for `ONACTION` rules.
- Recalibrated Lab sensitivity max distance to the in-app RGB conversion range and added the requested high-end regression.
- Migrated old single-point persisted state into `point1` and updated docs/tests.

Verification:
- `npm run test --workspace front -- camera` passed: 6 files, 31 tests.
- `npm run test` passed: backend 5 tests, frontend 36 tests.
- `npm run build` passed.
- `npm run lint` passed.

Notes for TEST:
- Prior Lab max-distance feedback is addressed in `front/src/lib/camera/detection.ts` and `detection.test.ts`.
- Please focus review on multi-point sampling, point state migration, transition action ordering, and script validation/evaluation.
- V1 implements sound functions only; screenshot functions are intentionally deferred.
- Vitest still prints the existing `--localstorage-file` warning in this environment, but tests pass.
