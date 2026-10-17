import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function stripLocalhost(): Plugin {
  return {
    name: 'strip-localhost',
    enforce: 'post',
    renderChunk(code) {
      return {
        code: code.replaceAll('localhost', '127.0.0.1'),
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), react(), stripLocalhost()],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      '@smartapp/ui': resolve(import.meta.dirname, '../../packages/ui/src'),
    },
  },
});
