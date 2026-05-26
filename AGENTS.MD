# Project Brain

This file is the first source of truth for Codex agents working in this repository. Read it before reading role-specific files.

## Product Goal

Build a small full-stack app with two frontend tools:

- The camera detector samples configurable detection points from a selected webcam, trains Lab references from averaged RGB samples, and reports each point as on or off.
- The Mongo word page asks the user for a word, sends it to the backend, stores it in local MongoDB, and displays saved words one at a time.

Keep the app simple, tested, and easy to extend.

## Architecture

- Root package uses npm workspaces.
- `front/` is a SvelteKit TypeScript app.
- `back/` is a Fastify TypeScript API.
- MongoDB runs locally.
- Backend is the only layer that talks to MongoDB.
- Frontend talks to backend over HTTP.
- Camera detection is frontend-only and browser-local.
- Persistent camera settings, detection points, functions, and scripts use browser localStorage.

## Required Read Order

1. `AGENTS.MD`
2. Role file:
   - DEV reads `DEV_AGENT.MD`
   - TEST reads `TEST_AGENT.MD`
3. Technical docs:
   - Backend: `back/README.MD`
   - Frontend: `front/README`
4. Current review state: `CODE_REVIEW.MD`
5. Relevant source and tests

## Engineering Standards

- Prefer small, direct changes.
- Keep backend validation close to the route boundary.
- Keep database access behind a repository-style interface.
- Keep frontend API calls in `front/src/lib/api.ts`.
- Keep camera detection math in pure frontend modules where possible.
- Keep browser camera and audio APIs isolated from pure tests.
- Preserve TypeScript strictness.
- Do not bypass tests to make a change look complete.
- Do not add large frameworks or global state until the product needs them.
- Do not store generated build output in git.

## Testing Standards

- Unit tests are required for changed behavior.
- Backend tests use Vitest and a dedicated local MongoDB test database.
- Frontend tests use Vitest and Svelte testing utilities.
- Run the narrowest useful test first, then run the workspace-level test command before pushing.

Expected verification before a DEV push:

```sh
npm run test
npm run build
```

## Git Rules

- Agents may use git freely for normal development:
  - `git status`
  - `git diff`
  - `git add`
  - `git commit`
  - `git push`
- Commit messages should be short and specific.
- Never rewrite shared history unless the user explicitly asks.
- Never revert another agent's work unless the review loop requires it and the reason is recorded.

## Review Loop

`CODE_REVIEW.MD` is the handoff file between DEV and TEST.

- DEV is the agent that writes code.
- TEST is the agent that reviews code.
- DEV comments must be signed `DEV`.
- TEST comments must be signed `TEST`.
- TEST should write actionable review notes after inspecting the latest pushed commit.
- DEV should fix actionable TEST notes, commit, push, and record what changed.
- When TEST agrees the work meets criteria, TEST replaces the file contents with exactly:

```md
## No comment
```

Do not add signatures, whitespace notes, or historical review logs when the file is cleared.

## Definition of Done

A change is done when:

- The intended behavior works.
- Relevant tests pass.
- The app builds.
- Documentation reflects how to run and maintain the feature.
- DEV has pushed the commit.
- TEST has either added actionable review notes or cleared `CODE_REVIEW.MD`.
