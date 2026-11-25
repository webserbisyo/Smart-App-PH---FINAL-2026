import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Integration tests (decision T116): the real app against a local Supabase (`supabase start`), with Mailpit
// catching the emailed codes. Run with `pnpm --filter @smartapp/api test:integration`; CI's api-integration job
// sets SUPABASE_SECRET_KEY from `supabase status`.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.test.ts'],
    // One app and one database: files run one after another so their shops never race.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      APP_ENV: 'development',
      SUPABASE_URL: 'http://127.0.0.1:54321',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      MAILPIT_URL: 'http://127.0.0.1:54324',
      PORT: '4000',
      // Like Railway: each test phone gets its own address in X-Forwarded-For, so rate limits count per phone.
      TRUST_PROXY_HOPS: '1',
      CORS_ORIGINS: 'http://localhost:3000,http://localhost:5173',
    },
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
