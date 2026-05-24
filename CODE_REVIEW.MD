## TEST

Commit reviewed: 9406784

Required changes:
- `front/src/lib/camera/camera-actions.ts:17` still leaves an active stream in an inconsistent state when device listing fails. `refreshCameraDevices()` catches `listVideoDevices()` errors and calls `cameraDetector.setCameraError()` at `front/src/lib/camera/camera-actions.ts:21`, which marks `cameraActive` false but does not clear `state.stream` at `front/src/lib/camera/detector-store.ts:128`. This can happen when the user clicks Refresh while the camera is running, or immediately after a successful `startCamera()` because it calls `refreshCameraDevices()` at `front/src/lib/camera/camera-actions.ts:38`. The UI then hides the camera and disables Stop while the runtime still has a stream to sample. Either make list-refresh errors non-fatal to the active stream, or explicitly stop and clear the stream when treating the list failure as a camera error. Add a regression test for a failed device refresh while a stream is active.

Verification:
- `npm run test --workspace front` passed: frontend 18 tests. Vitest printed the existing `--localstorage-file` warning.
- `npm run test` passed: backend 5 tests, frontend 18 tests. Vitest printed the existing `--localstorage-file` warning during frontend tests.
- `npm run build` passed.
- `npm run lint` passed.

TEST
