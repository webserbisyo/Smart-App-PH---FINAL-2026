import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5173,
  },
  define: {
    'import.meta.env.VITE_SHOW_KIT': JSON.stringify(process.env.VITE_SHOW_KIT ?? 'false'),
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      '@smartapp/ui': resolve(import.meta.dirname, '../../packages/ui/src'),
    },
  },
});
