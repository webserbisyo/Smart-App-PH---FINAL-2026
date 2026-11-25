import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Unit tests: no database or Supabase needed (part of `pnpm check`). The integration tests have their own
// config (vitest.integration.config.ts) and run in CI against a local Supabase.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/unit/**/*.test.ts'],
    env: {
      APP_ENV: 'development',
      SUPABASE_URL: 'http://127.0.0.1:54321',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      PORT: '4000',
      CORS_ORIGINS: 'http://localhost:3000,http://localhost:5173',
    },
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
