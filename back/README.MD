# Backend Technical Notes

Fastify API for the word app. The backend validates submitted words, stores them in MongoDB, and returns saved words to the frontend.

## Requirements

- Node.js 20 or newer
- Local MongoDB

## Environment

Defaults are safe for local development:

```sh
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=ax_mod
MONGODB_TEST_DB=ax_mod_test
FRONTEND_ORIGIN=http://localhost:5173
```

## Scripts

```sh
npm run dev --workspace back
npm run test --workspace back
npm run build --workspace back
npm run lint --workspace back
```

## API

### `GET /health`

Returns:

```json
{
  "status": "ok"
}
```

### `POST /words`

Request:

```json
{
  "word": "example"
}
```

Behavior:

- `word` must be a string.
- Leading and trailing whitespace is trimmed.
- Empty words are rejected.
- Words longer than 100 characters are rejected.
- Case is preserved.
- Duplicate words are allowed.

Success response:

```json
{
  "word": {
    "id": "mongodb-object-id",
    "word": "example",
    "createdAt": "2026-05-23T00:00:00.000Z"
  }
}
```

Validation errors return `400`.

### `GET /words`

Returns all saved words in creation order:

```json
{
  "words": [
    {
      "id": "mongodb-object-id",
      "word": "example",
      "createdAt": "2026-05-23T00:00:00.000Z"
    }
  ]
}
```

## Data Model

Collection: `words`

```ts
{
  _id: ObjectId;
  word: string;
  createdAt: Date;
}
```

The repository creates an index on `{ createdAt: 1 }`.

## Testing

Tests use Vitest and a dedicated local MongoDB test database. The database name is built from `MONGODB_TEST_DB`, the process id, and the current timestamp, then dropped after the test run.

Start MongoDB before running:

```sh
npm run test --workspace back
```
