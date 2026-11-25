import { describe, expect, it } from 'vitest';
import { isShopSlug, slugCandidates, slugFromName } from '../src/rules/slug.js';

describe('shop links', () => {
  it('turns a name into a link', () => {
    expect(slugFromName("Lola Remy's Bakeshop!")).toBe('lola-remys-bakeshop');
    expect(slugFromName('Kape ni Juan — Parañaque')).toBe('kape-ni-juan-paranaque');
    expect(slugFromName('  ')).toBe('');
  });

  it('matches the database rule', () => {
    expect(isShopSlug('kanto-smash')).toBe(true);
    expect(isShopSlug('ab')).toBe(false);
    expect(isShopSlug('double--dash')).toBe(false);
    expect(isShopSlug('-start')).toBe(false);
    expect(isShopSlug('a'.repeat(41))).toBe(false);
  });

  it('offers the name, then with the city, then numbered, all valid', () => {
    const list = slugCandidates('Kanto Smash', 'Quezon City');
    expect(list.slice(0, 3)).toEqual(['kanto-smash', 'kanto-smash-quezon-city', 'kanto-smash-2']);
    expect(list.every(isShopSlug)).toBe(true);
  });

  it('a very short or very long name still gives valid links', () => {
    expect(slugCandidates('K', 'Cebu')[0]).toBe('shop-k');
    const long = slugCandidates('A'.repeat(60), 'Manila');
    expect(long.every((s) => s.length <= 40 && isShopSlug(s))).toBe(true);
  });
});
