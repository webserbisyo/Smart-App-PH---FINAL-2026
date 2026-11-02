import { expect, test } from '@playwright/test';
import { DASHBOARD_URL, urlFor } from './routes.js';

// Install as an app (T13), on the production build: the shop's manifest, the service worker, offline.
test.describe('installable shop app', () => {
  test.skip(({ isMobile }) => !isMobile, 'Once is enough: the phone project.');

  test('each shop has its own manifest with icons that load', async ({ request }) => {
    const response = await request.get(urlFor('prod', '/kanto-smash/manifest.webmanifest'));
    expect(response.status()).toBe(200);
    const manifest: unknown = await response.json();
    expect(manifest).toMatchObject({
      id: '/kanto-smash',
      start_url: '/kanto-smash',
      scope: '/kanto-smash/',
      display: 'standalone',
    });
    const icons =
      typeof manifest === 'object' && manifest !== null && 'icons' in manifest
        ? manifest.icons
        : [];
    expect(Array.isArray(icons) && icons.length).toBe(3);
    for (const icon of Array.isArray(icons) ? icons : []) {
      const src = typeof icon === 'object' && icon !== null && 'src' in icon ? icon.src : '';
      const file = await request.get(urlFor('prod', String(src)));
      expect(file.status(), String(src)).toBe(200);
    }
    expect((await request.get(urlFor('prod', '/no-such-shop/manifest.webmanifest'))).status()).toBe(
      404,
    );
  });

  test('the worker takes over, and the menu opens without signal', async ({ page, context }) => {
    await page.goto(urlFor('prod', '/kanto-smash/menu'));
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    // The frame hands the page to the worker; wait until the saved copy is there.
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const cache = await caches.open('shop-pages');
          return (await cache.keys()).some((r) => new URL(r.url).pathname === '/kanto-smash/menu');
        }),
      )
      .toBe(true);

    await context.setOffline(true);
    await page.goto(urlFor('prod', '/kanto-smash/menu'));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('#offline-page')).toHaveCount(0);

    // Checkout is never saved: it shows the offline page, with links back to the shop.
    await page.goto(urlFor('prod', '/kanto-smash/checkout'));
    await expect(page.locator('#offline-page')).toBeVisible();
    await expect(page.locator('#offline-page a[href="/kanto-smash/menu"]')).toBeVisible();
    await context.setOffline(false);
  });
});

// Privacy notice per shop (T14, decision N37).
const DEMO_SHOPS = [
  ['kanto-smash', 'Kanto Smash'],
  ['aqualinis', 'AquaLinis'],
  ['tala-apparel', 'Tala Apparel'],
  ['kape-juan', 'Kapé Juan'],
  ['lola-remy', 'Lola Remy'],
] as const;

test.describe('privacy notice', () => {
  for (const [slug, name] of DEMO_SHOPS) {
    test(`${slug} has its own notice with the Filipino summary`, async ({ page }) => {
      await page.goto(urlFor('prod', `/${slug}/privacy`));
      await expect(page.getByRole('heading', { level: 1, name: 'Privacy notice' })).toBeVisible();
      await expect(page.locator('#privacy-filipino')).toBeVisible();
      await expect(page.locator('#privacy-who')).toContainText(name);
    });
  }

  test('footer, checkout and join link to it', async ({ page }) => {
    for (const path of ['/kanto-smash', '/kanto-smash/checkout', '/kanto-smash/join']) {
      await page.goto(urlFor('prod', path));
      await expect(page.locator('a[href="/kanto-smash/privacy"]').first()).toBeAttached();
    }
  });
});

// Orders board, ticket, detail, and recall tests (O3)
test.describe('orders board and detail', () => {
  test('advance an order on phone (390) and recall it within 5s', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Phone test only');

    await page.goto(`${DASHBOARD_URL}/orders`);

    // Wait for the status strip to be visible
    const statusStrip = page.getByRole('tablist');
    await expect(statusStrip).toBeVisible();

    // Select the "New" step tab
    await page.getByRole('tab', { name: /New/i }).click();

    // Find the first advance button ("Start")
    const startButton = page.getByRole('button', { name: 'Start' }).first();
    await expect(startButton).toBeVisible();

    // Click "Start" to advance to Preparing
    await startButton.click();

    // A recall toast appears with a "Recall" button
    const recallButton = page.getByRole('button', { name: 'Recall' });
    await expect(recallButton).toBeVisible();

    // Tap Recall within 5 seconds
    await recallButton.click();

    // Toast dismisses and order is recalled
    await expect(recallButton).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' }).first()).toBeVisible();
  });

  test('advance an order on desktop (1280)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop test only');

    await page.goto(`${DASHBOARD_URL}/orders`);

    // Wait for Kanban board to load with columns
    const board = page.locator('[data-slot="kanban"]');
    await expect(board).toBeVisible();

    // Find a "Start" button in the New column
    const startBtn = page.getByRole('button', { name: 'Start' }).first();
    await expect(startBtn).toBeVisible();

    // Click "Start" to advance
    await startBtn.click();

    // Verify recall toast appears
    const recallButton = page.getByRole('button', { name: 'Recall' });
    await expect(recallButton).toBeVisible();
  });

  test('cancel an order with a reason from order detail', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}/orders`);

    // Click on an order ticket card
    const ticketCard = page.locator('[data-order-id]').first();
    await expect(ticketCard).toBeVisible();
    await ticketCard.click();

    // The order actions menu button
    const actionsMenuBtn = page.getByRole('button', { name: 'Order actions' });
    await expect(actionsMenuBtn).toBeVisible();
    await actionsMenuBtn.click();

    // Click Cancel order menu item
    const cancelMenuItem = page.getByRole('menuitem', { name: 'Cancel order' });
    await expect(cancelMenuItem).toBeVisible();
    await cancelMenuItem.click();

    // Dialog appears: select reason
    const soldOutOption = page.getByLabel('Sold out');
    await expect(soldOutOption).toBeVisible();
    await soldOutOption.click();

    // Confirm cancellation
    const confirmCancelBtn = page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Cancel order' });
    await expect(confirmCancelBtn).toBeVisible();
    await confirmCancelBtn.click();

    // Verify dialog closes
    await expect(soldOutOption).not.toBeVisible();
  });

  test('open detail and return to the same step', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Phone full-page test only');

    // Navigate with a specific step parameter
    await page.goto(`${DASHBOARD_URL}/orders?step=preparing`);

    // Verify tickets load
    const ticketCard = page.locator('[data-order-id]').first();
    await expect(ticketCard).toBeVisible();
    await ticketCard.click();

    // On mobile full-page detail, find the Back button
    const backBtn = page.getByRole('button', { name: 'Back to orders' });
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // URL should retain ?step=preparing
    await expect(page).toHaveURL(/step=preparing/);
  });
});
