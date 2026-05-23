import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { StoredWord, WordRepository } from './word-repository.js';

type BuildAppOptions = {
  words: WordRepository;
  corsOrigin?: string | boolean;
  logger?: boolean;
};

type WordBody = {
  word?: unknown;
};

const MAX_WORD_LENGTH = 100;

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });

  app.register(cors, {
    origin: options.corsOrigin ?? true
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/words', async (): Promise<{ words: StoredWord[] }> => {
    return { words: await options.words.list() };
  });

  app.post('/words', async (request, reply): Promise<{ word: StoredWord } | void> => {
    const normalized = normalizeWord(request.body);

    if (!normalized.ok) {
      return reply.code(400).send({ error: normalized.error });
    }

    const word = await options.words.create(normalized.word);
    return { word };
  });

  return app;
}

type NormalizedWord =
  | { ok: true; word: string }
  | { ok: false; error: string };

function normalizeWord(body: unknown): NormalizedWord {
  if (!isWordBody(body) || typeof body.word !== 'string') {
    return { ok: false, error: 'word is required' };
  }

  const word = body.word.trim();

  if (!word) {
    return { ok: false, error: 'word is required' };
  }

  if (word.length > MAX_WORD_LENGTH) {
    return { ok: false, error: `word must be ${MAX_WORD_LENGTH} characters or fewer` };
  }

  return { ok: true, word };
}

function isWordBody(value: unknown): value is WordBody {
  return typeof value === 'object' && value !== null;
}
