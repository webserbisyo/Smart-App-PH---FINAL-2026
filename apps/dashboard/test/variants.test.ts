import { describe, expect, it } from 'vitest';
import type { VariantAxis } from '@smartapp/core';
import {
  buildVariants,
  comboCount,
  copyChoices,
  parsePeso,
  pesoText,
  renameOption,
  sharedPrice,
} from '../src/features/catalog/variants.js';

const axis = (name: string, values: string[]): VariantAxis => ({
  name,
  values: values.map((value) => ({ name: value, photo: null })),
});

describe('variants helpers', () => {
  it('builds every combination in axis order at the given price', () => {
    const variants = buildVariants(
      [axis('Size', ['S', 'M']), axis('Colour', ['Black', 'White'])],
      [],
      49900,
    );
    expect(variants.map((v) => v.values)).toEqual([
      ['S', 'Black'],
      ['S', 'White'],
      ['M', 'Black'],
      ['M', 'White'],
    ]);
    expect(variants.every((v) => v.price === 49900 && v.availability === 'available')).toBe(true);
  });

  it('keeps id, price and stock of combinations that still exist', () => {
    const first = buildVariants([axis('Size', ['S', 'M'])], [], 10000);
    const changed = first.map((v) => (v.values[0] === 'M' ? { ...v, price: 12000 } : v));
    const next = buildVariants([axis('Size', ['S', 'M', 'L'])], changed, 10000);
    expect(next[1]).toEqual(changed[1]);
    expect(next[2]?.price).toBe(10000);
  });

  it('gives an item without choices one variant with no values', () => {
    const [only, ...rest] = buildVariants([], [], 14900);
    expect(rest).toHaveLength(0);
    expect(only?.values).toEqual([]);
    expect(only?.price).toBe(14900);
  });

  it('renames an option without losing its combinations', () => {
    const axes = [axis('Size', ['S', 'M'])];
    const variants = buildVariants(axes, [], 100).map((v) => ({ ...v, price: 250 }));
    const next = renameOption(axes, variants, 0, 'M', 'Medium');
    expect(next.axes[0]?.values.map((v) => v.name)).toEqual(['S', 'Medium']);
    expect(next.variants[1]).toEqual({ ...variants[1], values: ['Medium'] });
  });

  it('counts combinations and finds a shared price', () => {
    expect(comboCount([])).toBe(1);
    expect(comboCount([axis('Size', ['S', 'M', 'L']), axis('Colour', ['A', 'B'])])).toBe(6);
    const variants = buildVariants([axis('Size', ['S', 'M'])], [], 500);
    expect(sharedPrice(variants)).toBe(500);
    expect(sharedPrice(variants.map((v, i) => ({ ...v, price: 500 + i })))).toBeNull();
  });

  it('copies choices with fresh ids and everything back in stock', () => {
    const axes = [axis('Size', ['S'])];
    const variants = buildVariants(axes, [], 100).map((v) => ({
      ...v,
      availability: 'sold_out' as const,
    }));
    const copy = copyChoices(axes, variants);
    expect(copy.variants[0]?.id).not.toBe(variants[0]?.id);
    expect(copy.variants[0]?.availability).toBe('available');
  });

  it('reads and writes peso text as centavos', () => {
    expect(parsePeso('149')).toBe(14900);
    expect(parsePeso('12.5')).toBe(1250);
    expect(parsePeso('1,299')).toBe(129900);
    expect(parsePeso('')).toBe(0);
    expect(parsePeso('12.345')).toBeNull();
    expect(parsePeso('abc')).toBeNull();
    expect(pesoText(14900)).toBe('149');
    expect(pesoText(1250)).toBe('12.50');
    expect(pesoText(0)).toBe('');
  });
});
