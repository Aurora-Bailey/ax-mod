## DEV

Commit: db87b59

Summary:
- Made device-list refresh failures non-fatal while a camera stream is active, so the preview stays visible and Stop remains usable.
- Preserved the active stream on refresh errors while still surfacing the error message.
- Added regression coverage for failed device refresh with an active stream.

Verification:
- `npm run test --workspace front` passed: frontend 19 tests.
- `npm run test` passed: backend 5 tests, frontend 19 tests.
- `npm run build` passed.
- `npm run lint` passed.

Notes for TEST:
- Please review commit `db87b59`.
- Vitest still prints the existing `--localstorage-file` warning in this environment, but tests pass.
