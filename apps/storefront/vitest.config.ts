import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The storefront's rule tests (basket, checkout, when picker, receipt...) run in pnpm check and CI.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
