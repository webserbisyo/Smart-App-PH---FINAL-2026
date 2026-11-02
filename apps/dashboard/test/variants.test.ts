import { describe, expect, it } from 'vitest';
import type { VariantAxis } from '@smartapp/core';
import {
  buildVersions,
  comboCount,
  copyChoices,
  newVariantId,
  parsePeso,
  pesoText,
} from '../src/features/catalog/variants.js';

const axis = (name: string, values: { name: string; priceDelta?: number }[]): VariantAxis => ({
  name,
  templateId: null,
  values: values.map((v) => ({
    name: v.name,
    photo: null,
    priceDelta: v.priceDelta ?? 0,
  })),
});

describe('dashboard variants helpers', () => {
  it('builds every combination in axis order with base price and option deltas', () => {
    const variants = buildVersions(
      [
        axis('Size', [{ name: 'Regular' }, { name: 'Large', priceDelta: 3000 }]),
        axis('Ice', [{ name: 'Less' }, { name: 'Normal' }]),
      ],
      [],
      10000,
    );
    expect(variants.map((v) => v.values)).toEqual([
      ['Regular', 'Less'],
      ['Regular', 'Normal'],
      ['Large', 'Less'],
      ['Large', 'Normal'],
    ]);
    expect(variants.map((v) => v.price)).toEqual([10000, 10000, 13000, 13000]);
    expect(variants.every((v) => v.availability === 'available')).toBe(true);
  });

  it('keeps id, priceOverride and stock of combinations that still exist', () => {
    const axes = [axis('Size', [{ name: 'S' }, { name: 'M' }])];
    const first = buildVersions(axes, [], 10000);
    const changed = first.map((v) =>
      v.values[0] === 'M' ? { ...v, priceOverride: 15000, price: 15000, availability: 'sold_out' as const } : v,
    );
    const nextAxes = [axis('Size', [{ name: 'S' }, { name: 'M' }, { name: 'L' }])];
    const next = buildVersions(nextAxes, changed, 10000);
    expect(next[1]?.id).toBe(changed[1]?.id);
    expect(next[1]?.price).toBe(15000);
    expect(next[1]?.priceOverride).toBe(15000);
    expect(next[1]?.availability).toBe('sold_out');
    expect(next[2]?.price).toBe(10000);
    expect(next[2]?.availability).toBe('available');
  });

  it('gives an item without choices one variant with no values', () => {
    const [only, ...rest] = buildVersions([], [], 14900);
    expect(rest).toHaveLength(0);
    expect(only?.values).toEqual([]);
    expect(only?.price).toBe(14900);
  });

  it('counts combinations correctly', () => {
    expect(comboCount([])).toBe(1);
    expect(
      comboCount([
        axis('Size', [{ name: 'S' }, { name: 'M' }, { name: 'L' }]),
        axis('Colour', [{ name: 'A' }, { name: 'B' }]),
      ]),
    ).toBe(6);
  });

  it('generates unique variant IDs', () => {
    const id1 = newVariantId();
    const id2 = newVariantId();
    expect(id1).not.toBe(id2);
  });

  it('copies choices with fresh ids and everything back in stock', () => {
    const axes = [axis('Size', [{ name: 'S' }])];
    const variants = buildVersions(axes, [], 10000).map((v) => ({
      ...v,
      availability: 'sold_out' as const,
    }));
    const copy = copyChoices(axes, variants, 10000);
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
