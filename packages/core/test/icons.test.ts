import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  categoryIconUrl,
  charToCodepoint,
  ICON_KEYS,
  IconKeyEnum,
  iconPath,
} from '../src/icons.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

describe('Icons', () => {
  it('has exactly 200 keys', () => {
    expect(ICON_KEYS).toHaveLength(200);
  });

  it('has no duplicate keys', () => {
    const uniqueKeys = new Set(ICON_KEYS);
    expect(uniqueKeys.size).toBe(ICON_KEYS.length);
  });

  it('validates keys with IconKeyEnum', () => {
    for (const key of ICON_KEYS) {
      expect(IconKeyEnum.safeParse(key).success).toBe(true);
    }
    expect(IconKeyEnum.safeParse('not-an-icon').success).toBe(false);
  });

  it('generates correct iconPath format for strings and objects', () => {
    for (const key of ICON_KEYS) {
      const p = iconPath(key);
      expect(p).toBe(`/icons/fluent/${key}.svg`);
    }
    expect(iconPath({ kind: 'fluent', key: 'burger', style: 'color' })).toBe(
      '/icons/fluent/color/burger.svg',
    );
    expect(iconPath({ kind: 'fluent', key: 'burger', style: '3d' })).toBe(
      '/icons/fluent/3d/burger.webp',
    );
    expect(iconPath({ kind: 'emoji', char: '🍔' })).toBe('/icons/fluent/all/1f354.svg');
  });

  it('charToCodepoint maps characters correctly', () => {
    expect(charToCodepoint('🍔')).toBe('1f354');
    expect(charToCodepoint('☕')).toBe('2615');
  });

  it('categoryIconUrl generates correct URLs across styles', () => {
    expect(categoryIconUrl('burger')).toBe('/icons/fluent/flat/burger.svg');
    expect(categoryIconUrl('burger', 'color')).toBe('/icons/fluent/color/burger.svg');
    expect(categoryIconUrl('burger', '3d')).toBe('/icons/fluent/3d/burger.webp');
    expect(categoryIconUrl({ kind: 'fluent', key: 'burger', style: '3d' })).toBe(
      '/icons/fluent/3d/burger.webp',
    );
    expect(categoryIconUrl({ kind: 'emoji', char: '🍔' })).toBe('/icons/fluent/all/1f354.svg');
    expect(
      categoryIconUrl({ kind: 'fluent', key: 'burger', style: 'flat' }, undefined, 'https://cdn'),
    ).toBe('https://cdn/icons/fluent/flat/burger.svg');
  });

  it('verifies all 200 SVG icon files and LICENSE exist on disk in flat, color and 3d', () => {
    const iconsDir = path.join(projectRoot, 'apps/storefront/public/icons/fluent');
    expect(fs.existsSync(iconsDir)).toBe(true);

    for (const key of ICON_KEYS) {
      const legacyPath = path.join(iconsDir, `${key}.svg`);
      expect(fs.existsSync(legacyPath), `Legacy icon file missing: ${legacyPath}`).toBe(true);

      const flatPath = path.join(iconsDir, 'flat', `${key}.svg`);
      expect(fs.existsSync(flatPath), `Flat icon file missing: ${flatPath}`).toBe(true);

      const colorPath = path.join(iconsDir, 'color', `${key}.svg`);
      expect(fs.existsSync(colorPath), `Color icon file missing: ${colorPath}`).toBe(true);

      const threeDPath = path.join(iconsDir, '3d', `${key}.webp`);
      expect(fs.existsSync(threeDPath), `3D icon file missing: ${threeDPath}`).toBe(true);
    }

    const licensePath = path.join(iconsDir, 'LICENSE');
    expect(fs.existsSync(licensePath)).toBe(true);
  });
});
