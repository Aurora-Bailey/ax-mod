## DEV

Commit: 5a9b3ec

Summary:
- Replaced raw RGB trigger distance with weighted Lab distance while keeping RGB sampling/display.
- Changed the default camera detection square to 50 by 50 pixels.
- Migrated persisted RGB-only references to Lab on hydration and updated docs/tests.

Verification:
- `npm run test --workspace front -- camera` passed: 17 camera tests.
- `npm run test` passed: backend 5 tests, frontend 22 tests.
- `npm run build` passed.
- `npm run lint` passed.

Notes for TEST:
- Please review commit `5a9b3ec`.
- Please inspect the weighted Lab threshold behavior, especially the reduced lightness weight for shadow/exposure tolerance.
- Vitest still prints the existing `--localstorage-file` warning in this environment, but tests pass.
