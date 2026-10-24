import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ICON_KEYS, IconKeyEnum, iconPath } from '../src/icons.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

describe('Icons', () => {
  it('has exactly 52 keys', () => {
    expect(ICON_KEYS).toHaveLength(52);
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

  it('generates correct iconPath format', () => {
    for (const key of ICON_KEYS) {
      const p = iconPath(key);
      expect(p).toBe(`/icons/fluent/${key}.svg`);
    }
  });

  it('verifies all 52 SVG icon files and LICENSE exist on disk', () => {
    const iconsDir = path.join(projectRoot, 'apps/storefront/public/icons/fluent');
    expect(fs.existsSync(iconsDir)).toBe(true);

    for (const key of ICON_KEYS) {
      const filePath = path.join(iconsDir, `${key}.svg`);
      expect(fs.existsSync(filePath), `Icon file missing: ${filePath}`).toBe(true);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('<svg');
    }

    const licensePath = path.join(iconsDir, 'LICENSE');
    expect(fs.existsSync(licensePath)).toBe(true);
  });
});
