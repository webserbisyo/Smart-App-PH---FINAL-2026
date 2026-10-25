import { expect, test, type Page } from '@playwright/test';
import { ROUTES, urlFor } from './routes.js';

// Collects what must never happen on a page: console errors and warnings (React warnings
// included), and failed image or script requests.
function watch(page: Page, expectedStatus: 200 | 404 = 200): string[] {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return;
    // The browser logs the document's own 404 on a Not found page; that one is the point of the page.
    const ownNotFound =
      expectedStatus === 404 &&
      msg.text().startsWith('Failed to load resource') &&
      msg.location().url === page.url();
    if (!ownNotFound) problems.push(`console.${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`exception: ${error.message}`));
  page.on('requestfailed', (request) => {
    if (['image', 'script'].includes(request.resourceType()))
      problems.push(`failed ${request.resourceType()}: ${request.url()}`);
  });
  page.on('response', (response) => {
    const type = response.request().resourceType();
    if (['image', 'script'].includes(type) && response.status() >= 400)
      problems.push(`${response.status()} ${type}: ${response.url()}`);
  });
  return problems;
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  // Scroll through once so lazy images load before they are checked.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
}

async function layoutProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const d = document.documentElement;
    if (d.scrollWidth > d.clientWidth)
      out.push(`sideways scroll: ${d.scrollWidth} > ${d.clientWidth}`);
    for (const img of Array.from(document.images)) {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src'))
        out.push(`broken image: ${img.currentSrc || img.src}`);
    }
    return out;
  });
}

for (const route of ROUTES) {
  test(`${route.name} opens cleanly`, async ({ page }) => {
    const problems = watch(page, route.notFound ? 404 : 200);
    await page.goto(urlFor(route.server, route.path));
    await settle(page);
    if (route.notFound)
      await expect(page.getByRole('heading', { level: 1, name: /not found/i })).toBeVisible();
    problems.push(...(await layoutProblems(page)));
    expect(problems).toEqual([]);
  });
}

test.describe('scenarios (dev server, ?mock=)', () => {
  test('offline shows the offline banner', async ({ page }) => {
    const problems = watch(page);
    await page.goto(urlFor('dev', '/kanto-smash?mock=offline'));
    await expect(page.getByRole('status').filter({ hasText: 'You’re offline' })).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('closed shows the closed state', async ({ page }) => {
    const problems = watch(page);
    await page.goto(urlFor('dev', '/kanto-smash?mock=closed'));
    await expect(
      page
        .getByText(/^Closed · Opens/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('a basket shows the cart and opens the basket', async ({ page, isMobile }) => {
    const problems = watch(page);
    await page.goto(urlFor('dev', '/kanto-smash?mock=basket'));
    const opener = page.getByRole('button', { name: /^Basket, 3 items/ });
    await expect(opener).toBeVisible();
    await opener.click();
    const sheet = page.getByRole('dialog', { name: 'Your basket' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('listitem')).toHaveCount(3);
    if (isMobile) await expect(page.locator('[data-slot="storefront-dock"]')).toBeVisible();
    expect(problems).toEqual([]);
  });
});

test.describe('remembered on the phone', () => {
  test('order type and zone survive a reload', async ({ page }) => {
    await page.goto(urlFor('dev', '/kanto-smash'));
    await page.getByRole('button', { name: /Change how and where/ }).click();
    const sheet = page.getByRole('dialog', { name: 'How and where' });
    await sheet.getByText('Delivery', { exact: true }).click();
    await sheet.getByText('Marikina Heights and Parang').click();
    await sheet.getByRole('button', { name: 'Save' }).click();
    const bar = page.getByRole('button', { name: /Delivery · Marikina Heights and Parang · ₱60/ });
    await expect(bar).toBeVisible();
    await page.reload();
    await expect(bar).toBeVisible();
  });

  test('basket lines survive a reload, and Undo puts a removed line back', async ({ page }) => {
    await page.goto(urlFor('dev', '/kanto-smash?mock=basket'));
    await page.getByRole('button', { name: /^Basket, 3 items/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Your basket' });
    await sheet
      .getByRole('button', { name: /^Remove / })
      .first()
      .click();
    await expect(sheet.getByRole('listitem')).toHaveCount(2);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(sheet.getByRole('listitem')).toHaveCount(3);
    await page.goto(urlFor('dev', '/kanto-smash'));
    await expect(page.getByRole('button', { name: /^Basket, 3 items/ })).toBeVisible();
  });
});
