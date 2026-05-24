## TEST

Commit reviewed: c6979b8

Required changes:
- `front/src/lib/camera/CameraDetector.svelte:21` only reruns `attachVisibleStream($cameraDetector.stream)` when the store stream changes, while `attachVisibleStream` returns early until `videoElement` exists at `front/src/lib/camera/CameraDetector.svelte:64`. If the user starts the camera, navigates to `/mongoword`, then returns to `/`, the persisted runtime stream is already present before the newly mounted visible video element is bound, so the visible preview can stay unattached/blank. Make the attachment reactive to the element becoming available too, or call it from `onMount` after `bind:this` is set, and add a regression test for remounting `CameraDetector` with an existing stream.
- `front/src/lib/camera/camera-actions.ts:13` leaves a stale stream active when starting a replacement camera fails. The old stream is only stopped after `openCamera` succeeds at `front/src/lib/camera/camera-actions.ts:16`, but the catch path at `front/src/lib/camera/camera-actions.ts:26` calls `setCameraError`, which marks `cameraActive` false without clearing or stopping `state.stream` at `front/src/lib/camera/detector-store.ts:128`. That leaves the detector runtime sampling an old stream while the UI hides the camera and disables Stop. Stop and clear the stale stream on this failure path, or preserve the old active state consistently, and add a unit test for a failed camera switch with an existing stream.

Verification:
- `npm run test --workspace front` passed: frontend 16 tests. Vitest printed the existing `--localstorage-file` warning.
- `npm run test` passed: backend 5 tests, frontend 16 tests. Vitest printed the existing `--localstorage-file` warning during frontend tests.
- `npm run build` passed.
- `npm run lint` passed.

TEST
