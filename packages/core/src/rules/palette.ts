// Shop palette: one brand colour becomes a readable 60/30/10 palette (docs/design-tokens.md "Shop brand").
// Pure maths (OKLab/OKLCH and WCAG 2 contrast), no package.
import type { ShopSurface } from '../schemas/enums.js';

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export interface ShopPalette {
  /** The page (60): the owner's page colour, or near white (near black on a dark shop). */
  shop60: string;
  /** Cards, sheets and bars (30): the owner's card colour, or white (one step up on a dark page). */
  shop30: string;
  /** Body text on the cards (30), and on the page when both share a side. */
  foreground: string;
  /** The brand (10): filled buttons, the active tab, the cart. */
  shop10: string;
  shop10Foreground: string;
  shop10Hover: string;
  /** Brand-coloured text and rings on 60 and 30 (prices, links, focus). */
  shop10Text: string;
  /** A soft brand tint (chips, selected rows) and the text on it. */
  shop10Soft: string;
  shop10SoftForeground: string;
  /** Only with a page colour: quiet fills, hovers and lines in the page's hue, so greys don't look pasted on. */
  tint: { muted: string; border: string } | null;
  /** The cards (30) are dark: the app's dark tokens apply to cards, sheets and dialogs. */
  dark: boolean;
  /** Page and cards are on different sides (white cards on a red page): the page gets its own words. */
  mixed: boolean;
  /** Words, captions and brand-coloured links straight on the page (60). */
  page: { foreground: string; muted: string; link: string };
  /** Captions on the cards when the cards are a chosen colour or differ from the page; else the app's own. */
  cardMuted: string | null;
}

export const DEFAULT_BRAND_COLOR = '#2456D3';

/** Colour presets the owner can pick (Editor). Includes a very light and a very dark one on purpose. */
export const BRAND_COLOR_PRESETS = [
  DEFAULT_BRAND_COLOR,
  '#1F9D55',
  '#E4572E',
  '#B83280',
  '#FFF3A3',
  '#0B1736',
] as const;

/** Text colours used on --shop-10: white, or the app's foreground (near black). */
export const PALETTE_WHITE = 'oklch(1 0 0)';
export const PALETTE_BLACK = 'oklch(0.145 0 0)';
/** Body text on a dark shop (the dark theme's foreground). */
export const PALETTE_LIGHT_TEXT = 'oklch(0.985 0 0)';

const MIN_TEXT_CONTRAST = 4.5;
/** Buttons, rings and other parts against what they sit on (WCAG 1.4.11). */
const MIN_UI_CONTRAST = 3;
/** How far --shop-10 may be darkened before we switch to black text instead. */
const MAX_DARKEN = 0.2;
const DARKEN_STEP = 0.005;
/** From this lightness a brand keeps its colour with black text. */
const LIGHT_BRAND = 0.7;
const HOVER_STEP = 0.06;

type Rgb = readonly [number, number, number];

function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v: number): number {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

function oklchToLinearRgb({ l, c, h }: Oklch): Rgb {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  const l1 = l + 0.3963377774 * a + 0.2158037573 * b;
  const m1 = l - 0.1055613458 * a - 0.0638541728 * b;
  const s1 = l - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l1 * l1 * l1;
  const m3 = m1 * m1 * m1;
  const s3 = s1 * s1 * s1;
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
}

function linearRgbToOklch([r, g, b]: Rgb): Oklch {
  const l1 = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m1 = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s1 = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const l = 0.2104542553 * l1 + 0.793617785 * m1 - 0.0040720468 * s1;
  const a = 1.9779984951 * l1 - 2.428592205 * m1 + 0.4505937099 * s1;
  const bb = 0.0259040371 * l1 + 0.7827717662 * m1 - 0.808675766 * s1;
  const c = Math.sqrt(a * a + bb * bb);
  const h = c < 1e-4 ? 0 : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { l, c, h };
}

function inGamut(rgb: Rgb): boolean {
  return rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
}

/** Lowers chroma until the colour fits in sRGB, so the printed OKLCH is exactly what renders. */
function toGamut(color: Oklch): Oklch {
  const l = Math.min(1, Math.max(0, color.l));
  if (inGamut(oklchToLinearRgb({ ...color, l }))) return { ...color, l };
  let lo = 0;
  let hi = color.c;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinearRgb({ l, c: mid, h: color.h }))) lo = mid;
    else hi = mid;
  }
  return { l, c: lo, h: color.h };
}

function relativeLuminance(color: Oklch): number {
  const [r, g, b] = oklchToLinearRgb(toGamut(color)).map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

export function hexToOklch(hex: string): Oklch | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  const digits = match?.[1];
  if (!digits) return null;
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((d) => d + d)
          .join('')
      : digits;
  const channel = (i: number): number => srgbToLinear(parseInt(full.slice(i, i + 2), 16) / 255);
  return linearRgbToOklch([channel(0), channel(2), channel(4)]);
}

/** OKLCH of an 8-bit sRGB pixel (0 to 255 per channel), e.g. from a canvas. */
export function rgbToOklch(r: number, g: number, b: number): Oklch {
  return linearRgbToOklch([srgbToLinear(r / 255), srgbToLinear(g / 255), srgbToLinear(b / 255)]);
}

export function parseOklch(value: string): Oklch | null {
  const match = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/[^)]*)?\)$/.exec(value.trim());
  if (!match?.[1] || !match[2] || !match[3]) return null;
  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

function parseColor(value: string): Oklch | null {
  return value.trim().startsWith('oklch(') ? parseOklch(value) : hexToOklch(value);
}

const round = (n: number, digits: number): number => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

export function formatOklch(color: Oklch): string {
  const fitted = toGamut(color);
  return `oklch(${round(fitted.l, 3)} ${round(fitted.c, 3)} ${round(fitted.h, 1)})`;
}

/** The sRGB hex of an OKLCH colour (gamut-mapped). Used for theme-color meta tags. */
export function oklchToHex(color: Oklch): string {
  const rgb = oklchToLinearRgb(toGamut(color));
  return `#${rgb
    .map((v) =>
      Math.round(Math.min(1, Math.max(0, linearToSrgb(Math.min(1, Math.max(0, v))))) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** WCAG 2 contrast ratio of two colours (hex or `oklch(l c h)` strings); 1 when either can't be read. */
export function contrastRatio(a: string, b: string): number {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return 1;
  const la = relativeLuminance(ca);
  const lb = relativeLuminance(cb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function contrastOf(a: Oklch, b: string): number {
  return contrastRatio(formatOklch(a), b);
}

/** Darkens `base` in small steps until white text reaches 4.5:1, down to `floor`. */
function darkenForWhite(base: Oklch, floor: number): Oklch | null {
  for (let l = base.l; l >= floor; l -= DARKEN_STEP) {
    const candidate = toGamut({ ...base, l });
    if (contrastOf(candidate, PALETTE_WHITE) >= MIN_TEXT_CONTRAST) return candidate;
  }
  return null;
}

/** Moves the lightness of `base` until text of `against` (or on it) reaches 4.5:1. */
// A small margin: the colour is written rounded, and the browser draws that rounded value (T83). When no
// shade reaches the margin, the plain 4.5:1 rule decides.
const READABLE_MARGIN = 0.1;

function firstReadable(base: Oklch, against: string, step: number, min: number): Oklch | null {
  for (let l = base.l; l >= 0 && l <= 1; l += step) {
    const candidate = toGamut({ ...base, l });
    if (contrastOf(candidate, against) >= min) return candidate;
  }
  return null;
}

function untilReadable(base: Oklch, against: string, direction: 'darker' | 'lighter'): Oklch {
  const step = direction === 'darker' ? -DARKEN_STEP : DARKEN_STEP;
  return (
    firstReadable(base, against, step, MIN_TEXT_CONTRAST + READABLE_MARGIN) ??
    firstReadable(base, against, step, MIN_TEXT_CONTRAST) ??
    toGamut({ ...base, l: direction === 'darker' ? 0.2 : 0.9 })
  );
}

/** Black or white text, whichever reads better on `bg`; every colour has one of the two at 4.5:1 or more. */
function wordsOn(bg: Oklch): { text: string; dark: boolean } {
  const onWhite = contrastOf(bg, PALETTE_LIGHT_TEXT);
  const onBlack = contrastOf(bg, PALETTE_BLACK);
  if (onWhite <= onBlack) return { text: PALETTE_BLACK, dark: false };
  // Pure white when the soft white falls just short (a strong red page).
  return { text: onWhite >= MIN_TEXT_CONTRAST ? PALETTE_LIGHT_TEXT : PALETTE_WHITE, dark: true };
}

/** A quiet grey in the surface's hue that still reads at 4.5:1 (captions, hints). */
function mutedOn(bg: Oklch, dark: boolean): string {
  const start: Oklch = { l: dark ? 0.78 : 0.48, c: Math.min(0.02, bg.c), h: bg.h };
  return formatOklch(untilReadable(start, formatOklch(bg), dark ? 'lighter' : 'darker'));
}

/** Light or dark for a page colour: dark when white words read better on it (T76 C4). */
export function surfaceForPage(pageColor: string): ShopSurface {
  const page = hexToOklch(pageColor);
  return page && wordsOn(toGamut(page)).dark ? 'dark' : 'light';
}

/**
 * Builds the shop palette (decisions R2, R52, T76). Any page (60), card (30) and brand (10) colour is
 * allowed; only the words and the brand's lightness move so everything reads:
 * - Words on the page and on the cards are black or white, whichever reads better (C1).
 * - --shop-10 keeps the brand's hue and strength; its lightness moves the least it can until the button
 *   words reach 4.5:1 and the button stands out 3:1 from the page or the cards (C2). A light brand (gold,
 *   pale yellow) keeps its colour with black words.
 * - No page colour keeps the neutral page: near white, or near black when `surface` is dark.
 * - No card colour: white cards on a light page, cards one step lighter on a dark one (C3).
 * - Light or dark comes from the colours, not from `surface`, once a page colour is set (C4). When the page
 *   and the cards are on different sides (white cards on a red page), `mixed` is true and the page gets its
 *   own words, captions and links.
 * An unreadable brand falls back to the default blue.
 */
export function shopPalette(
  hex: string,
  surface: ShopSurface = 'light',
  pageColor?: string | null,
  cardColor?: string | null,
): ShopPalette {
  const brand = hexToOklch(hex) ?? hexToOklch(DEFAULT_BRAND_COLOR);
  if (!brand) throw new Error('Default brand colour is invalid');
  const base = toGamut(brand);

  const pageBase = pageColor ? hexToOklch(pageColor) : null;
  const page: Oklch = pageBase
    ? toGamut(pageBase)
    : surface === 'dark'
      ? { l: 0.16, c: Math.min(0.008, base.c), h: base.h }
      : { l: 0.982, c: Math.min(0.003, base.c), h: base.h };
  const pageWords = wordsOn(page);
  const pageDark = pageWords.dark;

  const cardBase = cardColor ? hexToOklch(cardColor) : null;
  const card: Oklch = cardBase
    ? toGamut(cardBase)
    : pageDark
      ? pageBase
        ? toGamut({ ...page, l: page.l + 0.055 })
        : { l: 0.215, c: Math.min(0.01, base.c), h: base.h }
      : { l: 1, c: 0, h: 0 };
  const cardWords = wordsOn(card);
  const dark = cardWords.dark;
  const mixed = dark !== pageDark;

  // The brand (10): a light brand keeps its colour with black words (decision R52).
  const keepLight = base.l >= LIGHT_BRAND && contrastOf(base, PALETTE_BLACK) >= MIN_TEXT_CONTRAST;
  let shop10 = keepLight ? null : darkenForWhite(base, Math.max(0, base.l - MAX_DARKEN));
  let foreground = PALETTE_WHITE;
  if (!shop10) {
    if (contrastOf(base, PALETTE_BLACK) >= MIN_TEXT_CONTRAST) {
      shop10 = base;
      foreground = PALETTE_BLACK;
    } else {
      shop10 = darkenForWhite(base, 0) ?? { ...base, l: 0.3 };
    }
  }
  // Buttons must stand out from where they sit (WCAG 1.4.11): the page and the cards both, or else at least
  // the page (the cart button floats on it). Only the lightness moves, keeping readable words.
  const pageHex = formatOklch(page);
  const cardHex = formatOklch(card);
  const fits = (c: Oklch, both: boolean) =>
    contrastOf(c, pageHex) >= MIN_UI_CONTRAST &&
    (!both || contrastOf(c, cardHex) >= MIN_UI_CONTRAST);
  const wordsFor = (c: Oklch) =>
    contrastOf(c, PALETTE_WHITE) >= MIN_TEXT_CONTRAST ? PALETTE_WHITE : PALETTE_BLACK;
  if (!fits(shop10, true)) {
    let found: Oklch | null = null;
    for (const both of [true, false]) {
      for (let d = DARKEN_STEP; d < 0.6 && !found; d += DARKEN_STEP) {
        for (const l of [shop10.l - d, shop10.l + d]) {
          if (l <= 0.05 || l >= 0.98) continue;
          const candidate = toGamut({ ...shop10, l });
          if (
            fits(candidate, both) &&
            contrastOf(candidate, wordsFor(candidate)) >= MIN_TEXT_CONTRAST
          ) {
            found = candidate;
            break;
          }
        }
      }
      if (found) break;
    }
    if (found) {
      shop10 = found;
      foreground = wordsFor(found);
    }
  }

  // Hover goes 0.06 darker; with black text it goes lighter instead so the text stays readable.
  const darkerHover = toGamut({ ...shop10, l: shop10.l - HOVER_STEP });
  const hover =
    contrastOf(darkerHover, foreground) >= MIN_TEXT_CONTRAST
      ? darkerHover
      : toGamut({ ...shop10, l: Math.min(0.98, shop10.l + HOVER_STEP) });

  // Chips and selected rows: a soft brand tint a step beyond the surfaces it sits on (page and cards).
  const pageTinted = Boolean(pageBase) && !mixed && !cardBase;
  const soft: Oklch = dark
    ? toGamut(
        pageTinted
          ? { l: card.l + 0.1, c: Math.min(0.08, page.c), h: page.h }
          : { l: Math.min(0.42, card.l + 0.1), c: Math.min(0.06, base.c), h: base.h },
      )
    : toGamut({
        l: Math.min(0.95, (mixed ? card.l : Math.min(page.l, card.l)) - 0.04),
        c: Math.min(pageTinted ? 0.06 : 0.035, base.c),
        h: base.h,
      });

  // With a page colour, quiet fills and lines follow its hue (not when page and cards differ in side).
  let tint: ShopPalette['tint'] = null;
  if (pageTinted) {
    tint = dark
      ? {
          muted: formatOklch({ l: card.l + 0.04, c: Math.min(0.05, page.c), h: page.h }),
          border: formatOklch({ l: card.l + 0.1, c: Math.min(0.05, page.c), h: page.h }),
        }
      : {
          muted: formatOklch({ l: page.l - 0.03, c: Math.min(0.03, page.c), h: page.h }),
          border: formatOklch({ l: page.l - 0.09, c: Math.min(0.04, page.c), h: page.h }),
        };
  }

  const direction = (bg: Oklch, isDark: boolean) =>
    formatOklch(untilReadable(base, formatOklch(bg), isDark ? 'lighter' : 'darker'));
  // Brand-coloured words (prices, links) must read on the harder of the two surfaces when they share a
  // side (the darker one on a light shop, the lighter one on a dark shop); else on the cards.
  const harder = dark === card.l < page.l ? page : card;
  const linkOn = mixed ? card : harder;

  return {
    shop60: formatOklch(page),
    shop30: cardBase || pageDark || dark ? formatOklch(card) : PALETTE_WHITE,
    foreground: cardWords.text === PALETTE_LIGHT_TEXT ? PALETTE_LIGHT_TEXT : PALETTE_BLACK,
    shop10: formatOklch(shop10),
    shop10Foreground: foreground,
    shop10Hover: formatOklch(hover),
    shop10Text: direction(linkOn, dark),
    shop10Soft: formatOklch(soft),
    shop10SoftForeground: formatOklch(
      untilReadable(base, formatOklch(soft), dark ? 'lighter' : 'darker'),
    ),
    tint,
    dark,
    mixed,
    page: {
      foreground: pageWords.text,
      muted: mutedOn(page, pageDark),
      link: direction(page, pageDark),
    },
    // Always set (T83): a dark shop's captions read at 4.5:1 on its own cards, never the app's grey.
    cardMuted: mutedOn(card, dark),
  };
}
