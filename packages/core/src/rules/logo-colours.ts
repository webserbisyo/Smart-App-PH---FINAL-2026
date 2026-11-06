// "Colours from your logo" (decision T73): the logo's strongest colours, worked out on the owner's device.
// Pure maths on RGBA pixels (k-means in OKLab), no package. The caller draws the logo small (64 x 64) first.
import { oklchToHex, rgbToOklch, type Oklch } from './palette.js';

export interface LogoColour {
  hex: string;
  /** Share of the logo's coloured pixels, 0 to 1. */
  share: number;
}

export interface LogoPalette {
  brandColor: string;
  /** null keeps the plain page; a colour tints the page (the 60) in that hue. */
  pageColor: string | null;
}

interface Lab {
  l: number;
  a: number;
  b: number;
}

// Pixels this see-through, or this grey (white, black, outlines), say nothing about the brand.
const MIN_ALPHA = 128;
const MIN_CHROMA = 0.045;
const CLUSTERS = 5;
const ROUNDS = 12;
// Clusters closer than this are one colour; smaller than this share are specks.
const SAME_COLOUR = 0.07;
const MIN_SHARE = 0.04;

function toLab({ l, c, h }: Oklch): Lab {
  const rad = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
}

function toOklch({ l, a, b }: Lab): Oklch {
  const c = Math.sqrt(a * a + b * b);
  return { l, c, h: c < 1e-4 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

function distance(p: Lab, q: Lab): number {
  return Math.hypot(p.l - q.l, p.a - q.a, p.b - q.b);
}

function chroma(p: Lab): number {
  return Math.hypot(p.a, p.b);
}

/** The logo's main colours, most used first (at most `max`); empty when the logo is only greys. */
export function logoColours(rgba: ArrayLike<number>, max = 3): LogoColour[] {
  const points: Lab[] = [];
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if ((rgba[i + 3] ?? 0) < MIN_ALPHA) continue;
    const lab = toLab(rgbToOklch(rgba[i] ?? 0, rgba[i + 1] ?? 0, rgba[i + 2] ?? 0));
    if (chroma(lab) >= MIN_CHROMA) points.push(lab);
  }
  if (points.length === 0) return [];

  // Same answer every time: start from the most colourful pixel, then the one farthest from the centres so far.
  const first = points.reduce((best, p) => (chroma(p) > chroma(best) ? p : best));
  const centres: Lab[] = [first];
  while (centres.length < Math.min(CLUSTERS, points.length)) {
    let far = first;
    let farDistance = -1;
    for (const p of points) {
      const nearest = Math.min(...centres.map((c) => distance(p, c)));
      if (nearest > farDistance) {
        farDistance = nearest;
        far = p;
      }
    }
    if (farDistance <= 0) break;
    centres.push(far);
  }

  let counts = centres.map(() => 0);
  for (let round = 0; round < ROUNDS; round += 1) {
    const sums = centres.map(() => ({ l: 0, a: 0, b: 0 }));
    counts = centres.map(() => 0);
    for (const p of points) {
      let best = 0;
      for (let k = 1; k < centres.length; k += 1) {
        const ck = centres[k];
        const cb = centres[best];
        if (ck && cb && distance(p, ck) < distance(p, cb)) best = k;
      }
      const sum = sums[best];
      if (sum) {
        sum.l += p.l;
        sum.a += p.a;
        sum.b += p.b;
      }
      counts[best] = (counts[best] ?? 0) + 1;
    }
    centres.forEach((c, k) => {
      const n = counts[k] ?? 0;
      const sum = sums[k];
      if (n > 0 && sum) centres[k] = { l: sum.l / n, a: sum.a / n, b: sum.b / n };
      else centres[k] = c;
    });
  }

  // Merge near twins, drop specks, most used first.
  const groups: { lab: Lab; count: number }[] = [];
  centres
    .map((lab, k) => ({ lab, count: counts[k] ?? 0 }))
    .filter((g) => g.count > 0)
    .sort((x, y) => y.count - x.count)
    .forEach((g) => {
      const twin = groups.find((other) => distance(other.lab, g.lab) < SAME_COLOUR);
      if (twin) twin.count += g.count;
      else groups.push({ ...g });
    });
  return groups
    .map((g) => ({ hex: oklchToHex(toOklch(g.lab)).toUpperCase(), share: g.count / points.length }))
    .filter((g) => g.share >= MIN_SHARE)
    .slice(0, max);
}

/**
 * Up to three ready looks from the logo's colours: the main colour on a plain page, the main colour on a
 * page tinted in it, then the second colour on a plain page.
 */
export function logoPalettes(colours: readonly LogoColour[]): LogoPalette[] {
  const [main, second] = colours;
  if (!main) return [];
  const looks: LogoPalette[] = [
    { brandColor: main.hex, pageColor: null },
    { brandColor: main.hex, pageColor: main.hex },
  ];
  if (second) looks.push({ brandColor: second.hex, pageColor: null });
  return looks;
}
