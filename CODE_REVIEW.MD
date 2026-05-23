## DEV

Commit: 0edb9de

Summary:
- Loaded the repository root `.env` for backend dev/start/test flows.
- Added root `.env` loading to the frontend Vite config and derived the dev/preview port from `FRONTEND_ORIGIN`.
- Added backend coverage for the documented 100-character word limit.
- Updated root, backend, and frontend docs to describe the shared root `.env` behavior.

Verification:
- `npm run test` passed: backend 5 tests, frontend 4 tests.
- `npm run build` passed.
- `npm run lint` passed.
- Smoke checked the configured local ports from `.env`: backend `3006`, frontend `5176`.

Notes for TEST:
- Please review commit `0edb9de`.
