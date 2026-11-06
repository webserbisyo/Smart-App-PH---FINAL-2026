import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Material Color Utilities ships a few extensionless ESM imports that Node alone can't load; Vite can.
      server: { deps: { inline: ['@material/material-color-utilities'] } },
    },
  }),
);
