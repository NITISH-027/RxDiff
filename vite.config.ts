/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function apiExtractPlugin(): Plugin {
  return {
    name: 'api-extract-plugin',
    configureServer(server) {
      server.middlewares.use('/api/extract', async (req, res, next) => {
        try {
          const { default: handler } = await import('./api/extract.js');
          await handler(req, res);
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  if (env.GEMINI_MODEL) process.env.GEMINI_MODEL = env.GEMINI_MODEL;
  if (env.RXDIFF_MOCK_EXTRACTION) process.env.RXDIFF_MOCK_EXTRACTION = env.RXDIFF_MOCK_EXTRACTION;

  return {
    plugins: [react(), apiExtractPlugin()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
