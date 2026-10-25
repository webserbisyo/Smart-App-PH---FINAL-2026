// Shop palette: one brand colour becomes a readable 60/30/10 palette (docs/design-tokens.md "Shop brand").
// Pure maths (OKLab/OKLCH and WCAG 2 contrast), no package.

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export interface ShopPalette {
  shop60: string;
  shop30: string;
  shop10: string;
  shop10Foreground: string;
  shop10Soft: string;
  shop10Hover: string;
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

const MIN_TEXT_CONTRAST = 4.5;
/** How far --shop-10 may be darkened before we switch to black text instead. */
const MAX_DARKEN = 0.2;
const DARKEN_STEP = 0.005;
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

/**
 * Builds the shop palette from one brand colour (hex). An unreadable value falls back to the default brand blue.
 * --shop-10 is the brand colour darkened until white text reaches 4.5:1; when that would change the colour too
 * much (very light brands such as pale yellow), the colour stays and the text turns black.
 */
export function shopPalette(hex: string): ShopPalette {
  const brand = hexToOklch(hex) ?? hexToOklch(DEFAULT_BRAND_COLOR);
  if (!brand) throw new Error('Default brand colour is invalid');
  const base = toGamut(brand);

  let shop10 = darkenForWhite(base, Math.max(0, base.l - MAX_DARKEN));
  let foreground = PALETTE_WHITE;
  if (!shop10) {
    if (contrastOf(base, PALETTE_BLACK) >= MIN_TEXT_CONTRAST) {
      shop10 = base;
      foreground = PALETTE_BLACK;
    } else {
      shop10 = darkenForWhite(base, 0) ?? { ...base, l: 0.3 };
    }
  }

  // Hover goes 0.06 darker; with black text it goes lighter instead so the text stays readable.
  const darkerHover = toGamut({ ...shop10, l: shop10.l - HOVER_STEP });
  const hover =
    contrastOf(darkerHover, foreground) >= MIN_TEXT_CONTRAST
      ? darkerHover
      : toGamut({ ...shop10, l: Math.min(0.98, shop10.l + HOVER_STEP) });

  return {
    shop60: formatOklch({ l: 0.975, c: Math.min(0.012, base.c), h: base.h }),
    shop30: formatOklch({ l: 0.995, c: Math.min(0.004, base.c), h: base.h }),
    shop10: formatOklch(shop10),
    shop10Foreground: foreground,
    shop10Soft: formatOklch({ l: 0.93, c: Math.min(0.05, base.c), h: base.h }),
    shop10Hover: formatOklch(hover),
  };
}
