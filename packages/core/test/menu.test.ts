import { describe, expect, it } from 'vitest';
import { SHOP_PACKS } from '../src/demo/packs/index.js';
import { itemPriceLabel, itemSoldOutLabel, menuSections, searchMenu } from '../src/rules/menu.js';
import { goesWellWith, quickAddLine, soldOutUntil } from '../src/rules/order-flow.js';
import { availabilityAt } from '../src/rules/hours.js';
import { defaultPicks } from '../src/rules/options.js';
import { quote } from '../src/rules/quote.js';
import { formatPeso } from '../src/rules/money.js';

const catalog = SHOP_PACKS['kanto-smash'].catalog;
const firstItem = catalog.items[0];
const firstVariant = firstItem?.variants[0];
if (!firstItem || !firstVariant) throw new Error('Kanto Smash needs items');

describe('menu sections', () => {
  it('keeps owner order, active items only, and drops empty categories', () => {
    const sections = menuSections(catalog);
    expect(sections.length).toBeGreaterThan(0);
    const sorts = sections.map((s) => s.category.sort);
    expect(sorts).toEqual([...sorts].sort((a, b) => a - b));
    for (const section of sections) {
      expect(section.items.length).toBeGreaterThan(0);
      expect(
        section.items.every((i) => i.status === 'active' && i.categoryId === section.category.id),
      ).toBe(true);
    }
  });
});

describe('menu search', () => {
  it('matches the name in any case and ignores blank searches', () => {
    const hits = searchMenu(catalog, '  SMASH ');
    expect(hits.length).toBeGreaterThan(0);
    expect(searchMenu(catalog, '   ')).toEqual([]);
    expect(searchMenu(catalog, 'xyznonexistentquery')).toEqual([]);
  });

  it('matches the category name', () => {
    const category = catalog.categories.find((c) =>
      catalog.items.some((i) => i.categoryId === c.id && i.status === 'active'),
    );
    if (!category) throw new Error('needs a category with items');
    const hits = searchMenu(catalog, category.name);
    expect(hits.some((i) => i.categoryId === category.id)).toBe(true);
  });
});

describe('price and sold out labels', () => {
  it('shows one price, or "from" the lowest when prices differ', () => {
    expect(itemPriceLabel({ variants: [firstVariant] })).toBe(formatPeso(firstVariant.price));
    expect(
      itemPriceLabel({
        variants: [
          { ...firstVariant, price: 25000 },
          { ...firstVariant, id: 'two', price: 19900 },
        ],
      }),
    ).toBe(`from ${formatPeso(19900)}`);
    expect(itemPriceLabel({ variants: [firstVariant, { ...firstVariant, id: 'same' }] })).toBe(
      formatPeso(firstVariant.price),
    );
  });

  it('is sold out only when no variant can be ordered', () => {
    const now = '2026-10-25T12:00:00+08:00';
    const out = { ...firstVariant, availability: 'sold_out' as const, soldOutUntil: null };
    expect(itemSoldOutLabel({ variants: [out] }, now)).toBe('Sold out');
    expect(
      itemSoldOutLabel(
        { variants: [out, { ...firstVariant, availability: 'available', soldOutUntil: null }] },
        now,
      ),
    ).toBeNull();
  });
});

describe('T127 sold out and goes well with', () => {
  const kanto = SHOP_PACKS['kanto-smash'].catalog;
  const onion = kanto.items.find((i) => i.name === 'Onion Rings');
  const classic = kanto.items.find((i) => i.name === 'Classic Smash');
  if (!onion || !classic) throw new Error('Kanto needs Onion Rings and Classic Smash');
  const now = '2026-11-28T02:00:00.000Z';
  const until = '2026-11-29T01:00:00.000Z';
  const soldOnion = {
    ...onion,
    variants: onion.variants.map((v) => ({
      ...v,
      availability: 'sold_out_today' as const,
      soldOutUntil: until,
    })),
  };

  it('quick add uses the default add-ons and refuses a sold-out item', () => {
    const fresh = {
      ...onion,
      variants: onion.variants.map((v) => ({ ...v, availability: 'available' as const })),
    };
    const line = quickAddLine(fresh, kanto.optionGroups, now);
    expect(line).not.toBeNull();
    const defaults = defaultPicks(fresh, kanto.optionGroups, now).optionIds;
    expect(line?.optionIds).toEqual([...defaults]);
    expect(quickAddLine(soldOnion, kanto.optionGroups, now)).toBeNull();
    // Classic has versions (Single, Double), so it needs the sheet.
    expect(quickAddLine(classic, kanto.optionGroups, now)).toBeNull();
  });

  it('a sold-out-today item can be booked after it comes back', () => {
    expect(soldOutUntil(soldOnion, now)).toBe(until);
    expect(availabilityAt('2026-11-29T03:00:00.000Z', now).toISOString()).toBe(
      '2026-11-29T03:00:00.000Z',
    );
    expect(itemSoldOutLabel(soldOnion, availabilityAt('2026-11-29T03:00:00.000Z', now))).toBe(null);
    // A time already past counts as now.
    expect(availabilityAt('2026-11-27T00:00:00.000Z', now).toISOString()).toBe(now);
  });

  it('goes well with: pairings first, then other categories; skips sold out and left-out items', () => {
    const items = kanto.items.map((i) => (i.id === onion.id ? soldOnion : i));
    const picks = goesWellWith({ items }, [classic], now, { limit: 4 });
    expect(picks.length).toBe(4);
    const paired = classic.pairingIds.filter((id) =>
      items.some((i) => i.id === id && i.id !== onion.id),
    );
    expect(picks.slice(0, paired.length).map((i) => i.id)).toEqual(paired);
    expect(picks.some((i) => i.id === onion.id || i.id === classic.id)).toBe(false);
    expect(picks.slice(paired.length).every((i) => i.categoryId !== classic.categoryId)).toBe(true);
    const without = goesWellWith({ items }, [classic], now, {
      limit: 4,
      exclude: new Set(paired),
    });
    expect(without.some((i) => paired.includes(i.id))).toBe(false);
  });
});

describe('T127 quote judges stock at the booked time', () => {
  const pack = SHOP_PACKS['kanto-smash'];
  const onion = pack.catalog.items.find((i) => i.name === 'Onion Rings');
  if (!onion) throw new Error('Kanto needs Onion Rings');
  const variant = onion.variants[0];
  if (!variant) throw new Error('Onion Rings needs a version');
  const until = '2026-11-29T01:00:00.000Z';
  const shop = {
    storefront: pack.storefront,
    catalog: {
      ...pack.catalog,
      items: pack.catalog.items.map((i) =>
        i.id === onion.id
          ? {
              ...i,
              variants: i.variants.map((v) => ({
                ...v,
                availability: 'sold_out_today' as const,
                soldOutUntil: until,
              })),
            }
          : i,
      ),
    },
  };
  const base = {
    type: 'pickup' as const,
    lines: [{ itemId: onion.id, variantId: variant.id, optionIds: [], note: '', qty: 1 }],
    delivery: null,
    paymentMethod: 'cash' as const,
    paymentAccountId: null,
    useReward: false,
  };
  const now = new Date('2026-11-28T02:00:00.000Z');

  it('flags the line for now, not for a booking after it comes back', () => {
    const asap = quote({ shop, now, member: null }, { ...base, scheduledAt: null });
    expect(asap.lines[0]?.problems.map((p) => p.code)).toContain('sold_out_today');
    const later = quote(
      { shop, now, member: null },
      { ...base, scheduledAt: '2026-11-29T03:00:00.000Z' },
    );
    expect(later.lines[0]?.problems).toEqual([]);
  });
});
