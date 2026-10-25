import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BRAND_COLOR_PRESETS,
  contrastRatio as paletteContrast,
  DEMO_SHOPS,
  PALETTE_BLACK,
  shopPalette,
} from '@smartapp/core';

// OKLCH to sRGB conversion for WCAG contrast ratio calculation
function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const rLinear = +4.0767434078 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLinear = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLinear = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const toGamma = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  return [toGamma(rLinear), toGamma(gLinear), toGamma(bLinear)];
}

function srgbToLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseOklch(str: string): [number, number, number] {
  const match = str.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!match || !match[1] || !match[2] || !match[3]) {
    throw new Error(`Failed to parse oklch string: ${str}`);
  }
  return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
}

interface TextPair {
  bg: string;
  fg: string;
}

describe('Design Tokens Contrast', () => {
  const currentDir = import.meta.dirname ?? __dirname;
  const cssPath = resolve(currentDir, '../src/styles/tokens.css');
  const css = readFileSync(cssPath, 'utf-8');

  function extractToken(block: string, token: string): string {
    const regex = new RegExp(`--${token}:\\s*([^;]+);`);
    const match = block.match(regex);
    if (!match || !match[1]) {
      throw new Error(`Token --${token} not found`);
    }
    return match[1].trim();
  }

  const parts = css.split('.dark');
  const themePart = parts[0];
  const darkPart = parts[1];
  if (!themePart || !darkPart) {
    throw new Error('Could not split tokens.css into light and dark blocks');
  }

  const textPairs: readonly TextPair[] = [
    { bg: 'primary', fg: 'primary-foreground' },
    { bg: 'secondary', fg: 'secondary-foreground' },
    { bg: 'destructive', fg: 'destructive-foreground' },
    { bg: 'success', fg: 'success-foreground' },
    { bg: 'warning', fg: 'warning-foreground' },
    { bg: 'info', fg: 'info-foreground' },
    { bg: 'member', fg: 'member-foreground' },
    { bg: 'highlight', fg: 'highlight-foreground' },
    { bg: 'background', fg: 'foreground' },
    { bg: 'card', fg: 'card-foreground' },
    { bg: 'popover', fg: 'popover-foreground' },
    { bg: 'success-soft', fg: 'success-soft-foreground' },
    { bg: 'warning-soft', fg: 'warning-soft-foreground' },
    { bg: 'info-soft', fg: 'info-soft-foreground' },
    { bg: 'member-soft', fg: 'member-soft-foreground' },
    { bg: 'destructive-soft', fg: 'destructive-soft-foreground' },
    { bg: 'invert', fg: 'invert-foreground' },
    { bg: 'focus', fg: 'focus-foreground' },
    { bg: 'background', fg: 'destructive-text' },
  ];

  describe('Light Mode Text Contrast (>= 4.5:1)', () => {
    for (const pair of textPairs) {
      it(`${pair.bg} vs ${pair.fg}`, () => {
        const bgOklch = parseOklch(extractToken(themePart, pair.bg));
        const fgOklch = parseOklch(extractToken(themePart, pair.fg));
        const bgRgb = oklchToRgb(...bgOklch);
        const fgRgb = oklchToRgb(...fgOklch);
        const ratio = contrastRatio(srgbToLuminance(...bgRgb), srgbToLuminance(...fgRgb));
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    }
  });

  describe('Dark Mode Text Contrast (>= 4.5:1)', () => {
    for (const pair of textPairs) {
      it(`${pair.bg} vs ${pair.fg}`, () => {
        const bgOklch = parseOklch(extractToken(darkPart, pair.bg));
        const fgOklch = parseOklch(extractToken(darkPart, pair.fg));
        const bgRgb = oklchToRgb(...bgOklch);
        const fgRgb = oklchToRgb(...fgOklch);
        const ratio = contrastRatio(srgbToLuminance(...bgRgb), srgbToLuminance(...fgRgb));
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    }
  });
});

describe('Shop palette contrast (5 demo brands and the presets)', () => {
  const brands = [...DEMO_SHOPS.map((shop) => shop.brandColor), ...BRAND_COLOR_PRESETS];
  for (const hex of brands) {
    it(`${hex}: every text pair passes 4.5:1`, () => {
      const palette = shopPalette(hex);
      const pairs: readonly [string, string][] = [
        [palette.shop10, palette.shop10Foreground],
        [palette.shop10Hover, palette.shop10Foreground],
        [palette.shop60, PALETTE_BLACK],
        [palette.shop30, PALETTE_BLACK],
        [palette.shop10Soft, PALETTE_BLACK],
      ];
      for (const [bg, fg] of pairs) {
        expect(paletteContrast(bg, fg)).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
