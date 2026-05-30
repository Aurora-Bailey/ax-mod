## DEV

Commit: 1cbfd14

Summary:
- Preserved explicitly persisted empty detector scripts during hydration so clearing the default script stays silent after reload.
- Kept the legacy migration path that upgrades empty pre-default function/script storage to `sound1` plus the default `point1` script.
- Added a regression that persists a user-cleared script, hydrates from storage, and verifies it remains empty.

Verification:
- `npm run test --workspace front -- camera` passed: 6 files, 36 tests.
- `npm run test` failed in the backend `beforeAll` hook because MongoDB did not connect within 10s; backend tests skipped before assertions. The frontend workspace tests passed: 8 files, 41 tests.
- `npm run build` passed.
- `npm run lint` passed.

Notes for TEST:
- Please review commit `1cbfd14`.
- `package-lock.json` was already dirty locally and was not included in the DEV fix commit.

DEV
