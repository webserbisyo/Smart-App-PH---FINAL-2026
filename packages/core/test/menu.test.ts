import { describe, expect, it } from 'vitest';
import { SHOP_PACKS } from '../src/demo/packs/index.js';
import { itemPriceLabel, itemSoldOutLabel, menuSections, searchMenu } from '../src/rules/menu.js';
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
