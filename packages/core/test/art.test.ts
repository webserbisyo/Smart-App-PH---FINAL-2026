import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ART_KEYS, ArtKeyEnum, artPath } from '../src/art.js';
import { ORDER_STATUSES } from '../src/schemas/enums.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('Fluent 3D art', () => {
  it('has unique keys, a picture for every order status, and a WebP file for each', () => {
    expect(new Set(ART_KEYS).size).toBe(ART_KEYS.length);
    for (const status of ORDER_STATUSES) expect(ArtKeyEnum.safeParse(status).success).toBe(true);
    const dir = path.join(projectRoot, 'apps/storefront/public/art');
    expect(fs.existsSync(path.join(dir, 'LICENSE'))).toBe(true);
    for (const key of ART_KEYS) {
      expect(artPath(key)).toBe(`/art/${key}.webp`);
      expect(fs.existsSync(path.join(dir, `${key}.webp`))).toBe(true);
    }
  });
});
