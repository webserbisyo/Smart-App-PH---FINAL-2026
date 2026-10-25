import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 20000,
    // Playwright owns e2e/ (pnpm e2e).
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
