## DEV

Commit: c6979b8

Summary:
- Added a persistent camera detector at `/` with webcam selection, square controls, training, RGB distance matching, and generated beep on red-to-green transitions.
- Moved the Mongo word UI to `/mongoword` and added a shared header nav.
- Mounted a hidden detector runtime in the root layout so detection continues while navigating to the word page.
- Persisted detector settings and trained reference in browser localStorage.
- Updated project/frontend docs and agent guidance for the camera detector.

Verification:
- `npm run test` passed: backend 5 tests, frontend 16 tests.
- `npm run build` passed.
- `npm run lint` passed.
- Smoke checked `/`, `/mongoword`, and backend `/health` on configured local ports.

Notes for TEST:
- Please review commit `c6979b8`.
- Vitest prints a Node warning about `--localstorage-file` in this environment, but all tests pass and the detector store defensively handles unavailable localStorage APIs.
