import { describe, expect, it } from 'vitest';
import {
  ItemDraftSchema,
  ItemSchema,
  isInSync,
  SHOP_PACKS,
  TEST_SHOP_PACKS,
  VARIANT_DEFAULTS,
  type ShopPack,
} from '../src/index.js';

const value = (name: string, priceDelta = 0) => ({ name, photo: null, priceDelta });
const version = (
  id: string,
  values: string[],
  price: number,
  priceOverride: number | null = null,
) => ({
  id,
  values,
  price,
  priceOverride,
  availability: 'available' as const,
  soldOutUntil: null,
});

const baseItem = {
  id: 'it-1',
  categoryId: 'cat-1',
  name: 'Tee',
  description: null,
  photos: [],
  basePrice: 10000,
  optionGroupIds: [],
  pairingIds: [],
  featured: false,
  isNew: false,
  status: 'active' as const,
  sample: false,
};

const axisOf = (name: string, names: string[]) => ({
  name,
  templateId: null,
  values: names.map((n) => value(n)),
});

describe('T46 item schemas', () => {
  it('accepts 3 choices and refuses 4', () => {
    const three = [axisOf('A', ['a']), axisOf('B', ['b']), axisOf('C', ['c'])];
    expect(
      ItemSchema.safeParse({
        ...baseItem,
        axes: three,
        variants: [version('v1', ['a', 'b', 'c'], 10000)],
      }).success,
    ).toBe(true);
    expect(
      ItemSchema.safeParse({
        ...baseItem,
        axes: [...three, axisOf('D', ['d'])],
        variants: [version('v1', ['a', 'b', 'c', 'd'], 10000)],
      }).success,
    ).toBe(false);
  });

  it('refuses two choices with the same name, ignoring case', () => {
    const result = ItemSchema.safeParse({
      ...baseItem,
      axes: [axisOf('Size', ['S']), axisOf('size', ['M'])],
      variants: [version('v1', ['S', 'M'], 10000)],
    });
    expect(result.success).toBe(false);
  });

  it('refuses a version whose price is not base + changes or its special price', () => {
    const axes = [{ name: 'Size', templateId: null, values: [value('R'), value('L', 3000)] }];
    const good = ItemSchema.safeParse({
      ...baseItem,
      axes,
      variants: [version('r', ['R'], 10000), version('l', ['L'], 15000, 15000)],
    });
    expect(good.success).toBe(true);
    const bad = ItemSchema.safeParse({
      ...baseItem,
      axes,
      variants: [version('r', ['R'], 10000), version('l', ['L'], 15000)],
    });
    expect(bad.success).toBe(false);
  });

  it('parses a draft without templateId, priceDelta or priceOverride with the defaults', () => {
    const draft = ItemDraftSchema.parse({
      categoryId: 'cat-1',
      name: 'Tee',
      description: null,
      photos: [],
      basePrice: 10000,
      axes: [{ name: 'Size', values: [{ name: 'S', photo: null }] }],
      variants: [
        { id: 'v1', values: ['S'], price: 10000, availability: 'available', soldOutUntil: null },
      ],
      optionGroupIds: [],
      pairingIds: [],
      featured: false,
      isNew: false,
      status: 'active',
    });
    expect(draft.axes[0]?.templateId).toBeNull();
    expect(draft.axes[0]?.values[0]?.priceDelta).toBe(0);
    expect(draft.variants[0]?.priceOverride).toBeNull();
  });
});

function usedBy(pack: ShopPack, name: string): string[] {
  const ids = pack.catalog.variantTemplates.filter((t) => t.name === name).map((t) => t.id);
  return pack.catalog.items
    .filter((item) => item.axes.some((a) => a.templateId !== null && ids.includes(a.templateId)))
    .map((item) => item.name);
}

describe('T46 demo packs', () => {
  const all: Record<string, ShopPack> = { ...SHOP_PACKS, ...TEST_SHOP_PACKS };

  it('links only to variants that exist, and every link is in sync', () => {
    for (const pack of Object.values(all)) {
      for (const item of pack.catalog.items) {
        for (const axis of item.axes) {
          if (axis.templateId === null) continue;
          const template = pack.catalog.variantTemplates.find((t) => t.id === axis.templateId);
          expect(template, `${item.id} ${axis.name}`).toBeDefined();
          if (template) expect(isInSync(axis, template), `${item.id} ${axis.name}`).toBe(true);
        }
      }
    }
  });

  it('Kanto uses Size (Regular, Large) on both fries and Patty on both smashes', () => {
    const kanto = SHOP_PACKS['kanto-smash'];
    const size = kanto.catalog.variantTemplates.find(
      (t) => t.name === 'Size' && t.options.map((o) => o.name).join() === 'Regular,Large',
    );
    const sizeUsers = kanto.catalog.items.filter((i) =>
      i.axes.some((a) => a.templateId === size?.id),
    );
    expect(sizeUsers.map((i) => i.name).sort()).toEqual(['Cheese Fries', 'Kanto Fries']);
    expect(usedBy(kanto, 'Patty').sort()).toEqual(['Cheesy Bacon Smash', 'Classic Smash']);
    const cheese = kanto.catalog.items.find((i) => i.name === 'Cheese Fries');
    expect(cheese?.variants.map((v) => v.price)).toEqual([11900, 14900]);
    expect(usedBy(kanto, 'Cup size')).toEqual(['House Iced Tea']);
  });

  it('Tala uses Size on 9 items and the trousers have 16 combinations', () => {
    const tala = SHOP_PACKS['tala-apparel'];
    expect(usedBy(tala, 'Size')).toHaveLength(9);
    const trousers = tala.catalog.items.find((i) => i.name === 'Wide-leg Trousers');
    expect(trousers?.axes.map((a) => a.name)).toEqual(['Size', 'Colour', 'Length']);
    expect(trousers?.variants).toHaveLength(16);
    expect(trousers?.variants.every((v) => v.price === 109900)).toBe(true);
    const soldOut = trousers?.variants.filter((v) => v.availability !== 'available');
    expect(soldOut?.map((v) => v.values.join(' · '))).toEqual(['L · Olive · Petite']);
  });

  it('Lola Remy uses Pack on 2 items', () => {
    expect(usedBy(SHOP_PACKS['lola-remy'], 'Pack')).toHaveLength(2);
  });

  it('test-stress has a 3-choice item with 30 combinations and one special price', () => {
    const items = TEST_SHOP_PACKS['test-stress'].catalog.items;
    const big = items.find((i) => i.axes.length === 3);
    expect(big?.variants).toHaveLength(30);
    expect(big?.variants.filter((v) => v.priceOverride !== null)).toHaveLength(1);
    expect(big?.basePrice).toBe(1234550);
    expect(big?.axes.filter((a) => a.templateId !== null)).toHaveLength(1);
  });

  it('test-blank has only the food defaults', () => {
    const names = TEST_SHOP_PACKS['test-blank'].catalog.variantTemplates.map((t) => t.name);
    expect(names).toEqual(VARIANT_DEFAULTS.food.map((d) => d.name));
  });
});
