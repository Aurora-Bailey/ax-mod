import type { Collection, Db, ObjectId, WithId } from 'mongodb';

export type StoredWord = {
  id: string;
  word: string;
  createdAt: string;
};

export type WordRepository = {
  create(word: string): Promise<StoredWord>;
  list(): Promise<StoredWord[]>;
};

type WordDocument = {
  _id?: ObjectId;
  word: string;
  createdAt: Date;
};

export class MongoWordRepository implements WordRepository {
  private readonly collection: Collection<WordDocument>;

  constructor(db: Db) {
    this.collection = db.collection<WordDocument>('words');
  }

  async init(): Promise<void> {
    await this.collection.createIndex({ createdAt: 1 });
  }

  async create(word: string): Promise<StoredWord> {
    const createdAt = new Date();
    const result = await this.collection.insertOne({ word, createdAt });

    return {
      id: result.insertedId.toHexString(),
      word,
      createdAt: createdAt.toISOString()
    };
  }

  async list(): Promise<StoredWord[]> {
    const words = await this.collection
      .find()
      .sort({ createdAt: 1, _id: 1 })
      .toArray();

    return words.map(toStoredWord);
  }
}

export async function createMongoWordRepository(db: Db): Promise<MongoWordRepository> {
  const repository = new MongoWordRepository(db);
  await repository.init();
  return repository;
}

function toStoredWord(document: WithId<WordDocument>): StoredWord {
  return {
    id: document._id.toHexString(),
    word: document.word,
    createdAt: document.createdAt.toISOString()
  };
}
