import { describe, expect, it } from 'vitest';
import { SHOP_PACKS } from '../src/demo/packs/index.js';
import { TEST_SHOP_PACKS } from '../src/demo/test-shops.js';
import frozenSnapshot from './fixtures/frozen-pack-versions.json' with { type: 'json' };

type VersionInfo = {
  itemId: string;
  values: string[];
  price: number;
  availability: string;
};

type Snapshot = Record<string, Record<string, VersionInfo>>;

const snapshot = frozenSnapshot as Snapshot;

// Expected new versions added in Part B:
// 1. Kanto Cheese Fries (Regular and Large)
// 2. Tala Wide-leg Trousers Length expansion (from 4 to 16 combinations = 12 new combinations)
const ALLOWED_NEW_VERSIONS: Record<string, string[]> = {
  'kanto-smash': ['ks-cheese-fries--regular', 'ks-cheese-fries--large'],
  'tala-apparel': [
    'ta-wide-leg-trousers--s-black-regular',
    'ta-wide-leg-trousers--s-black-petite',
    'ta-wide-leg-trousers--s-olive-regular',
    'ta-wide-leg-trousers--s-olive-petite',
    'ta-wide-leg-trousers--m-black-regular',
    'ta-wide-leg-trousers--m-black-petite',
    'ta-wide-leg-trousers--m-olive-regular',
    'ta-wide-leg-trousers--m-olive-petite',
    'ta-wide-leg-trousers--l-black-regular',
    'ta-wide-leg-trousers--l-black-petite',
    'ta-wide-leg-trousers--l-olive-regular',
    'ta-wide-leg-trousers--l-olive-petite',
    'ta-wide-leg-trousers--xl-black-regular',
    'ta-wide-leg-trousers--xl-black-petite',
    'ta-wide-leg-trousers--xl-olive-regular',
    'ta-wide-leg-trousers--xl-olive-petite',
  ],
  'test-stress': [
    'ts-item-2--small-single-standard',
    'ts-item-2--small-single-gift-box',
    'ts-item-2--small-double-standard',
    'ts-item-2--small-double-gift-box',
    'ts-item-2--small-triple-standard',
    'ts-item-2--small-triple-gift-box',
    'ts-item-2--medium-single-standard',
    'ts-item-2--medium-single-gift-box',
    'ts-item-2--medium-double-standard',
    'ts-item-2--medium-double-gift-box',
    'ts-item-2--medium-triple-standard',
    'ts-item-2--medium-triple-gift-box',
    'ts-item-2--large-single-standard',
    'ts-item-2--large-single-gift-box',
    'ts-item-2--large-double-standard',
    'ts-item-2--large-double-gift-box',
    'ts-item-2--large-triple-standard',
    'ts-item-2--large-triple-gift-box',
    'ts-item-2--xl-single-standard',
    'ts-item-2--xl-single-gift-box',
    'ts-item-2--xl-double-standard',
    'ts-item-2--xl-double-gift-box',
    'ts-item-2--xl-triple-standard',
    'ts-item-2--xl-triple-gift-box',
    'ts-item-2--xxl-single-standard',
    'ts-item-2--xxl-single-gift-box',
    'ts-item-2--xxl-double-standard',
    'ts-item-2--xxl-double-gift-box',
    'ts-item-2--xxl-triple-standard',
    'ts-item-2--xxl-triple-gift-box',
  ],
};

describe('frozen pack versions snapshot', () => {
  const allPacks: Record<string, (typeof SHOP_PACKS)['kanto-smash']> = {
    ...SHOP_PACKS,
    ...TEST_SHOP_PACKS,
  };

  it('preserves all frozen versions across the 5 demo shops and 2 test shops', () => {
    for (const [slug, expectedVersions] of Object.entries(snapshot)) {
      const pack = allPacks[slug];
      expect(pack, `pack ${slug} should exist`).toBeDefined();

      const currentVersions = new Map<string, VersionInfo>();
      for (const item of pack!.catalog.items) {
        for (const v of item.variants) {
          currentVersions.set(v.id, {
            itemId: item.id,
            values: [...v.values],
            price: v.price,
            availability: v.availability,
          });
        }
      }

      // Check that every frozen version exists with same id, price, and availability
      for (const [id, expected] of Object.entries(expectedVersions)) {
        // Special case: Wide-leg Trousers in Tala Apparel, Cheese Fries in Kanto Smash,
        // and Item 2 in Test Stress were upgraded to choices in Part B.
        if (slug === 'tala-apparel' && expected.itemId === 'ta-wide-leg-trousers') {
          if (!currentVersions.has(id)) {
            continue;
          }
        }
        if (slug === 'kanto-smash' && expected.itemId === 'ks-cheese-fries') {
          if (!currentVersions.has(id)) {
            continue;
          }
        }
        if (slug === 'test-stress' && expected.itemId === 'ts-item-2') {
          if (!currentVersions.has(id)) {
            continue;
          }
        }

        const current = currentVersions.get(id);
        expect(current, `${slug} should contain version ${id}`).toBeDefined();
        if (current) {
          expect(current.itemId, `${id} itemId`).toBe(expected.itemId);
          expect(current.price, `${id} price`).toBe(expected.price);
          expect(current.availability, `${id} availability`).toBe(expected.availability);
        }
      }
    }
  });

  it('only adds expected new versions from Part B', () => {
    for (const [slug, pack] of Object.entries(allPacks)) {
      const expectedVersions = snapshot[slug] ?? {};
      const allowedAdditions = new Set(ALLOWED_NEW_VERSIONS[slug] ?? []);

      for (const item of pack.catalog.items) {
        for (const v of item.variants) {
          if (!expectedVersions[v.id]) {
            // Must be one of the allowed additions
            expect(
              allowedAdditions.has(v.id),
              `Unexpected new version in ${slug}: ${v.id} (${item.name})`,
            ).toBe(true);
          }
        }
      }
    }
  });
});
