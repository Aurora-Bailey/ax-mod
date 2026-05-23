import { sveltekit } from '@sveltejs/kit/vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const DEFAULT_FRONTEND_PORT = 5173;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');
  const frontendPort = parseFrontendPort(env.FRONTEND_ORIGIN);

  return {
    envDir: '..',
    plugins: [sveltekit()],
    server: {
      port: frontendPort,
      strictPort: true
    },
    preview: {
      port: frontendPort,
      strictPort: true
    },
    resolve: {
      conditions: ['browser']
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.ts'],
      setupFiles: ['./test/setup.ts']
    }
  };
});

function parseFrontendPort(origin: string | undefined): number {
  if (!origin) {
    return DEFAULT_FRONTEND_PORT;
  }

  try {
    const port = Number.parseInt(new URL(origin).port, 10);
    return Number.isInteger(port) && port > 0 ? port : DEFAULT_FRONTEND_PORT;
  } catch {
    return DEFAULT_FRONTEND_PORT;
  }
}
