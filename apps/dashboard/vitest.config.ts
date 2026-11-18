import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// vite.config is a function (it reads VITE_APP_ENV for the mode, T100), so call it with the same mode.
export default defineConfig((configEnv) =>
  mergeConfig(viteConfig(configEnv), {
    test: {
      // Material Color Utilities ships a few extensionless ESM imports that Node alone can't load; Vite can.
      server: { deps: { inline: ['@material/material-color-utilities'] } },
    },
  }),
);
