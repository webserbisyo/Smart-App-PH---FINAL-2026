import { describe, expect, it } from 'vitest';
import { contrastRatio, shopPalette } from '../src/rules/palette.js';
import {
  STYLE_IDS,
  readLogo,
  shopStyles,
  tweakStyle,
  type LogoReading,
} from '../src/rules/style-designer.js';

type Rgba = readonly [number, number, number, number];
const SIZE = 48;

/** A square logo: `bg` everywhere, `fg` in a centred box, `dot` in a small corner box. */
function logo(bg: Rgba, fg: Rgba, dot?: Rgba): Uint8ClampedArray {
  const px = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const inFg = x > 12 && x < 36 && y > 12 && y < 36;
      const inDot = dot && x > 30 && x < 36 && y > 30 && y < 36;
      const c = inDot ? dot : inFg ? fg : bg;
      px.set(c, (y * SIZE + x) * 4);
    }
  }
  return px;
}

const RED: Rgba = [205, 47, 35, 255];
const WHITE: Rgba = [255, 255, 255, 255];
const GOLD: Rgba = [208, 166, 30, 255];
const INDIGO: Rgba = [41, 49, 121, 255];
const BROWN: Rgba = [113, 75, 40, 255];
const CREAM: Rgba = [240, 228, 205, 255];
const BLACK: Rgba = [17, 17, 17, 255];
const CLEAR: Rgba = [0, 0, 0, 0];
const BLUE: Rgba = [5, 123, 191, 255];

const read = (px: Uint8ClampedArray): LogoReading => readLogo(px, SIZE, SIZE);

describe('readLogo', () => {
  it('finds the brand colour and the white in a red logo with a white mark', () => {
    const r = read(logo(RED, WHITE, GOLD));
    expect(r.seeds[0]?.hex).toBeDefined();
    expect(contrastRatio(r.seeds[0]?.hex ?? '#000', '#CD2F23')).toBeLessThan(1.2);
    expect(r.white).toBeGreaterThan(0.1);
    expect(r.seeThrough).toBe(false);
    expect(r.edge).toBe('#CD2F23');
  });

  it('keeps two colours from an indigo and gold logo, never near-twins', () => {
    const r = read(logo(INDIGO, GOLD));
    expect(r.seeds.length).toBe(2);
  });

  it('sees a transparent logo and a white box', () => {
    expect(read(logo(CLEAR, BLUE)).seeThrough).toBe(true);
    expect(read(logo(WHITE, BLUE)).whiteBox).toBe(true);
    expect(read(logo(RED, WHITE)).whiteBox).toBe(false);
  });

  it('finds no seed in a black and white logo', () => {
    expect(read(logo(WHITE, BLACK)).seeds).toEqual([]);
  });
});

const LOGOS = [
  ['red with white', logo(RED, WHITE, GOLD)],
  ['indigo with gold', logo(INDIGO, GOLD)],
  ['brown with cream', logo(BROWN, CREAM)],
  ['blue on clear', logo(CLEAR, BLUE)],
  ['black and white', logo(WHITE, BLACK)],
] as const;

describe('shopStyles', () => {
  it.each(LOGOS)('%s: 8 styles, one best match, every one readable', (_name, px) => {
    const set = shopStyles(read(px));
    expect(set.styles.map((s) => s.id).sort()).toEqual([...STYLE_IDS].sort());
    expect(set.styles.filter((s) => s.best)).toHaveLength(1);
    expect(set.styles[0]?.best).toBe(true);
    for (const s of set.styles) {
      const p = shopPalette(s.brandColor, s.surface, s.pageColor, s.cardColor);
      expect(contrastRatio(p.shop60, p.page.foreground)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.shop30, p.foreground)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.shop10, p.shop10Foreground)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.shop60, p.page.link)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('puts a pure white page in the Clean white style', () => {
    const white = shopStyles(read(logo(RED, WHITE))).styles.find((s) => s.id === 'white');
    expect(white?.pageColor).toBe('#FFFFFF');
    expect(white?.surface).toBe('light');
  });

  it('prefers a dark style for a dark indigo and gold logo, with gold buttons', () => {
    const top = shopStyles(read(logo(INDIGO, GOLD))).styles[0];
    expect(top?.surface).toBe('dark');
    const deep = shopStyles(read(logo(INDIGO, GOLD))).styles.find((s) => s.id === 'deep');
    expect(contrastRatio(deep?.brandColor ?? '#000', '#D0A61E')).toBeLessThan(1.2);
  });

  it('prefers warm paper for a brown coffee logo', () => {
    expect(shopStyles(read(logo(BROWN, CREAM))).styles[0]?.id).toBe('paper');
  });

  it('rings a logo that blends into the Big colour page', () => {
    const bold = shopStyles(read(logo(RED, WHITE))).styles.find((s) => s.id === 'bold');
    expect(bold?.ring).toBe(true);
    expect(bold?.notes).toContain('logoRing');
  });

  it('starts from the given colour without a logo', () => {
    const set = shopStyles(null, '#1F9D55');
    expect(set.styles.find((s) => s.id === 'white')?.brandColor).toBe('#1F9D55');
  });
});

describe('tweakStyle', () => {
  it('moves the page lighter or deeper and keeps the side', () => {
    const night = shopStyles(read(logo(RED, WHITE))).styles.find((s) => s.id === 'night');
    if (!night) throw new Error('missing');
    const lighter = tweakStyle(night, 'lighter');
    expect(lighter.pageColor).not.toBe(night.pageColor);
    expect(lighter.surface).toBe('dark');
    expect(tweakStyle(night, 'deeper').surface).toBe('dark');
  });
});
