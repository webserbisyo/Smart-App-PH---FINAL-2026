import { describe, expect, it } from 'vitest';
import type { Variant, VariantAxis } from '../src/index.js';
import {
  buildVersions,
  computedPrice,
  isSamePrice,
  optionSoldOutState,
  priceRange,
  setOptionSoldOut,
  versionPrice,
} from '../src/rules/variant-pricing.js';

const axis = (
  name: string,
  values: (string | { name: string; priceDelta?: number })[],
  templateId: string | null = null,
): VariantAxis => ({
  name,
  templateId,
  values: values.map((v) =>
    typeof v === 'string'
      ? { name: v, photo: null, priceDelta: 0 }
      : { name: v.name, photo: null, priceDelta: v.priceDelta ?? 0 },
  ),
});

describe('variant-pricing rules', () => {
  it('prices add up across 3 choices: base + priceDeltas', () => {
    const axes: VariantAxis[] = [
      axis('Size', [
        { name: 'S', priceDelta: 0 },
        { name: 'L', priceDelta: 3000 },
      ]),
      axis('Color', [
        { name: 'Black', priceDelta: 0 },
        { name: 'Red', priceDelta: 1000 },
      ]),
      axis('Length', [
        { name: 'Regular', priceDelta: 0 },
        { name: 'Long', priceDelta: 500 },
      ]),
    ];

    const basePrice = 10000;
    const versions = buildVersions(axes, [], basePrice);
    expect(versions).toHaveLength(8);

    // S · Black · Regular => 10000 + 0 + 0 + 0 = 10000
    const sBlackReg = versions.find(
      (v) => v.values[0] === 'S' && v.values[1] === 'Black' && v.values[2] === 'Regular',
    );
    expect(sBlackReg?.price).toBe(10000);

    // L · Red · Long => 10000 + 3000 + 1000 + 500 = 14500
    const lRedLong = versions.find(
      (v) => v.values[0] === 'L' && v.values[1] === 'Red' && v.values[2] === 'Long',
    );
    expect(lRedLong?.price).toBe(14500);

    expect(versionPrice({ basePrice, axes, variants: versions }, ['L', 'Red', 'Long'])).toBe(
      14500,
    );
  });

  it('a special price (priceOverride) wins over automatic computed price', () => {
    const axes: VariantAxis[] = [
      axis('Size', [
        { name: 'S', priceDelta: 0 },
        { name: 'L', priceDelta: 3000 },
      ]),
    ];
    const basePrice = 5000;
    const initial = buildVersions(axes, [], basePrice);

    // Set special price for Large to 9999
    const withOverride: Variant[] = initial.map((v) =>
      v.values[0] === 'L' ? { ...v, priceOverride: 9999 } : v,
    );
    const updated = buildVersions(axes, withOverride, basePrice);
    const lVariant = updated.find((v) => v.values[0] === 'L');
    expect(lVariant?.price).toBe(9999);
    expect(lVariant?.priceOverride).toBe(9999);
  });

  it('clearing a special price returns to automatic price', () => {
    const axes: VariantAxis[] = [
      axis('Size', [
        { name: 'S', priceDelta: 0 },
        { name: 'L', priceDelta: 3000 },
      ]),
    ];
    const basePrice = 5000;
    const initial = buildVersions(axes, [], basePrice);
    const withOverride: Variant[] = initial.map((v) =>
      v.values[0] === 'L' ? { ...v, priceOverride: 9999 } : v,
    );

    // Clear special price (null)
    const cleared: Variant[] = withOverride.map((v) =>
      v.values[0] === 'L' ? { ...v, priceOverride: null } : v,
    );
    const updated = buildVersions(axes, cleared, basePrice);
    const lVariant = updated.find((v) => v.values[0] === 'L');
    expect(lVariant?.price).toBe(8000); // 5000 + 3000
    expect(lVariant?.priceOverride).toBeNull();
  });

  it('ticking an option keeps the other versions special price and sold-out state', () => {
    const axesBefore = [axis('Size', ['S', 'M'])];
    const basePrice = 2000;
    const initial = buildVersions(axesBefore, [], basePrice);

    // M has a special price and is sold out
    const modified: Variant[] = initial.map((v) =>
      v.values[0] === 'M'
        ? { ...v, priceOverride: 3500, availability: 'sold_out' as const }
        : v,
    );

    // Add 'L' option
    const axesAfter = [axis('Size', ['S', 'M', 'L'])];
    const nextVersions = buildVersions(axesAfter, modified, basePrice);

    const mVariant = nextVersions.find((v) => v.values[0] === 'M');
    expect(mVariant?.priceOverride).toBe(3500);
    expect(mVariant?.price).toBe(3500);
    expect(mVariant?.availability).toBe('sold_out');

    const lVariant = nextVersions.find((v) => v.values[0] === 'L');
    expect(lVariant?.priceOverride).toBeNull();
    expect(lVariant?.price).toBe(2000);
    expect(lVariant?.availability).toBe('available');
  });

  it('sold out on an option marks all its versions', () => {
    const axes = [
      axis('Size', ['S', 'M']),
      axis('Color', ['Red', 'Blue']),
    ];
    const basePrice = 1000;
    const versions = buildVersions(axes, [], basePrice);
    const item = { basePrice, axes, variants: versions };

    // Mark 'Red' sold out
    const updated = setOptionSoldOut(item, 1, 'Red', true);
    for (const v of updated.variants) {
      if (v.values[1] === 'Red') {
        expect(v.availability).toBe('sold_out');
      } else {
        expect(v.availability).toBe('available');
      }
    }
  });

  it('reports the some or all option sold out state', () => {
    const axes = [
      axis('Size', ['S', 'M']),
      axis('Color', ['Red', 'Blue']),
    ];
    const basePrice = 1000;
    const versions = buildVersions(axes, [], basePrice);
    const item = { basePrice, axes, variants: versions };

    expect(optionSoldOutState(item, 1, 'Red')).toBe('none');

    // Mark only S · Red sold out
    item.variants[0]!.availability = 'sold_out';
    expect(optionSoldOutState(item, 1, 'Red')).toBe('some');

    // Mark M · Red sold out as well (indices: 0 = S·Red, 1 = S·Blue, 2 = M·Red, 3 = M·Blue)
    item.variants[2]!.availability = 'sold_out';
    expect(optionSoldOutState(item, 1, 'Red')).toBe('all');
  });

  it('detects isSamePrice accurately', () => {
    expect(isSamePrice(axis('Color', ['Red', 'Blue']))).toBe(true);
    expect(
      isSamePrice(
        axis('Size', [
          { name: 'S', priceDelta: 0 },
          { name: 'L', priceDelta: 2000 },
        ]),
      ),
    ).toBe(false);
  });

  it('computes priceRange correctly', () => {
    const axes = [
      axis('Size', [
        { name: 'S', priceDelta: 0 },
        { name: 'L', priceDelta: 3000 },
      ]),
    ];
    const versions = buildVersions(axes, [], 5000);
    expect(priceRange({ variants: versions })).toEqual({ min: 5000, max: 8000 });
  });
});
