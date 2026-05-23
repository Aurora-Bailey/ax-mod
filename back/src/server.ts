import { loadConfig } from './config.js';
import { connectMongo } from './db.js';
import { buildApp } from './app.js';
import { createMongoWordRepository } from './word-repository.js';

const config = loadConfig();
const mongo = await connectMongo(config.mongodbUri);
const repository = await createMongoWordRepository(mongo.db(config.mongodbDb));
const app = buildApp({
  words: repository,
  corsOrigin: config.frontendOrigin,
  logger: true
});

async function shutdown(): Promise<void> {
  await app.close();
  await mongo.close();
}

process.on('SIGINT', () => {
  shutdown().then(
    () => process.exit(0),
    () => process.exit(1)
  );
});

process.on('SIGTERM', () => {
  shutdown().then(
    () => process.exit(0),
    () => process.exit(1)
  );
});

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  await mongo.close();
  process.exit(1);
}
