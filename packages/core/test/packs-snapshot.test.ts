import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SHOP_PACKS } from '../src/demo/packs/index.js';
import { TEST_SHOP_PACKS } from '../src/demo/test-shops.js';
import type { ShopPack } from '../src/schemas/shop-pack.js';
import frozenSnapshot from './fixtures/frozen-pack-versions.json' with { type: 'json' };

// Every pack version as it was before decision T46 (taken from main at 74b5b09). Baskets, orders and
// stamp card prizes point at these ids, so each one must keep its id, price and stock.
const SnapshotSchema = z.record(
  z.string(),
  z.record(
    z.string(),
    z.object({
      itemId: z.string(),
      values: z.array(z.string()),
      price: z.number(),
      availability: z.string(),
    }),
  ),
);
const snapshot = SnapshotSchema.parse(frozenSnapshot);

// The only versions T46 replaces, because their items gained a choice (Part B):
// Cheese Fries gets Regular and Large, and Wide-leg Trousers gets Length.
const REPLACED_VERSIONS: Record<string, readonly string[]> = {
  'kanto-smash': ['ks-cheese-fries--base'],
  'tala-apparel': ['s', 'm', 'l', 'xl'].flatMap((size) =>
    ['black', 'olive'].map((colour) => `ta-wide-leg-trousers--${size}-${colour}`),
  ),
};

function combos(prefix: string, axes: readonly (readonly string[])[]): string[] {
  return axes
    .reduce<string[][]>((acc, axis) => acc.flatMap((c) => axis.map((v) => [...c, v])), [[]])
    .map((values) => `${prefix}--${values.join('-')}`);
}

// The only versions T46 adds.
const ADDED_VERSIONS: Record<string, readonly string[]> = {
  'kanto-smash': ['ks-cheese-fries--regular', 'ks-cheese-fries--large'],
  'tala-apparel': combos('ta-wide-leg-trousers', [
    ['s', 'm', 'l', 'xl'],
    ['black', 'olive'],
    ['regular', 'petite'],
  ]),
  'test-stress': combos('ts-item-combos', [
    ['small', 'medium', 'large', 'xl', 'xxl'],
    ['single', 'double', 'triple'],
    ['standard', 'gift-box'],
  ]),
};

const allPacks: Record<string, ShopPack> = { ...SHOP_PACKS, ...TEST_SHOP_PACKS };

function versionsOf(pack: ShopPack) {
  return new Map(
    pack.catalog.items.flatMap((item) =>
      item.variants.map((v) => [
        v.id,
        { itemId: item.id, price: v.price, availability: v.availability },
      ]),
    ),
  );
}

describe('frozen pack versions snapshot', () => {
  it('covers the 5 demo shops and the 2 test shops', () => {
    expect(Object.keys(snapshot).sort()).toEqual(Object.keys(allPacks).sort());
  });

  it('keeps every frozen version with the same id, price and availability', () => {
    for (const [slug, expectedVersions] of Object.entries(snapshot)) {
      const pack = allPacks[slug];
      if (!pack) throw new Error(`pack ${slug} is missing`);
      const current = versionsOf(pack);
      const replaced = new Set(REPLACED_VERSIONS[slug] ?? []);

      for (const [id, expected] of Object.entries(expectedVersions)) {
        if (replaced.has(id)) {
          expect(current.has(id), `${id} should be replaced`).toBe(false);
          continue;
        }
        expect(current.get(id), `${slug} ${id}`).toEqual({
          itemId: expected.itemId,
          price: expected.price,
          availability: expected.availability,
        });
      }
    }
  });

  it('adds only the versions Part B lists', () => {
    for (const [slug, pack] of Object.entries(allPacks)) {
      const frozen = snapshot[slug] ?? {};
      const added = [...versionsOf(pack).keys()].filter((id) => !(id in frozen));
      expect(added.sort(), slug).toEqual([...(ADDED_VERSIONS[slug] ?? [])].sort());
    }
  });
});
