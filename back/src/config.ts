export type AppConfig = {
  port: number;
  mongodbUri: string;
  mongodbDb: string;
  frontendOrigin: string;
};

const DEFAULT_PORT = 3001;
const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017';
const DEFAULT_MONGODB_DB = 'ax_mod';
const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:5173';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: parsePort(env.PORT),
    mongodbUri: env.MONGODB_URI ?? DEFAULT_MONGODB_URI,
    mongodbDb: env.MONGODB_DB ?? DEFAULT_MONGODB_DB,
    frontendOrigin: env.FRONTEND_ORIGIN ?? DEFAULT_FRONTEND_ORIGIN
  };
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
}
