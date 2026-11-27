import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { serwist } from '@serwist/vite';
import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite';
import {
  IOS_SCREENS,
  splashMedia,
  splashSizeName,
} from '../../packages/core/src/rules/ios-screens.ts';

// "New version ready" (T117): each build gets an id, baked into the page and written to /version.json. An open
// dashboard checks the file now and then; a different id means a newer dashboard is live.
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || Date.now().toString(36);

function versionFile(): Plugin {
  return {
    name: 'smartapp-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ id: BUILD_ID }),
      });
    },
  };
}

// iPhone and iPad launch pictures (decision T121), light and dark, made by tooling/scripts/dashboard-splash.ts.
// iOS opens white on any screen without one, so every current screen gets a pair.
function launchPictures(): Plugin {
  const tags: HtmlTagDescriptor[] = IOS_SCREENS.flatMap((screen) =>
    (['light', 'dark'] as const).map((theme) => ({
      tag: 'link',
      injectTo: 'head' as const,
      attrs: {
        rel: 'apple-touch-startup-image',
        href: `/splash/dashboard-${splashSizeName(screen)}-${theme}.png`,
        media: `${splashMedia(screen)} and (prefers-color-scheme: ${theme})`,
      },
    })),
  );
  return { name: 'smartapp-launch-pictures', transformIndexHtml: () => tags };
}

export default defineConfig(({ mode }) => {
  // development, preview or production (T100). The hosting sets VITE_APP_ENV; .env files work too.
  const appEnv =
    process.env.VITE_APP_ENV ||
    loadEnv(mode, import.meta.dirname, 'VITE_').VITE_APP_ENV ||
    (mode === 'development' ? 'development' : 'production');
  return {
    plugins: [
      tailwindcss(),
      react(),
      versionFile(),
      launchPictures(),
      // The owner's alert worker (launch phase 5, Q2): /push-sw.js, push only, nothing precached.
      serwist({
        swSrc: 'src/sw/push-sw.ts',
        swDest: 'push-sw.js',
        swUrl: '/push-sw.js',
        globDirectory: 'dist',
        globPatterns: [],
        injectionPoint: 'self.__SW_MANIFEST',
        rollupFormat: 'iife',
        devOptions: { bundle: true },
      }),
    ],
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
      // 'dev' while `vite` serves: no update check there.
      'import.meta.env.VITE_BUILD_ID': JSON.stringify(mode === 'development' ? 'dev' : BUILD_ID),
    },
    resolve: {
      alias: {
        '@': resolve(import.meta.dirname, './src'),
        '@smartapp/ui': resolve(import.meta.dirname, '../../packages/ui/src'),
      },
    },
  };
});
