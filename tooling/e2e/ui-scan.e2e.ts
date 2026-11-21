/**
 * UI scan (decision T99, skill: .agents/skills/smartapp-ui-check).
 *
 * Opens every page in the route catalog (apps/dashboard/src/features/kit/route-catalog.ts, so a page added
 * there is scanned too) plus the five kit pages, at phone, tablet and desktop sizes, the dashboard in light
 * and dark. Runs on the preview builds (sample data, sample sign-in), the same builds as the public demo.
 *
 * HARD problems fail CI:
 *   - JavaScript errors or console errors
 *   - failed requests (status 400 and up), apart from the deliberate not-found page and broken-image demos
 *   - the page scrolling sideways
 *   - the page keeping the processor busy for good (decision T110, desktop light only): still over
 *     BUSY_LIMIT in every second for SETTLE_SECONDS after it opened, usually an animation or a count that
 *     never stops
 * SOFT findings (text covered by another layer, tap targets under 24 px, a freeze over 300 ms while the
 * page loads, a page that takes over 5 s to settle or stays over BUSY_NOTE busy) go in
 * `test-results/ui-scan/report.md` for a person to review, next to a screenshot of every page.
 * No pixel baselines: the screenshots are for looking at, not for comparing.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN_ROUTES,
  DASHBOARD_ROUTES,
  GUEST_ROUTES,
  SCAN_SHOPS,
  PLATFORM_ROUTES,
  STOREFRONT_ROUTES,
  type CatalogRoute,
} from '../../apps/dashboard/src/features/kit/route-catalog.js';
import { SCAN_PORTS } from './ui-scan.ports.js';

const DASHBOARD_ORIGIN = `http://127.0.0.1:${SCAN_PORTS.dashboard}`;
const STOREFRONT_ORIGIN = `http://127.0.0.1:${SCAN_PORTS.storefront}`;
const OUT_DIR = resolve(import.meta.dirname, '../test-results/ui-scan');
const RESULTS_FILE = resolve(OUT_DIR, 'results.jsonl');

const SIZES = [
  { name: 'phone', width: 360, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;
type Size = (typeof SIZES)[number];
type Theme = 'light' | 'dark';

// Speed check (decision T110). A settled page should leave the processor idle. CI machines are shared and
// run several pages at once, so the hard limit leaves room for noise; anything over BUSY_NOTE is reported.
// The kit pages show every chart and animation at once and take about 5 s to settle, hence the long wait.
const BUSY_LIMIT = 0.25;
const BUSY_NOTE = 0.1;
const SETTLE_SECONDS = 8;
// Opening, network quiet and the checks above already take about 3 s, so the note starts at 5.
const SETTLE_NOTE_SECONDS = 5;
const FREEZE_NOTE_MS = 300;
const LONGEST_TASK = '__smartappScanLongestTask';

// Who the sample sign-in opens the dashboard as (apps/dashboard/src/app/preview.ts).
type Viewer = 'kanto-smash' | 'admin' | null;

interface Target {
  readonly app: 'dashboard' | 'storefront';
  readonly path: string;
  readonly viewer: Viewer;
  readonly notFound: boolean;
}

const KIT_PATHS = ['/kit', '/kit/dashboard', '/kit/storefront', '/kit/tokens', '/kit/routes'];

function opened(routes: readonly CatalogRoute[]): string[] {
  return routes.flatMap((route) => (route.scan && route.open !== undefined ? [route.open] : []));
}

const DASHBOARD_TARGETS: readonly Target[] = [
  ...opened(GUEST_ROUTES).map((path) => ({ path, viewer: null })),
  ...opened(DASHBOARD_ROUTES).map((path) => ({ path, viewer: 'kanto-smash' as const })),
  ...opened(ADMIN_ROUTES).map((path) => ({ path, viewer: 'admin' as const })),
  ...KIT_PATHS.map((path) => ({ path, viewer: null })),
].map((target) => ({ ...target, app: 'dashboard', notFound: false }));

const STOREFRONT_TARGETS: readonly Target[] = [
  ...opened(PLATFORM_ROUTES).map((path) => ({
    app: 'storefront' as const,
    path,
    viewer: null,
    notFound: false,
  })),
  ...SCAN_SHOPS.flatMap((slug) =>
    STOREFRONT_ROUTES.flatMap((route) =>
      route.scan && route.open !== undefined
        ? [
            {
              app: 'storefront' as const,
              path: `/${slug}${route.open}`,
              viewer: null,
              notFound: route.path === '/[...rest]',
            },
          ]
        : [],
    ),
  ),
];

// The kit shows a broken photo on purpose (image fallbacks); its address says so.
const EXPECTED_MISSING = /\/missing-file/;

interface ScanResult {
  readonly app: string;
  readonly path: string;
  readonly size: string;
  readonly theme: string;
  readonly hard: string[];
  readonly soft: string[];
  readonly screenshot: string;
}

function isScanResult(value: unknown): value is ScanResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'app' in value &&
    'path' in value &&
    'hard' in value &&
    Array.isArray(value.hard) &&
    'soft' in value &&
    Array.isArray(value.soft)
  );
}

// Results go to a JSON-lines file as each page finishes: Playwright starts a fresh worker after a
// failed test, and anything held only in memory would be lost before the report is written.
function readResults(): ScanResult[] {
  if (!existsSync(RESULTS_FILE)) return [];
  const byKey = new Map<string, ScanResult>();
  for (const line of readFileSync(RESULTS_FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const parsed: unknown = JSON.parse(line);
    if (isScanResult(parsed))
      byKey.set(`${parsed.app} ${parsed.path} ${parsed.size} ${parsed.theme}`, parsed);
  }
  return [...byKey.values()];
}

function fileName(app: string, path: string, size: string, theme: string): string {
  const slug = path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
  return `${app}-${slug}-${size}-${theme}.png`;
}

async function inspect(page: Page): Promise<{ overflow: string | null; soft: string[] }> {
  return page.evaluate(() => {
    const soft: string[] = [];
    const root = document.documentElement;
    const overflow =
      root.scrollWidth > root.clientWidth + 1
        ? `page scrolls sideways: ${root.scrollWidth}px wide in a ${root.clientWidth}px window`
        : null;

    // Text hidden under another layer. The Preview pill, the docks and the sticky bars float over
    // scrolled content by design, so they don't count.
    const floating =
      '[data-slot="preview-pill"], [data-slot="bottom-dock"], [data-slot="storefront-dock"], [data-sonner-toaster]';
    const covered = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.textContent ?? '').trim();
      const parent = node.parentElement;
      if (text.length < 3 || !parent) continue;
      // Words in a collapsed icon rail are hidden on purpose (they show when it opens).
      if (parent.closest('[aria-hidden="true"], .sr-only, [data-collapsible="icon"]')) continue;
      const style = getComputedStyle(parent);
      if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0')
        continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const box = range.getBoundingClientRect();
      if (box.width < 2 || box.height < 2 || box.top < 0 || box.bottom > innerHeight) continue;
      if (box.left < 0 || box.left > innerWidth - 2) continue;
      const top = document.elementFromPoint(
        Math.min(box.left + 3, innerWidth - 1),
        box.top + box.height / 2,
      );
      if (!top || top === parent || parent.contains(top) || top.contains(parent)) continue;
      if (top.closest(floating)) continue;
      // A whole card made clickable by a see-through button laid over it covers its own words by design.
      const control = top.closest('a, button');
      if (
        control &&
        getComputedStyle(control).position === 'absolute' &&
        !control.textContent?.trim()
      )
        continue;
      covered.add(`"${text.slice(0, 30)}" covered by <${top.tagName.toLowerCase()}>`);
    }
    if (covered.size > 0) soft.push(`text covered: ${[...covered].slice(0, 3).join('; ')}`);

    const tiny = [...document.querySelectorAll('a, button, [role="button"], input, select')]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return (
          box.width > 0 &&
          box.height > 0 &&
          box.top < innerHeight &&
          (box.width < 24 || box.height < 24)
        );
      })
      // Links inside a sentence are sized by the sentence (WCAG 2.5.8 inline exception).
      .filter((element) => !element.closest('p, li > a, [data-sidebar="rail"], .sr-only'))
      // Skip links are 1 px until focused.
      .filter((element) => element.getBoundingClientRect().width > 1)
      .slice(0, 3)
      .map((element) => {
        const box = element.getBoundingClientRect();
        const label = (element.textContent || element.getAttribute('aria-label') || '')
          .trim()
          .slice(0, 20);
        return `${element.tagName.toLowerCase()} "${label}" ${Math.round(box.width)}x${Math.round(box.height)}`;
      });
    if (tiny.length > 0) soft.push(`tap targets under 24px: ${tiny.join('; ')}`);

    return { overflow, soft };
  });
}

interface Speed {
  // Share of the last measured second the processor was busy (0 to 1).
  readonly busy: number;
  // Seconds after the page opened until a second came in under BUSY_LIMIT, or null if none did.
  readonly settled: number | null;
  // The longest load freeze in ms.
  readonly longest: number;
}

// Measures one second at a time until the page goes quiet or SETTLE_SECONDS have passed since `opened`.
async function measureSpeed(page: Page, opened: number): Promise<Speed> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const taskSeconds = async () => {
    const { metrics } = await cdp.send('Performance.getMetrics');
    return metrics.find((metric) => metric.name === 'TaskDuration')?.value ?? 0;
  };
  let busy = 1;
  let settled: number | null = null;
  while (settled === null && Date.now() - opened < SETTLE_SECONDS * 1000) {
    const startTask = await taskSeconds();
    const startWall = Date.now();
    await page.waitForTimeout(1000);
    const wall = (Date.now() - startWall) / 1000;
    busy = wall > 0 ? ((await taskSeconds()) - startTask) / wall : 0;
    if (busy <= BUSY_LIMIT) settled = (Date.now() - opened) / 1000;
  }
  await cdp.detach();
  const longest = await page.evaluate((key) => {
    const value = Reflect.get(window, key);
    return typeof value === 'number' ? value : 0;
  }, LONGEST_TASK);
  return { busy, settled, longest };
}

async function scan(page: Page, target: Target, size: Size, theme: Theme): Promise<void> {
  const hard: string[] = [];
  page.on('pageerror', (error) => hard.push(`JavaScript error: ${error.message.slice(0, 200)}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // The browser logs every 4xx response as a console error; those are judged by the response below.
    if (text.startsWith('Failed to load resource')) return;
    hard.push(`console error: ${text.slice(0, 200)}`);
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (EXPECTED_MISSING.test(url)) return;
    if (target.notFound && response.status() === 404 && url.endsWith(target.path)) return;
    hard.push(`request failed ${response.status()}: ${url.slice(0, 160)}`);
  });

  await page.setViewportSize({ width: size.width, height: size.height });
  await page.addInitScript(
    ({ theme, viewer }) => {
      try {
        window.localStorage.setItem('smartapp.dashboard.appearance', theme);
        if (viewer) window.sessionStorage.setItem('smartapp:preview-viewer', viewer);
      } catch {
        // Storage blocked: the page opens signed out, in light.
      }
    },
    { theme, viewer: target.viewer },
  );

  const timed = size.name === 'desktop' && theme === 'light';
  if (timed) {
    // Keeps the longest task (a freeze) seen while the page loads.
    await page.addInitScript((key) => {
      Reflect.set(window, key, 0);
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const longest = Reflect.get(window, key);
            if (typeof longest === 'number' && entry.duration > longest)
              Reflect.set(window, key, entry.duration);
          }
        }).observe({ type: 'longtask', buffered: true });
      } catch {
        // No long task timing in this browser: the freeze note is skipped.
      }
    }, LONGEST_TASK);
  }

  const origin = target.app === 'dashboard' ? DASHBOARD_ORIGIN : STOREFRONT_ORIGIN;
  const opened = Date.now();
  await page.goto(`${origin}${target.path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const { overflow, soft } = await inspect(page);
  if (overflow) hard.push(overflow);
  if (timed) {
    const { busy, settled, longest } = await measureSpeed(page, opened);
    const percent = `${Math.round(busy * 100)}%`;
    if (settled === null) {
      hard.push(`processor still ${percent} busy ${SETTLE_SECONDS} s after the page opened`);
    } else {
      if (settled > SETTLE_NOTE_SECONDS) soft.push(`took ${settled.toFixed(1)} s to settle`);
      if (busy > BUSY_NOTE) soft.push(`processor ${percent} busy after the page settled`);
    }
    if (longest > FREEZE_NOTE_MS) soft.push(`froze for ${Math.round(longest)} ms while loading`);
  }

  const screenshot = fileName(target.app, target.path, size.name, theme);
  await page.screenshot({ path: resolve(OUT_DIR, screenshot) });
  const result: ScanResult = {
    app: target.app,
    path: target.path,
    size: size.name,
    theme,
    hard,
    soft,
    screenshot,
  };
  appendFileSync(RESULTS_FILE, `${JSON.stringify(result)}\n`);

  expect(hard, `${target.app} ${target.path} at ${size.name} (${theme})`).toEqual([]);
}

test.describe('UI scan', () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  for (const size of SIZES) {
    for (const theme of ['light', 'dark'] as const) {
      for (const target of DASHBOARD_TARGETS) {
        test(`dashboard ${target.path} (${size.name}, ${theme})`, async ({ page }) => {
          await scan(page, target, size, theme);
        });
      }
    }
    // The storefront is light only (each shop's own colours).
    for (const target of STOREFRONT_TARGETS) {
      test(`storefront ${target.path} (${size.name})`, async ({ page }) => {
        await scan(page, target, size, 'light');
      });
    }
  }

  test.afterAll(() => {
    const results = readResults();
    const withHard = results.filter((r) => r.hard.length > 0);
    const withSoft = results.filter((r) => r.soft.length > 0);
    const lines = [
      '# UI scan report',
      '',
      `Pages scanned: ${results.length}. Hard problems: ${withHard.length}. Soft findings to review: ${withSoft.length}.`,
      '',
      '## Hard problems (these fail CI)',
      '',
      ...(withHard.length === 0
        ? ['None.']
        : withHard.map(
            (r) => `- ${r.app} \`${r.path}\` ${r.size} ${r.theme}: ${r.hard.join(' | ')}`,
          )),
      '',
      '## Soft findings (look at the screenshot; fix if a real person would be blocked)',
      '',
      ...(withSoft.length === 0
        ? ['None.']
        : withSoft.map(
            (r) =>
              `- ${r.app} \`${r.path}\` ${r.size} ${r.theme}: ${r.soft.join(' | ')} (${r.screenshot})`,
          )),
      '',
    ];
    writeFileSync(resolve(OUT_DIR, 'report.md'), lines.join('\n'));
  });
});
