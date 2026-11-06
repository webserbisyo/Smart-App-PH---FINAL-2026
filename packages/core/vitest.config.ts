import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Material Color Utilities ships a few extensionless ESM imports that Node alone can't load; Vite can.
    server: { deps: { inline: ['@material/material-color-utilities'] } },
  },
});
