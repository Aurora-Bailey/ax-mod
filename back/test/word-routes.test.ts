import { MongoClient, type Db } from 'mongodb';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { createMongoWordRepository } from '../src/word-repository.js';
import type { FastifyInstance } from 'fastify';

const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017';
const baseTestDb = process.env.MONGODB_TEST_DB ?? 'ax_mod_test';

describe('word routes', () => {
  let client: MongoClient;
  let db: Db;
  let app: FastifyInstance;

  beforeAll(async () => {
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db(`${baseTestDb}_${process.pid}_${Date.now()}`);
  });

  beforeEach(async () => {
    const repository = await createMongoWordRepository(db);
    app = buildApp({ words: repository, corsOrigin: false });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    await db.collection('words').deleteMany({});
  });

  afterAll(async () => {
    await db.dropDatabase();
    await client.close();
  });

  it('returns health status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('rejects missing or empty words', async () => {
    const missing = await app.inject({
      method: 'POST',
      url: '/words',
      payload: {}
    });
    const empty = await app.inject({
      method: 'POST',
      url: '/words',
      payload: { word: '   ' }
    });

    expect(missing.statusCode).toBe(400);
    expect(missing.json()).toEqual({ error: 'word is required' });
    expect(empty.statusCode).toBe(400);
    expect(empty.json()).toEqual({ error: 'word is required' });
  });

  it('rejects words longer than 100 characters', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/words',
      payload: { word: 'a'.repeat(101) }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'word must be 100 characters or fewer' });
  });

  it('stores trimmed words while preserving case', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/words',
      payload: { word: '  Aurora  ' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      word: {
        word: 'Aurora'
      }
    });
    expect(response.json().word.id).toEqual(expect.any(String));
    expect(response.json().word.createdAt).toEqual(expect.any(String));
  });

  it('returns saved words in creation order', async () => {
    await app.inject({
      method: 'POST',
      url: '/words',
      payload: { word: 'alpha' }
    });
    await app.inject({
      method: 'POST',
      url: '/words',
      payload: { word: 'beta' }
    });

    const response = await app.inject({
      method: 'GET',
      url: '/words'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().words.map((entry: { word: string }) => entry.word)).toEqual([
      'alpha',
      'beta'
    ]);
  });
});
