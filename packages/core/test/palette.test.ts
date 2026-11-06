import { describe, expect, it } from 'vitest';
import {
  BRAND_COLOR_PRESETS,
  contrastRatio,
  DEFAULT_BRAND_COLOR,
  PALETTE_BLACK,
  PALETTE_WHITE,
  shopPalette,
} from '../src/rules/palette.js';
import { SHOP_SURFACES } from '../src/schemas/enums.js';
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
      expect(p.foreground).toBe(FOREGROUND);
      expect(contrastRatio(p.shop60, FOREGROUND)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.shop30, FOREGROUND)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.shop10Soft, FOREGROUND)).toBeGreaterThanOrEqual(4.5);
    },
  );

  const SURFACE_CASES = BRANDS.flatMap((hex) =>
    SHOP_SURFACES.map((surface) => [hex, surface] as const),
  );

  it.each(SURFACE_CASES)('%s on %s: every text pair passes 4.5:1', (hex, surface) => {
    const p = shopPalette(hex, surface);
    const pairs: readonly (readonly [string, string])[] = [
      [p.shop60, p.foreground],
      [p.shop30, p.foreground],
      [p.shop60, p.shop10Text],
      [p.shop30, p.shop10Text],
      [p.shop10, p.shop10Foreground],
      [p.shop10Hover, p.shop10Foreground],
      [p.shop10Soft, p.shop10SoftForeground],
    ];
    for (const [bg, fg] of pairs) expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(4.5);
  });

  const PAGE_CASES = [
    ...DEMO_SHOPS.flatMap((shop) =>
      shop.pageColor ? [[shop.brandColor, shop.surface, shop.pageColor] as const] : [],
    ),
    ...BRAND_COLOR_PRESETS.flatMap((hex) =>
      (['#FFFFFF', '#FFF1C9', '#E2F1FD', '#253475', '#000000', '#7A1F1F'] as const).flatMap(
        (page) => SHOP_SURFACES.map((surface) => [hex, surface, page] as const),
      ),
    ),
  ];

  it.each(PAGE_CASES)(
    '%s on %s with page %s: every text pair passes 4.5:1',
    (hex, surface, page) => {
      const p = shopPalette(hex, surface, page);
      const pairs: readonly (readonly [string, string])[] = [
        [p.shop60, p.foreground],
        [p.shop30, p.foreground],
        [p.shop60, p.shop10Text],
        [p.shop30, p.shop10Text],
        [p.shop10, p.shop10Foreground],
        [p.shop10Hover, p.shop10Foreground],
        [p.shop10Soft, p.shop10SoftForeground],
        [p.shop10Soft, p.foreground],
      ];
      for (const [bg, fg] of pairs) expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(4.5);
      expect(p.tint).not.toBeNull();
    },
  );

  it('gives each demo shop a different page colour', () => {
    const pages = DEMO_SHOPS.map(
      (shop) => shopPalette(shop.brandColor, shop.surface, shop.pageColor).shop60,
    );
    expect(new Set(pages).size).toBe(DEMO_SHOPS.length);
  });

  it('uses the page colour exactly and turns the words to whatever reads (T76 C1, C4)', () => {
    const navy = shopPalette('#2456D3', 'light', '#253475');
    const cream = shopPalette('#2456D3', 'dark', '#FFF1C9');
    expect(navy.dark).toBe(true);
    expect(cream.dark).toBe(false);
    expect(contrastRatio(navy.shop60, '#253475')).toBeCloseTo(1, 1);
    expect(contrastRatio(navy.shop60, navy.page.foreground)).toBeGreaterThan(10);
    expect(contrastRatio(cream.shop60, cream.page.foreground)).toBeGreaterThan(12);
  });

  const MIXED_CASES = [
    // [brand, page, cards]: white cards on a red page, ink page with white cards, a pure white page,
    // dark cards on a light page, a gold page with navy cards.
    ['#D7372F', '#D7372F', '#FFFFFF'],
    ['#D7372F', '#1A1414', '#FFFFFF'],
    ['#D7372F', '#FFFFFF', '#F4F4F5'],
    ['#0E7AC4', '#F7F9FC', '#14213D'],
    ['#C9A227', '#C9A227', '#253475'],
    ['#FFF3A3', '#FFFFFF', null],
    ['#0B1736', '#0B1736', null],
  ] as const;

  it.each(MIXED_CASES)('%s on page %s with cards %s: every pair reads (T76)', (hex, page, card) => {
    const p = shopPalette(hex, 'light', page, card);
    const pairs: readonly (readonly [string, string, number])[] = [
      [p.shop60, p.page.foreground, 4.5],
      [p.shop60, p.page.muted, 4.5],
      [p.shop60, p.page.link, 4.5],
      [p.shop30, p.foreground, 4.5],
      [p.shop30, p.shop10Text, 4.5],
      [p.shop10, p.shop10Foreground, 4.5],
      [p.shop10Hover, p.shop10Foreground, 4.5],
      [p.shop10Soft, p.shop10SoftForeground, 4.5],
    ];
    for (const [bg, fg, min] of pairs) expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(min);
    if (p.cardMuted) expect(contrastRatio(p.shop30, p.cardMuted)).toBeGreaterThanOrEqual(4.5);
    // Buttons stand out from the page or the cards (C2).
    expect(
      Math.max(contrastRatio(p.shop10, p.shop60), contrastRatio(p.shop10, p.shop30)),
    ).toBeGreaterThanOrEqual(3);
  });

  it('marks white cards on a red page as mixed, and same-side cards as not', () => {
    expect(shopPalette('#D7372F', 'light', '#D7372F', '#FFFFFF').mixed).toBe(true);
    expect(shopPalette('#D7372F', 'light', '#FFFFFF', '#F4F4F5').mixed).toBe(false);
    expect(shopPalette('#D7372F', 'dark').mixed).toBe(false);
  });

  it('keeps every demo shop on one side (no mixed look in the demo packs)', () => {
    for (const shop of DEMO_SHOPS) {
      expect(shopPalette(shop.brandColor, shop.surface, shop.pageColor).mixed).toBe(false);
    }
  });

  it('keeps 60 and 30 neutral without a page colour: no tinted page behind the photos', () => {
    for (const hex of BRANDS) {
      for (const surface of SHOP_SURFACES) {
        const p = shopPalette(hex, surface);
        expect(p.tint).toBeNull();
        expect(Number(/oklch\([\d.]+ ([\d.]+)/.exec(p.shop60)?.[1])).toBeLessThanOrEqual(0.01);
      }
    }
  });

  it('turns the page near black on a dark shop and near white on a light one', () => {
    expect(contrastRatio(shopPalette('#D7372F', 'dark').shop60, PALETTE_WHITE)).toBeGreaterThan(15);
    expect(contrastRatio(shopPalette('#D7372F', 'light').shop60, PALETTE_BLACK)).toBeGreaterThan(
      15,
    );
  });

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
    const p = shopPalette('#D7372F', 'light', '#FFF1C9');
    const values = [
      p.shop60,
      p.shop30,
      p.foreground,
      p.shop10,
      p.shop10Foreground,
      p.shop10Hover,
      p.shop10Text,
      p.shop10Soft,
      p.shop10SoftForeground,
      ...Object.values(p.page),
      ...(p.tint ? Object.values(p.tint) : []),
    ];
    for (const value of values) expect(value).toMatch(/^oklch\(/);
  });
});
