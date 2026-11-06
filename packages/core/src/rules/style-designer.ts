// Style designer (decision T76): reads the shop's logo and builds whole shop styles (page 60, cards 30,
// buttons 10) with colour theory. Colour science from Google's Material Color Utilities: the Celebi quantizer
// and Score pick the logo colours that make good themes, HCT gives perceptual tones and hues, DislikeAnalyzer
// spots bile greens, TemperatureCache finds a partner colour. Our rules turn them into styles and score them
// with the real shop palette, so a style always reads the way the storefront will draw it.
// Runs on the owner's device, nothing is sent anywhere (N8). Imported only by the Editor, never from the
// package index, so the storefront never loads the colour library.
import {
  DislikeAnalyzer,
  Hct,
  QuantizerCelebi,
  Score,
  TemperatureCache,
  argbFromHex,
  hexFromArgb,
} from '@material/material-color-utilities';
import { contrastRatio, hexToOklch, shopPalette, surfaceForPage } from './palette.js';
import type { ShopSurface } from '../schemas/enums.js';

export const STYLE_IDS = [
  'white',
  'tint',
  'paper',
  'pair',
  'night',
  'deep',
  'ink',
  'bold',
] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export const STYLE_GROUPS = ['light', 'dark', 'bold'] as const;
export type StyleGroup = (typeof STYLE_GROUPS)[number];

export const STYLE_NOTES = ['buttonsDeeper', 'buttonsLighter', 'logoRing'] as const;
export type StyleNote = (typeof STYLE_NOTES)[number];

/** A colour the logo really uses. */
export interface LogoSeed {
  hex: string;
  /** Share of the logo's coloured pixels near this hue, 0 to 1. */
  share: number;
}

export interface LogoReading {
  /** Up to 3 theme-worthy colours, best first. Empty for a black and white logo. */
  seeds: LogoSeed[];
  /** Shares of near-white and near-black pixels, 0 to 1. */
  white: number;
  black: number;
  /** The outer edge is see-through (a transparent PNG). */
  seeThrough: boolean;
  /** The edge colour of a logo that fills its square (null when see-through or mixed). */
  edge: string | null;
  /** The edge is a near-white box (a JPG with a white background): offer "Remove white background". */
  whiteBox: boolean;
}

export interface ShopStyle {
  id: StyleId;
  group: StyleGroup;
  /** The colour the style is built around (names the style: "Deep red"). */
  seed: string;
  pageColor: string;
  cardColor: string;
  brandColor: string;
  surface: ShopSurface;
  score: number;
  best: boolean;
  /** The logo blends into the page: it gets a thin ring. */
  ring: boolean;
  notes: StyleNote[];
}

export interface StyleSet {
  styles: ShopStyle[];
  seeds: LogoSeed[];
  /** A second colour for "Buttons": the logo's own, or a colour-wheel neighbour of the main one. */
  partner: string;
}

const FALLBACK_SEED = '#2456D3';

function hexOf(hue: number, chroma: number, tone: number): string {
  return hexFromArgb(Hct.from(hue, chroma, tone).toInt()).toUpperCase();
}

function hctOf(hex: string): Hct {
  return Hct.fromInt(argbFromHex(hex));
}

function hueGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

/**
 * Reads a logo from RGBA pixels (a canvas `getImageData`). The caller draws it small first (about 96 x 96).
 */
export function readLogo(rgba: ArrayLike<number>, width: number, height: number): LogoReading {
  const pixels: number[] = [];
  let edgeR = 0;
  let edgeG = 0;
  let edgeB = 0;
  let edgeSolid = 0;
  let edgeClear = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = rgba[i] ?? 0;
      const g = rgba[i + 1] ?? 0;
      const b = rgba[i + 2] ?? 0;
      const a = rgba[i + 3] ?? 0;
      const edge = x < 3 || y < 3 || x >= width - 3 || y >= height - 3;
      if (a < 200) {
        if (edge) edgeClear += 1;
        continue;
      }
      pixels.push(((255 << 24) | (r << 16) | (g << 8) | b) >>> 0);
      if (edge) {
        edgeR += r;
        edgeG += g;
        edgeB += b;
        edgeSolid += 1;
      }
    }
  }
  const seeThrough = edgeClear > edgeSolid;
  const edge =
    !seeThrough && edgeSolid > 0
      ? `#${[edgeR, edgeG, edgeB]
          .map((v) =>
            Math.round(v / edgeSolid)
              .toString(16)
              .padStart(2, '0'),
          )
          .join('')}`.toUpperCase()
      : null;
  const edgeTone = edge ? hctOf(edge) : null;

  const counts = QuantizerCelebi.quantize(pixels, 128);
  let total = 0;
  for (const n of counts.values()) total += n;
  let white = 0;
  let black = 0;
  const coloured: { hue: number; share: number }[] = [];
  for (const [argb, n] of counts) {
    const c = Hct.fromInt(argb);
    if (c.chroma < 10 && c.tone > 88) white += n;
    else if (c.tone < 14) black += n;
    if (c.chroma >= 15) coloured.push({ hue: c.hue, share: n / Math.max(1, total) });
  }

  // Score ranks colours that make good themes; keep real colours, drop near-whites, near-blacks and twins.
  const seeds: LogoSeed[] = [];
  const kept: Hct[] = [];
  for (const argb of Score.score(counts, { desired: 6, filter: true, fallbackColorARGB: 0 })) {
    if (argb === 0) continue;
    const c = Hct.fromInt(argb);
    if (c.chroma < 16 || c.tone < 12 || c.tone > 92) continue;
    if (kept.some((k) => hueGap(k.hue, c.hue) < 18 && Math.abs(k.tone - c.tone) < 22)) continue;
    kept.push(c);
    const share = coloured
      .filter((x) => hueGap(x.hue, c.hue) < 20)
      .reduce((sum, x) => sum + x.share, 0);
    seeds.push({ hex: hexFromArgb(argb).toUpperCase(), share: Math.min(1, share) });
    if (seeds.length === 3) break;
  }

  return {
    seeds,
    white: total ? white / total : 0,
    black: total ? black / total : 0,
    seeThrough,
    edge,
    whiteBox: Boolean(edgeTone && edgeTone.tone > 92 && edgeTone.chroma < 6),
  };
}

interface Draft {
  id: StyleId;
  group: StyleGroup;
  seed: string;
  pageColor: string;
  cardColor: string;
  brandColor: string;
  bonus: number;
  pair?: boolean;
}

function scored(draft: Draft, logo: LogoReading, main: Hct): ShopStyle {
  const surface = surfaceForPage(draft.pageColor);
  const p = shopPalette(draft.brandColor, surface, draft.pageColor, draft.cardColor);
  const brand = hctOf(draft.brandColor);
  const notes: StyleNote[] = [];
  let score = 100 + draft.bonus;

  // Readability always passes (the palette makes sure); a style is ranked on how little it had to move.
  const shop10 = hexToOklch(draft.brandColor);
  const drawn = /oklch\(([\d.]+)/.exec(p.shop10);
  const moved = shop10 && drawn?.[1] ? Math.abs(Number(drawn[1]) - shop10.l) : 0;
  score -= Math.min(30, moved * 110);
  if (moved > 0.02)
    notes.push(Number(drawn?.[1]) < (shop10?.l ?? 0) ? 'buttonsDeeper' : 'buttonsLighter');

  const page = hctOf(draft.pageColor);
  if (DislikeAnalyzer.isDisliked(page)) score -= 20;

  // The logo must show on the page: a logo that blends in gets a ring and a lower score.
  const logoColour = logo.edge ?? logo.seeds[0]?.hex ?? null;
  const ring = logoColour ? contrastRatio(logoColour, draft.pageColor) < 1.35 : false;
  if (ring) {
    score -= 10;
    notes.push('logoRing');
  }

  // Cards should differ a little from the page.
  if (Math.abs(page.tone - hctOf(draft.cardColor).tone) < 2.5) score -= 4;

  // Harmony: a coloured page is the brand's family or its opposite, nothing in between.
  if (page.chroma > 12) {
    const gap = hueGap(page.hue, brand.hue);
    if (gap >= 40 && gap <= 150) score -= 12;
  }

  // Dark logos and logos with a lot of black sit well on dark pages.
  const dark = surface === 'dark';
  if (main.tone < 35) score += dark ? 6 : -2;
  if (logo.black > 0.12 && dark) score += 5;
  if (draft.pair) score += 4;
  // Paper suits warm browns, oranges and golds (coffee, bakeries).
  if (draft.id === 'paper' && main.hue > 35 && main.hue < 100) score += 6;
  if (draft.id === 'paper' && main.hue > 170 && main.hue < 300) score -= 14;

  return {
    id: draft.id,
    group: draft.group,
    seed: draft.seed,
    pageColor: draft.pageColor,
    cardColor: draft.cardColor,
    brandColor: draft.brandColor,
    surface,
    score: Math.round(score),
    best: false,
    ring,
    notes,
  };
}

/** The 8 shop styles for a logo (or for one colour when there's no logo), best match first. */
export function shopStyles(logo: LogoReading | null, fallback: string = FALLBACK_SEED): StyleSet {
  const reading: LogoReading = logo ?? {
    seeds: [],
    white: 0,
    black: 0,
    seeThrough: true,
    edge: null,
    whiteBox: false,
  };
  const seeds = reading.seeds.length ? reading.seeds : [{ hex: fallback.toUpperCase(), share: 0 }];
  const mainSeed = seeds[0] ?? { hex: FALLBACK_SEED, share: 0 };
  const main = hctOf(mainSeed.hex);
  const h = main.hue;
  const second = seeds.find((s) => hueGap(hctOf(s.hex).hue, h) > 30);
  const neighbour = new TemperatureCache(main).analogous(3, 6)[2];
  const partner = second
    ? second.hex
    : neighbour
      ? hexFromArgb(neighbour.toInt()).toUpperCase()
      : mainSeed.hex;
  const ph = hctOf(partner).hue;
  // The Big style: the brand colour fills the page at a tone that still carries white words.
  const bigPage = main.tone > 25 && main.tone < 70 ? mainSeed.hex : hexOf(h, main.chroma, 45);
  const ink = hexOf(h, 6, 12);

  const drafts: Draft[] = [
    {
      id: 'white',
      group: 'light',
      seed: mainSeed.hex,
      pageColor: '#FFFFFF',
      cardColor: hexOf(h, 2, 96.5),
      brandColor: mainSeed.hex,
      bonus: 1,
    },
    {
      id: 'tint',
      group: 'light',
      seed: mainSeed.hex,
      pageColor: hexOf(h, 8, 96),
      cardColor: '#FFFFFF',
      brandColor: mainSeed.hex,
      bonus: 2,
    },
    {
      id: 'paper',
      group: 'light',
      seed: mainSeed.hex,
      pageColor: hexOf(80, 9, 95.5),
      cardColor: '#FFFFFF',
      brandColor: mainSeed.hex,
      bonus: 0,
    },
    {
      id: 'pair',
      group: 'light',
      seed: partner,
      pageColor: hexOf(ph, 14, 94),
      cardColor: '#FFFFFF',
      brandColor: mainSeed.hex,
      bonus: 0,
      pair: Boolean(second),
    },
    {
      id: 'night',
      group: 'dark',
      seed: mainSeed.hex,
      pageColor: hexOf(h, 3, 7),
      cardColor: hexOf(h, 4, 13),
      brandColor: mainSeed.hex,
      bonus: 2,
    },
    {
      id: 'deep',
      group: 'dark',
      seed: mainSeed.hex,
      pageColor: hexOf(h, Math.min(main.chroma * 0.55, 28), 13),
      cardColor: hexOf(h, Math.min(main.chroma * 0.5, 26), 19),
      brandColor: second ? second.hex : mainSeed.hex,
      bonus: 0,
      pair: Boolean(second),
    },
    {
      id: 'ink',
      group: 'bold',
      seed: mainSeed.hex,
      pageColor: ink,
      cardColor: '#FFFFFF',
      brandColor: mainSeed.hex,
      bonus: -4,
    },
    {
      id: 'bold',
      group: 'bold',
      seed: mainSeed.hex,
      pageColor: bigPage,
      cardColor: '#FFFFFF',
      brandColor: ink,
      bonus: -2,
    },
  ];
  const styles = drafts.map((d) => scored(d, reading, main)).sort((a, b) => b.score - a.score);
  const top = styles[0];
  if (top) top.best = true;
  return { styles, seeds: reading.seeds, partner };
}

export const STYLE_TWEAKS = ['lighter', 'deeper', 'warmer', 'cooler'] as const;
export type StyleTweak = (typeof STYLE_TWEAKS)[number];

/** "More like this": the same style a little lighter, deeper, warmer or cooler (page and cards move). */
export function tweakStyle(style: ShopStyle, tweak: StyleTweak): ShopStyle {
  const move = (hex: string): string => {
    const c = hctOf(hex);
    const dark = c.tone < 50;
    switch (tweak) {
      case 'lighter':
        return hexOf(c.hue, c.chroma, Math.min(100, c.tone + (dark ? 5 : 2)));
      case 'deeper':
        return hexOf(c.hue, c.chroma, Math.max(0, c.tone - (dark ? 4 : 3)));
      case 'warmer':
        return hexOf(70, Math.max(c.chroma, 5), c.tone);
      case 'cooler':
        return hexOf(250, Math.max(c.chroma, 5), c.tone);
    }
  };
  const pageColor = move(style.pageColor);
  const cardColor = style.cardColor === '#FFFFFF' ? style.cardColor : move(style.cardColor);
  return { ...style, pageColor, cardColor, surface: surfaceForPage(pageColor), best: false };
}

/** Swatches for fine-tuning each colour, built from the logo's main colour. */
export function tuneSwatches(main: string, pageColor: string) {
  const c = hctOf(main);
  const h = c.hue;
  const page = hctOf(pageColor);
  const pageDark = page.tone < 50;
  return {
    page: [
      { id: 'white', hex: '#FFFFFF' },
      { id: 'offWhite', hex: hexOf(h, 2, 97.5) },
      { id: 'tint', hex: hexOf(h, 8, 96) },
      { id: 'paper', hex: hexOf(80, 9, 95.5) },
      { id: 'night', hex: hexOf(h, 3, 7) },
      { id: 'deep', hex: hexOf(h, 26, 13) },
      { id: 'logo', hex: main.toUpperCase() },
    ],
    card: pageDark
      ? [
          { id: 'stepUp', hex: hexOf(page.hue, Math.min(page.chroma, 26), page.tone + 6) },
          { id: 'charcoal', hex: hexOf(h, 3, 16) },
          { id: 'white', hex: '#FFFFFF' },
        ]
      : [
          { id: 'white', hex: '#FFFFFF' },
          { id: 'softGrey', hex: hexOf(h, 2, 96.5) },
          { id: 'tint', hex: hexOf(h, 10, 94) },
          { id: 'ink', hex: hexOf(h, 6, 14) },
        ],
  } as const;
}

export type PageSwatchId = ReturnType<typeof tuneSwatches>['page'][number]['id'];
export type CardSwatchId = ReturnType<typeof tuneSwatches>['card'][number]['id'];
