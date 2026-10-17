import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      SUPABASE_URL: 'http://127.0.0.1:54321',
      PORT: '4000',
      CORS_ORIGINS: 'http://localhost:3000,http://localhost:5173',
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
