import { describe, expect, it } from 'vitest';
import { parseDemoRef } from '../src/media.js';
import { SHOP_PACKS } from '../src/demo/packs/index.js';
import { TEST_SHOP_PACKS } from '../src/demo/test-shops.js';
import { DEMO_SHOP_SLUGS } from '../src/demo/slugs.js';
import { DEMO_SHOPS } from '../src/demo/shops.js';
import { ShopPackSchema } from '../src/schemas/shop-pack.js';

const ITEM_COUNTS = {
  'kanto-smash': 18,
  aqualinis: 8,
  'tala-apparel': 14,
  'kape-juan': 18,
  'lola-remy': 19,
} as const;

describe('shop packs', () => {
  it.each(DEMO_SHOP_SLUGS)('%s parses with ShopPackSchema', (slug) => {
    const result = ShopPackSchema.safeParse(SHOP_PACKS[slug]);
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it.each(DEMO_SHOP_SLUGS)('%s has the item count from demo-menus.md', (slug) => {
    expect(SHOP_PACKS[slug].catalog.items).toHaveLength(ITEM_COUNTS[slug]);
  });

  it.each(DEMO_SHOP_SLUGS)('%s: every photo ref exists in DEMO_MEDIA', (slug) => {
    const pack = SHOP_PACKS[slug];
    const refs = [
      ...pack.catalog.items.flatMap((i) => [
        ...i.photos,
        ...i.axes.flatMap((a) => a.values.flatMap((v) => (v.photo ? [v.photo] : []))),
      ]),
      ...pack.storefront.look.banners.map((b) => b.ref),
      ...(pack.storefront.info.logo ? [pack.storefront.info.logo] : []),
      ...(pack.storefront.stampCard.reward.image ? [pack.storefront.stampCard.reward.image] : []),
    ];
    for (const ref of refs) expect(parseDemoRef(ref), ref).not.toBeNull();
  });

  it.each(DEMO_SHOP_SLUGS)(
    '%s: every referenced option group exists, ≤ 30 variants and ≤ 4 pairings',
    (slug) => {
      const { catalog } = SHOP_PACKS[slug];
      const groupIds = new Set(catalog.optionGroups.map((g) => g.id));
      for (const item of catalog.items) {
        for (const id of item.optionGroupIds)
          expect(groupIds.has(id), `${item.id} → ${id}`).toBe(true);
        expect(item.variants.length).toBeLessThanOrEqual(30);
        expect(item.pairingIds.length).toBeLessThanOrEqual(4);
        expect(item.sample).toBe(true);
      }
    },
  );

  it.each(DEMO_SHOP_SLUGS)(
    '%s matches the demo shop summary (name, kind, brand colour)',
    (slug) => {
      const summary = DEMO_SHOPS.find((s) => s.slug === slug);
      const { storefront } = SHOP_PACKS[slug];
      expect(storefront.info.name).toBe(summary?.name);
      expect(storefront.info.kind).toBe(summary?.kind);
      expect(storefront.look.brandColor).toBe(summary?.brandColor);
      expect(storefront.look.surface).toBe(summary?.surface);
      expect(storefront.info.isDemo).toBe(true);
    },
  );

  it('carries the blueprint section 14 states', () => {
    const tee = SHOP_PACKS['tala-apparel'].catalog.items.find((i) => i.name === 'Tala Basic Tee');
    expect(tee?.variants).toHaveLength(12);
    expect(tee?.variants.filter((v) => v.availability === 'sold_out').map((v) => v.values)).toEqual(
      [['M', 'Sand']],
    );
    expect(tee?.axes[1]?.values.find((v) => v.name === 'Sand')?.photo).toBe(
      'demo:tala-apparel/items/tala-basic-tee-sand',
    );

    const kanto = SHOP_PACKS['kanto-smash'].catalog;
    expect(kanto.optionGroups.some((g) => g.min >= 1)).toBe(true);
    expect(kanto.optionGroups.some((g) => g.options.some((o) => o.soldOut))).toBe(true);

    const sugar = SHOP_PACKS['kape-juan'].catalog.optionGroups.find(
      (g) => g.name === 'Sugar level',
    );
    expect(sugar?.options.find((o) => o.isDefault)?.name).toBe('100%');

    for (const slug of ['kanto-smash', 'kape-juan', 'lola-remy'] as const) {
      const soldOutToday = SHOP_PACKS[slug].catalog.items.filter((i) =>
        i.variants.every((v) => v.availability === 'sold_out_today'),
      );
      expect(soldOutToday, slug).toHaveLength(1);
    }
    expect(SHOP_PACKS['kape-juan'].storefront.closures).toContainEqual({
      date: '2026-11-01',
      reason: 'All Saints’ Day',
    });
    expect(SHOP_PACKS['tala-apparel'].storefront.hours.some((h) => h.day === 1)).toBe(false);
    expect(SHOP_PACKS['lola-remy'].storefront.hours[0]?.open).toBe('05:00');
    // A lunch break: two openings on Monday (decision R26 demo hours).
    expect(SHOP_PACKS['lola-remy'].storefront.hours.filter((h) => h.day === 1)).toHaveLength(2);
    const refill = SHOP_PACKS.aqualinis.catalog.items.find((i) => i.name === '5-Gallon Refill');
    expect(refill?.photos).toHaveLength(4);
  });

  it('gives each shop the payment accounts and delivery set-up from the prompt', () => {
    const methods = (slug: (typeof DEMO_SHOP_SLUGS)[number]) =>
      SHOP_PACKS[slug].storefront.payments.map((p) => p.method);
    for (const slug of DEMO_SHOP_SLUGS) expect(methods(slug)).toContain('gcash');
    expect(methods('kanto-smash')).toContain('maya');
    expect(methods('kape-juan')).toContain('maya');
    expect(methods('tala-apparel')).toEqual(expect.arrayContaining(['bank', 'qr_ph']));
    expect(methods('lola-remy')).toContain('qr_ph');
    expect(SHOP_PACKS['kanto-smash'].storefront.codMaxTotal).toBe(300000);
    expect(SHOP_PACKS.aqualinis.storefront.delivery.distance).toEqual([]);
    expect(SHOP_PACKS['tala-apparel'].storefront.delivery.zones.map((z) => z.fee)).toEqual([
      8000, 12000, 15000,
    ]);
    expect(SHOP_PACKS['kape-juan'].storefront.delivery.distance.map((r) => r.fee)).toEqual([
      3900, 5900,
    ]);
  });
});

describe('test shops', () => {
  it('both parse', () => {
    for (const pack of Object.values(TEST_SHOP_PACKS)) {
      expect(ShopPackSchema.safeParse(pack).error?.issues ?? []).toEqual([]);
    }
  });

  it('test-blank has nothing set up', () => {
    const { storefront, catalog } = TEST_SHOP_PACKS['test-blank'];
    expect(storefront.info.logo).toBeNull();
    expect(storefront.look.banners).toEqual([]);
    expect(catalog.items).toEqual([]);
    expect(catalog.categories).toEqual([]);
    expect(storefront.stampCard.status).toBe('off');
    expect(storefront.orderTypes).toEqual(['walk_in']);
    expect(storefront.payments.map((p) => p.method)).toEqual(['cash']);
  });

  it('test-stress pushes every limit', () => {
    const { storefront, catalog } = TEST_SHOP_PACKS['test-stress'];
    expect(storefront.info.name).toHaveLength(60);
    expect(catalog.items).toHaveLength(60);
    expect(catalog.categories).toHaveLength(8);
    expect(catalog.items.some((i) => i.name.length > 40)).toBe(true);
    expect(catalog.items.some((i) => i.variants.some((v) => v.price === 1234550))).toBe(true);
    expect(catalog.items.some((i) => i.variants.length === 30)).toBe(true);
    expect(catalog.optionGroups.some((g) => g.options.length === 10)).toBe(true);
    const soldOutCat = catalog.categories.find((c) => c.name === 'Sold out collection');
    const inCat = catalog.items.filter((i) => i.categoryId === soldOutCat?.id);
    expect(inCat.length).toBeGreaterThan(0);
    expect(inCat.every((i) => i.variants.every((v) => v.availability === 'sold_out'))).toBe(true);
    expect(storefront.look.announcement?.text).toHaveLength(200);
    expect(storefront.look.banners).toHaveLength(3);
    expect(storefront.stampCard.status).toBe('paused');
  });
});
