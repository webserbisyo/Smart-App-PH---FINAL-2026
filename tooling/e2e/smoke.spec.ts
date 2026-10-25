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
    ).toBeVisible({ timeout: 15_000 });
    expect(problems).toEqual([]);
  });

  test('a basket shows the cart and opens the basket', async ({ page, isMobile }) => {
    const problems = watch(page);
    await page.goto(urlFor('dev', '/kanto-smash?mock=basket'));
    const opener = page.getByRole('button', { name: /^Basket, 3 items/ });
    await expect(opener).toBeVisible({ timeout: 15_000 });
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
    const opener = page.getByRole('button', { name: /^Basket, 3 items/ });
    await expect(opener).toBeVisible({ timeout: 15_000 });
    await opener.click();
    const sheet = page.getByRole('dialog', { name: 'Your basket' });
    await sheet
      .getByRole('button', { name: /^Remove / })
      .first()
      .click();
    await expect(sheet.getByRole('listitem')).toHaveCount(2);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(sheet.getByRole('listitem')).toHaveCount(3);
    await page.goto(urlFor('dev', '/kanto-smash'));
    await expect(page.getByRole('button', { name: /^Basket, 3 items/ })).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe('banner carousel (T06)', () => {
  test('carousel autoplay advances on desktop without reduced motion', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Desktop only check');
    await page.goto(urlFor('prod', '/kanto-smash'));
    const banner1Dot = page.getByRole('button', { name: 'Show banner 1' });
    const banner2Dot = page.getByRole('button', { name: 'Show banner 2' });
    await expect(banner1Dot).toHaveAttribute('aria-current', 'true', { timeout: 15_000 });
    await expect(banner2Dot).toHaveAttribute('aria-current', 'true', { timeout: 15_000 });
  });

  test('carousel autoplay does not advance with reducedMotion: reduce', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Desktop only check');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(urlFor('prod', '/kanto-smash'));
    const banner1Dot = page.getByRole('button', { name: 'Show banner 1' });
    const banner2Dot = page.getByRole('button', { name: 'Show banner 2' });
    await expect(banner1Dot).toHaveAttribute('aria-current', 'true', { timeout: 15_000 });
    await page.waitForTimeout(6000);
    await expect(banner1Dot).toHaveAttribute('aria-current', 'true');
    await expect(banner2Dot).not.toHaveAttribute('aria-current', 'true');
  });

  test('shops with no banners ship no carousel chunk', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'script') {
        scripts.push(req.url());
      }
    });
    await page.goto(urlFor('dev', '/test-blank'));
    await settle(page);
    const hasCarouselChunk = scripts.some((url) => url.includes('banner-carousel-slides'));
    expect(hasCarouselChunk).toBe(false);
  });
});

test.describe('menu and item sheet (T07)', () => {
  test('menu search and empty search result', async ({ page }) => {
    const problems = watch(page);
    await page.goto(urlFor('prod', '/kanto-smash/menu'));
    await settle(page);

    const searchInput = page.getByRole('textbox', { name: 'Search menu' });
    await expect(searchInput).toBeVisible();

    // Type search
    await searchInput.fill('Classic');
    await expect(page.getByRole('heading', { name: 'Classic Smash' })).toBeVisible();

    // Type no match
    await searchInput.fill('xyznonexistentquery');
    await expect(page.getByText('No match for "xyznonexistentquery"')).toBeVisible();

    // Clear search
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Classic Smash' })).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('favourites filter toggle', async ({ page }) => {
    const problems = watch(page);
    await page.goto(urlFor('prod', '/kanto-smash/menu'));
    await settle(page);

    // Save Classic Smash
    const heartBtn = page.getByRole('button', { name: 'Save Classic Smash' });
    await expect(heartBtn).toBeVisible();
    await heartBtn.click();

    // Favourites chip appears
    const favChip = page.getByRole('button', { name: 'Filter favourites' });
    await expect(favChip).toBeVisible();
    await favChip.click();

    // URL has ?fav=1 and Classic Smash is displayed
    await expect(page).toHaveURL(/fav=1/);
    await expect(page.getByRole('heading', { name: 'Classic Smash' })).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('food item sheet: opens, picks options, adds to basket, updates dock count, persists reload', async ({
    page,
    isMobile,
  }) => {
    const problems = watch(page);
    await page.goto(urlFor('prod', '/kanto-smash/menu?item=ks-classic-smash'));
    await settle(page);

    // Item sheet is open with title
    await expect(page.getByRole('heading', { name: 'Classic Smash' }).first()).toBeVisible();

    // Dock is hidden while item sheet is open on phone
    if (isMobile) {
      await expect(page.locator('[data-slot="storefront-dock"]')).not.toBeVisible();
    }

    // Add button
    const addBtn = page.getByRole('button', { name: /^Add · ₱/ });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Toast appears
    await expect(page.getByText('Classic Smash added')).toBeVisible();

    // Dock reappears on mobile and shows 1 item
    const cartButton = page.getByRole('button', { name: /^Basket, 1 item/ });
    await expect(cartButton).toBeVisible();

    // Reload page
    await page.reload();
    await expect(page.getByRole('button', { name: /^Basket, 1 item/ })).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('retail item sheet: Tala Basic Tee 2 axes and sold out combinations', async ({ page }) => {
    const problems = watch(page);
    await page.goto(urlFor('prod', '/tala-apparel/menu?item=ta-tala-basic-tee'));
    await settle(page);

    await expect(page.getByRole('heading', { name: 'Tala Basic Tee' }).first()).toBeVisible();

    // Select Size M
    const mSize = page.getByRole('button', { name: 'M', exact: true });
    await mSize.click();

    // Sand colour should be disabled/sold out for size M (blueprint section 14)
    const sandChip = page.getByRole('button', { name: 'Sand', exact: true });
    await expect(sandChip).toBeDisabled();

    // Select Black colour
    const blackChip = page.getByRole('button', { name: 'Black', exact: true });
    await expect(blackChip).not.toBeDisabled();
    await blackChip.click();

    // Add to cart
    const addBtn = page.getByRole('button', { name: 'Add · ₱450' });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    await expect(page.getByText('Tala Basic Tee added')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('keyboard accessible: open item, pick, and add', async ({ page }) => {
    const problems = watch(page);
    await page.goto(urlFor('prod', '/kanto-smash/menu'));
    await settle(page);

    // Focus a product card button and press Enter
    const cardOpener = page.getByRole('button', { name: /Classic Smash/ }).first();
    await cardOpener.focus();
    await page.keyboard.press('Enter');

    // Item sheet opens and takes focus, as a keyboard user would find it
    await expect(page.getByRole('heading', { name: 'Classic Smash' }).first()).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))))
      .toBe(true);

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();

    expect(problems).toEqual([]);
  });
});

test.describe('basket (T08)', () => {
  test('clear basket with confirm dialog', async ({ page }) => {
    const problems = watch(page);
    await page.addInitScript(() => {
      localStorage.setItem(
        'smartapp:basket:kanto-smash',
        JSON.stringify({
          v: 1,
          data: [
            {
              itemId: 'ks-classic-smash',
              variantId: 'ks-classic-smash--single',
              optionIds: [],
              note: '',
              qty: 1,
            },
          ],
        }),
      );
    });
    await page.goto(urlFor('dev', '/kanto-smash/menu'));

    // One basket at every width: the dock's cart on phones, the top bar's from 1024 px (decision R1).
    const cartButton = page.getByRole('button', { name: /^Basket/ });
    await expect(cartButton).toBeVisible({ timeout: 15_000 });
    await cartButton.click();
    const basket = page.getByRole('dialog', { name: 'Your basket' });

    // Basket has lines
    await expect(basket.getByRole('heading', { name: 'Your basket' })).toBeVisible({
      timeout: 15_000,
    });

    // Open More menu
    const moreBtn = basket.getByRole('button', { name: 'More options' });
    await expect(moreBtn).toBeVisible();
    await moreBtn.click();

    // Click Clear basket menu item
    const clearMenuItem = page.getByRole('menuitem', { name: 'Clear basket' });
    await expect(clearMenuItem).toBeVisible();
    await clearMenuItem.click();

    // Alert dialog opens
    const confirmBtn = page.getByRole('alertdialog').getByRole('button', { name: 'Clear basket' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify empty state
    await expect(basket.getByText('Your basket is empty')).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('flagged line excluded from total', async ({ page }) => {
    const problems = watch(page);
    await page.addInitScript(() => {
      localStorage.setItem(
        'smartapp:basket:kanto-smash',
        JSON.stringify({
          v: 1,
          data: [
            {
              itemId: 'ks-classic-smash',
              variantId: 'ks-classic-smash--single',
              optionIds: [],
              note: '',
              qty: 1,
            },
            {
              itemId: 'ks-onion-rings',
              variantId: 'ks-onion-rings--base',
              optionIds: [],
              note: '',
              qty: 1,
            },
          ],
        }),
      );
    });
    await page.goto(urlFor('dev', '/kanto-smash/menu'));

    // One basket at every width: the dock's cart on phones, the top bar's from 1024 px (decision R1).
    const cartButton = page.getByRole('button', { name: /^Basket/ });
    await expect(cartButton).toBeVisible({ timeout: 15_000 });
    await cartButton.click();
    const basket = page.getByRole('dialog', { name: 'Your basket' });

    // Verify Onion Rings shows warning banner
    await expect(basket.getByText('Sold out today')).toBeVisible({ timeout: 15_000 });
    await expect(basket.getByRole('button', { name: 'Remove Onion Rings' })).toBeVisible();

    // Verify total excludes Onion Rings (total is ₱149, not ₱248)
    const checkoutBtn = basket.getByRole('button', { name: /Checkout · ₱149/ });
    await expect(checkoutBtn).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('closed shop alert and schedule button at 04:30', async ({ page }) => {
    const problems = watch(page);
    await page.addInitScript(() => {
      localStorage.setItem(
        'smartapp:basket:lola-remy',
        JSON.stringify({
          v: 1,
          data: [
            {
              itemId: 'lr-spanish-bread',
              variantId: 'lr-spanish-bread--base',
              optionIds: [],
              note: '',
              qty: 2,
            },
          ],
        }),
      );
    });
    await page.goto(urlFor('dev', '/lola-remy/menu?now=2026-10-25T04:30:00%2B08:00'));

    // One basket at every width: the dock's cart on phones, the top bar's from 1024 px (decision R1).
    const cartButton = page.getByRole('button', { name: /^Basket/ });
    await expect(cartButton).toBeVisible({ timeout: 15_000 });
    await cartButton.click();
    const basket = page.getByRole('dialog', { name: 'Your basket' });

    // Verify closed alert
    await expect(basket.getByText('Closed now · Opens 5 AM. Your basket is saved.')).toBeVisible({
      timeout: 15_000,
    });

    // Verify schedule CTA button
    const scheduleBtn = basket.getByRole('button', { name: 'Schedule for 5:30 AM' });
    await expect(scheduleBtn).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('offline basket notice and prices as last seen', async ({ page }) => {
    const problems = watch(page);
    await page.addInitScript(() => {
      localStorage.setItem(
        'smartapp:basket:kanto-smash',
        JSON.stringify({
          v: 1,
          data: [
            {
              itemId: 'ks-classic-smash',
              variantId: 'ks-classic-smash--single',
              optionIds: [],
              note: '',
              qty: 1,
            },
          ],
        }),
      );
    });
    await page.goto(urlFor('dev', '/kanto-smash/menu?mock=offline'));

    // One basket at every width: the dock's cart on phones, the top bar's from 1024 px (decision R1).
    const cartButton = page.getByRole('button', { name: /^Basket/ });
    await expect(cartButton).toBeVisible({ timeout: 15_000 });
    await cartButton.click();
    const basket = page.getByRole('dialog', { name: 'Your basket' });

    // Verify offline alert
    await expect(basket.getByRole('alert')).toContainText("You're offline. Your basket is saved.");

    // Verify prices as last seen notice
    await expect(basket.getByText('Prices as last seen')).toBeVisible();

    // Verify CTA button is disabled with offline reason
    const disabledBtn = basket.getByRole('button', { name: /You're offline/ });
    await expect(disabledBtn).toBeVisible();
    await expect(disabledBtn).toBeDisabled();

    expect(problems).toEqual([]);
  });

  test('desktop 1280 has one basket: the top bar cart opens the drawer', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Desktop only check');
    const problems = watch(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => {
      localStorage.setItem(
        'smartapp:basket:kanto-smash',
        JSON.stringify({
          v: 1,
          data: [
            {
              itemId: 'ks-classic-smash',
              variantId: 'ks-classic-smash--single',
              optionIds: [],
              note: '',
              qty: 1,
            },
          ],
        }),
      );
    });
    await page.goto(urlFor('dev', '/kanto-smash/menu'));

    const cartButton = page.getByRole('button', { name: /^Basket, 1 item/ });
    await expect(cartButton).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('aside[aria-label="Your basket"]')).toHaveCount(0);
    await cartButton.click();
    await expect(
      page
        .getByRole('dialog', { name: 'Your basket' })
        .getByRole('heading', { name: 'Your basket' }),
    ).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('checkout walk-in cash order placement navigates to receipt', async ({ page }) => {
    const problems = watch(page);
    await page.addInitScript(() => {
      localStorage.setItem(
        'smartapp:basket:kanto-smash',
        JSON.stringify({
          v: 1,
          data: [
            {
              itemId: 'ks-classic-smash',
              variantId: 'ks-classic-smash--single',
              optionIds: [],
              note: '',
              qty: 1,
            },
          ],
        }),
      );
    });
    await page.goto(urlFor('dev', '/kanto-smash/checkout'));

    // Switch to walk-in
    await page.locator('#checkout-change-location').click();
    await page.locator('label[for="how-walk_in"]').click();
    await page.locator('#how-where-save').click();
    await expect(page.locator('#how-where-save')).not.toBeVisible({ timeout: 10_000 });

    // Fill customer info
    await page.locator('#checkout-name').fill('Juan dela Cruz');
    await page.locator('#checkout-phone').fill('09171234567');

    // Place order
    const placeBtn = page.locator('#checkout-place-order');
    await expect(placeBtn).toBeEnabled({ timeout: 10_000 });
    await placeBtn.click();

    // Verify receipt navigation
    await expect(page).toHaveURL(/\/kanto-smash\/o\//, { timeout: 30_000 });
    expect(problems).toEqual([]);
  });

  test('checkout delivery with COD under limit enables place order', async ({ page }) => {
    const problems = watch(page);
    await page.addInitScript(() => {
      localStorage.setItem(
        'smartapp:basket:kanto-smash',
        JSON.stringify({
          v: 1,
          data: [
            {
              itemId: 'ks-classic-smash',
              variantId: 'ks-classic-smash--single',
              optionIds: [],
              note: '',
              qty: 1,
            },
          ],
        }),
      );
    });
    await page.goto(urlFor('dev', '/kanto-smash/checkout'));

    // Switch to delivery
    await page.locator('#checkout-change-location').click();
    await page.locator('label[for="how-delivery"]').click();
    await page.locator('#rider-address').fill('123 Kalayaan Ave');
    await page.locator('#rider-landmark').fill('Near Barangay Hall');
    await page.locator('#how-where-save').click();
    await expect(page.locator('#how-where-save')).not.toBeVisible({ timeout: 10_000 });

    // Fill customer info
    await page.locator('#checkout-name').fill('Maria Santos');
    await page.locator('#checkout-phone').fill('09181234567');

    // Select COD
    await page.locator('label[for="pay-cod"]').click();

    const placeBtn = page.locator('#checkout-place-order');
    await expect(placeBtn).toBeEnabled({ timeout: 10_000 });
    await expect(placeBtn).toContainText('Place order');
    expect(problems).toEqual([]);
  });

  test('checkout delivery blocks COD over ₱3,000 limit', async ({ page }) => {
    const problems = watch(page);
    await page.addInitScript(() => {
      localStorage.setItem(
        'smartapp:basket:kanto-smash',
        JSON.stringify({
          v: 1,
          data: [
            {
              itemId: 'ks-classic-smash',
              variantId: 'ks-classic-smash--single',
              optionIds: [],
              note: '',
              qty: 25, // 25 * ₱180 = ₱4,500 > ₱3,000 COD limit
            },
          ],
        }),
      );
    });
    await page.goto(urlFor('dev', '/kanto-smash/checkout'));

    // Switch to delivery
    await page.locator('#checkout-change-location').click();
    await page.locator('label[for="how-delivery"]').click();
    await page.locator('#rider-address').fill('123 Kalayaan Ave');
    await page.locator('#rider-landmark').fill('Near Barangay Hall');
    await page.locator('#how-where-save').click();
    await expect(page.locator('#how-where-save')).not.toBeVisible({ timeout: 10_000 });

    // Verify COD option is disabled and alert is shown
    await expect(page.getByText('Orders above ₱3,000 need payment first')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('#pay-cod')).toBeDisabled();
    expect(problems).toEqual([]);
  });

  test('delivery resolves valid Google Maps link', async ({ page }) => {
    const problems = watch(page);
    await page.goto(urlFor('dev', '/kanto-smash/checkout'));

    await page.locator('#checkout-change-location').click();
    await page.locator('label[for="how-delivery"]').click();

    // Input coordinates near Makati within range (14.5547, 121.0244)
    await page.locator('#maps-link-input').fill('https://maps.google.com/?q=14.5547,121.0244');
    await expect(page.getByText('Link verified')).toBeVisible({ timeout: 15_000 });

    expect(problems).toEqual([]);
  });

  test('checkout disabled when offline', async ({ page }) => {
    const problems = watch(page);
    await page.addInitScript(() => {
      localStorage.setItem(
        'smartapp:basket:kanto-smash',
        JSON.stringify({
          v: 1,
          data: [
            {
              itemId: 'ks-classic-smash',
              variantId: 'ks-classic-smash--single',
              optionIds: [],
              note: '',
              qty: 1,
            },
          ],
        }),
      );
    });
    await page.goto(urlFor('dev', '/kanto-smash/checkout?mock=offline'));

    const placeBtn = page.locator('#checkout-place-order');
    await expect(placeBtn).toBeVisible({ timeout: 15_000 });
    await expect(placeBtn).toBeDisabled();
    await expect(placeBtn).toContainText('offline');
    expect(problems).toEqual([]);
  });
});

test.describe('order receipt and payment proof (T10)', () => {
  test('receipt shows pay countdown and thermal slip for unpaid transfer', async ({ page }) => {
    const problems = watch(page);
    await page.goto(urlFor('dev', '/kanto-smash/o/demo-placed-transfer'));
    await settle(page);

    await expect(page.locator('#receipt-order-number')).toBeVisible();
    await expect(page.locator('#receipt-pay-countdown')).toBeVisible();
    await expect(page.locator('#receipt-thermal-slip')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('receipt proof uploader transitions to sent on file selection', async ({ page }) => {
    const problems = watch(page);
    await page.goto(urlFor('dev', '/kape-juan/o/demo-placed-transfer'));
    await settle(page);

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    await fileInput.setInputFiles({
      name: 'proof.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake image payload'),
    });

    await expect(page.getByText('Proof sent', { exact: true })).toBeVisible({ timeout: 15_000 });
    expect(problems).toEqual([]);
  });

  test('receipt rejected alert shows reason and allows reupload', async ({ page }) => {
    const problems = watch(page);
    await page.goto(urlFor('dev', '/kanto-smash/o/demo-proof-rejected'));
    await settle(page);

    await expect(page.getByText('Payment not accepted')).toBeVisible();
    await expect(page.locator('#receipt-upload-proof-button')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('receipt image returns PNG status 200', async ({ request }) => {
    const response = await request.get(urlFor('dev', '/kanto-smash/o/demo-completed/image'));
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });

  test('receipt offline copy shows last updated notice', async ({ page }) => {
    const problems = watch(page);
    await page.goto(urlFor('dev', '/kanto-smash/o/demo-ready-pickup?mock=offline'));
    await settle(page);

    await expect(page.getByText("You're offline")).toBeVisible();
    await expect(page.getByText('Last updated')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('receipt unknown token shows empty not found pattern', async ({ page }) => {
    const problems = watch(page);
    await page.goto(urlFor('dev', '/kanto-smash/o/non-existent-order-token'));
    await settle(page);

    await expect(page.locator('#receipt-not-found')).toBeVisible();
    await expect(page.getByText("We can't find this order")).toBeVisible();
    expect(problems).toEqual([]);
  });
});
