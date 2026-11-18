import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // development, preview or production (T100). The hosting sets VITE_APP_ENV; .env files work too.
  const appEnv =
    process.env.VITE_APP_ENV ||
    loadEnv(mode, import.meta.dirname, 'VITE_').VITE_APP_ENV ||
    (mode === 'development' ? 'development' : 'production');
  return {
    plugins: [tailwindcss(), react()],
    server: {
      port: 5173,
      // Also listen on the Wi-Fi address, so a phone on the same network can open it.
      host: true,
    },
    define: {
      'import.meta.env.VITE_SHOW_KIT': JSON.stringify(process.env.VITE_SHOW_KIT ?? 'false'),
      // Shared packages test this to keep the sample-data tools in preview builds only (T100).
      'process.env.SMARTAPP_PREVIEW': JSON.stringify(appEnv === 'preview' ? '1' : '0'),
      // Always a literal, so `import.meta.env.VITE_APP_ENV === 'preview'` folds away in live builds.
      'import.meta.env.VITE_APP_ENV': JSON.stringify(appEnv),
    },
    resolve: {
      alias: {
        '@': resolve(import.meta.dirname, './src'),
        '@smartapp/ui': resolve(import.meta.dirname, '../../packages/ui/src'),
      },
    },
  };
});
