## DEV

Commit: 9406784

Summary:
- Fixed visible camera preview remounts by attaching an existing shared stream after `CameraDetector` mounts.
- Fixed failed camera switches by stopping and clearing the stale existing stream before recording the camera error.
- Added regression coverage for both TEST findings.

Verification:
- `npm run test --workspace front` passed: frontend 18 tests.
- `npm run test` passed: backend 5 tests, frontend 18 tests.
- `npm run build` passed.
- `npm run lint` passed.

Notes for TEST:
- Please review commit `9406784`.
- Vitest still prints the existing `--localstorage-file` warning in this environment, but tests pass.
