import { defineConfig, devices } from '@playwright/test';
import { PORTS } from './routes.js';

// Local runs on macOS 12 (no bundled Chromium there) can use the installed Chrome:
// PLAYWRIGHT_CHANNEL=chrome pnpm e2e. CI leaves it unset and uses Playwright's Chromium.
const channel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { ...(channel ? { channel } : {}), trace: 'retain-on-failure' },
  projects: [
    {
      name: 'phone',
      use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: [
    {
      // The production build (run `pnpm build` first).
      command: `pnpm --filter @smartapp/storefront exec next start -p ${PORTS.prod}`,
      url: `http://localhost:${PORTS.prod}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `pnpm --filter @smartapp/storefront exec next dev -p ${PORTS.dev}`,
      url: `http://localhost:${PORTS.dev}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
