import { describe, expect, it } from 'vitest';
import {
  BRAND_COLOR_PRESETS,
  contrastRatio,
  DEFAULT_BRAND_COLOR,
  PALETTE_BLACK,
  PALETTE_WHITE,
  shopPalette,
} from '../src/rules/palette.js';
import { DEMO_SHOPS } from '../src/demo/shops.js';

const BRANDS = [...DEMO_SHOPS.map((s) => s.brandColor), ...BRAND_COLOR_PRESETS];
const FOREGROUND = PALETTE_BLACK;

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for the same colour', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#2456D3', '#2456D3')).toBeCloseTo(1, 5);
  });

  it('reads oklch strings like hex', () => {
    expect(contrastRatio('oklch(1 0 0)', '#000')).toBeCloseTo(21, 1);
  });
});

describe('shopPalette', () => {
  it.each(BRANDS)('%s: text on --shop-10 and its hover passes 4.5:1', (hex) => {
    const p = shopPalette(hex);
    expect(contrastRatio(p.shop10, p.shop10Foreground)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.shop10Hover, p.shop10Foreground)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(BRANDS)(
    '%s: body text on --shop-60, --shop-30 and --shop-10-soft passes 4.5:1',
    (hex) => {
      const p = shopPalette(hex);
      expect(contrastRatio(p.shop60, FOREGROUND)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.shop30, FOREGROUND)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.shop10Soft, FOREGROUND)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('keeps a dark brand as is with white text', () => {
    const p = shopPalette('#0B1736');
    expect(p.shop10Foreground).toBe(PALETTE_WHITE);
  });

  it('uses black text on a very light yellow instead of turning it brown', () => {
    const p = shopPalette('#FFF3A3');
    expect(p.shop10Foreground).toBe(PALETTE_BLACK);
  });

  it('falls back to the default brand for an unreadable colour', () => {
    expect(shopPalette('not-a-colour')).toEqual(shopPalette(DEFAULT_BRAND_COLOR));
  });

  it('returns OKLCH strings', () => {
    const p = shopPalette('#D7372F');
    for (const value of Object.values(p)) expect(value).toMatch(/^oklch\(/);
  });
});
