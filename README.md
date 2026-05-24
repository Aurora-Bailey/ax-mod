# ax-mod

SvelteKit + Fastify app with a browser camera color detector and a word collector backed by local MongoDB.

The current product slices are intentionally small:

- `/` opens the camera detector.
- `/mongoword` asks for a word, sends it to the backend, stores it in MongoDB, and displays saved words one at a time.

The camera detector runs in the frontend. It samples a configurable square over the selected webcam, trains an average RGB reference, and turns green when the current square color is within the selected sensitivity.

## Project Layout

```text
.
├── AGENTS.MD
├── CODE_REVIEW.MD
├── DEV_AGENT.MD
├── TEST_AGENT.MD
├── back/
│   ├── README.MD
│   └── src/
└── front/
    ├── README
    └── src/
```

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Local MongoDB available at `mongodb://127.0.0.1:27017`

## Setup

```sh
npm install
```

Copy `.env.example` to `.env` at the repository root if you want to override defaults. Both workspaces read the root `.env` during local development and tests.

## Development

Run both apps:

```sh
npm run dev
```

Run only the backend:

```sh
npm run dev --workspace back
```

Run only the frontend:

```sh
npm run dev --workspace front
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

To avoid local port conflicts, set `PORT`, `FRONTEND_ORIGIN`, and `VITE_API_BASE_URL` in the root `.env`.

Frontend pages:

- Camera detector: `/`
- Mongo word app: `/mongoword`

## Verification

```sh
npm run test
npm run build
```

Backend tests use a local MongoDB test database. Start MongoDB before running the full test suite.

## Agent Workflow

Read `AGENTS.MD` first. DEV-specific instructions live in `DEV_AGENT.MD`; TEST-specific review instructions live in `TEST_AGENT.MD`. Shared review state lives in `CODE_REVIEW.MD`.
