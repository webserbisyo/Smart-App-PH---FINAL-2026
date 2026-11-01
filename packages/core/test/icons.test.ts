import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { categoryIconUrl, ICON_KEYS, IconKeyEnum, iconPath } from '../src/icons.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

describe('Icons', () => {
  it('has exactly 200 keys', () => {
    expect(ICON_KEYS).toHaveLength(200);
  });

  it('has knife and no kitchen_knife', () => {
    expect(ICON_KEYS).toContain('knife');
    expect(ICON_KEYS).not.toContain('kitchen_knife');
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
      expect(p).toBe(`/icons/fluent/flat/${key}.svg`);
    }
    expect(iconPath({ kind: 'fluent', key: 'burger', style: 'color' })).toBe(
      '/icons/fluent/color/burger.webp',
    );
    expect(iconPath({ kind: 'fluent', key: 'burger', style: '3d' })).toBe(
      '/icons/fluent/3d/burger.webp',
    );
    expect(iconPath({ kind: 'emoji', char: '🍔' })).toBe('');
  });

  it('categoryIconUrl generates correct URLs across styles', () => {
    expect(categoryIconUrl('burger')).toBe('/icons/fluent/flat/burger.svg');
    expect(categoryIconUrl('burger', 'color')).toBe('/icons/fluent/color/burger.webp');
    expect(categoryIconUrl('burger', '3d')).toBe('/icons/fluent/3d/burger.webp');
    expect(categoryIconUrl({ kind: 'fluent', key: 'burger', style: '3d' })).toBe(
      '/icons/fluent/3d/burger.webp',
    );
    expect(categoryIconUrl({ kind: 'emoji', char: '🍔' })).toBeNull();
    expect(
      categoryIconUrl({ kind: 'fluent', key: 'burger', style: 'flat' }, undefined, 'https://cdn'),
    ).toBe('https://cdn/icons/fluent/flat/burger.svg');
  });

  it('verifies all 200 icon files and LICENSE exist on disk in flat, color and 3d', () => {
    const iconsDir = path.join(projectRoot, 'apps/storefront/public/icons/fluent');
    expect(fs.existsSync(iconsDir)).toBe(true);

    for (const key of ICON_KEYS) {
      const flatPath = path.join(iconsDir, 'flat', `${key}.svg`);
      expect(fs.existsSync(flatPath), `Flat icon file missing: ${flatPath}`).toBe(true);

      const colorPath = path.join(iconsDir, 'color', `${key}.webp`);
      expect(fs.existsSync(colorPath), `Color icon file missing: ${colorPath}`).toBe(true);

      const threeDPath = path.join(iconsDir, '3d', `${key}.webp`);
      expect(fs.existsSync(threeDPath), `3D icon file missing: ${threeDPath}`).toBe(true);
    }

    const licensePath = path.join(iconsDir, 'LICENSE');
    expect(fs.existsSync(licensePath)).toBe(true);
  });
});
