import { expect, test } from '@playwright/test';
import { urlFor } from './routes.js';

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
