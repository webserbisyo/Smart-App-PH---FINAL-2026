import { defineConfig } from '@playwright/test';
import { SCAN_PORTS } from './ui-scan.ports.js';

// The UI scan (decision T99): `pnpm ui-scan` after building both apps in preview mode (sample data,
// sample sign-in, kit on), the same builds as the public demo. See docs/previews.md.
// Local runs on macOS 12 can use the installed Chrome: PLAYWRIGHT_CHANNEL=chrome pnpm ui-scan. A machine
// with another Chromium build points at it with PLAYWRIGHT_CHROMIUM_PATH.
const channel = process.env.PLAYWRIGHT_CHANNEL;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: '.',
  testMatch: 'ui-scan.e2e.ts',
  outputDir: '../test-results/ui-scan-runs',
  timeout: 60_000,
  retries: 0,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    ...(channel ? { channel } : {}),
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
    trace: 'off',
  },
  webServer: [
    {
      command: `pnpm --filter @smartapp/dashboard exec vite preview --host 127.0.0.1 --port ${SCAN_PORTS.dashboard} --strictPort`,
      url: `http://127.0.0.1:${SCAN_PORTS.dashboard}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `pnpm --filter @smartapp/storefront exec next start -H 127.0.0.1 -p ${SCAN_PORTS.storefront}`,
      url: `http://127.0.0.1:${SCAN_PORTS.storefront}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
