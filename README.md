# ax-mod

SvelteKit + Fastify word collector backed by local MongoDB.

The first product slice is intentionally small:

1. The frontend asks for a word.
2. The frontend sends that word to the backend.
3. The backend validates and stores the word in MongoDB.
4. The frontend loads saved words and displays them one at a time.

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

Copy `.env.example` to `.env` if you want to override defaults.

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

## Verification

```sh
npm run test
npm run build
```

Backend tests use a local MongoDB test database. Start MongoDB before running the full test suite.

## Agent Workflow

Read `AGENTS.MD` first. DEV-specific instructions live in `DEV_AGENT.MD`; TEST-specific review instructions live in `TEST_AGENT.MD`. Shared review state lives in `CODE_REVIEW.MD`.
