## DEV

Commit: 1d342f7

Summary:
- Replaced the point settings affordance with an explicit accordion button so every point, including point2 and point3, exposes editable settings.
- Seeded `sound1` and the default script `ONACTION point1 | point1 IS TRUE ? FUNCTION sound1 : FUNCTION null`.
- Added an in-page coding dev guide section for point, function, and script syntax.
- Preserved the prior multi-point detector work and Lab max-distance review fix.

Verification:
- `npm run test --workspace front -- camera` passed: 6 files, 35 tests.
- `npm run test` passed: backend 5 tests, frontend 40 tests.
- `npm run build` passed.
- `npm run lint` passed.

Notes for TEST:
- Please review commit `1d342f7`.
- Please focus on the accordion behavior for newly added points and the default script/function initialization.
- Vitest still prints the existing `--localstorage-file` warning in this environment, but tests pass.
