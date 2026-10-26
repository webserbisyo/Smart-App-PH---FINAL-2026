// Makes the default customer avatars once (decision R11): 24 DiceBear "Notionists" faces (design CC0,
// code MIT) on soft backgrounds, as small WebP files the storefront serves from /avatars. Run with
// `pnpm --filter @smartapp/tooling avatars`; the packages never ship to customers.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAvatar } from '@dicebear/core';
import * as notionists from '@dicebear/notionists';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../../apps/storefront/public/avatars');

// One seed per file; the same seed always draws the same face.
const SEEDS = [
  'Ligaya',
  'Bayani',
  'Mayumi',
  'Dakila',
  'Tala',
  'Amihan',
  'Lakan',
  'Diwa',
  'Hiraya',
  'Malaya',
  'Isko',
  'Liwayway',
  'Bituin',
  'Dalisay',
  'Kidlat',
  'Luningning',
  'Marikit',
  'Sinag',
  'Tanglaw',
  'Hiyas',
  'Bagwis',
  'Alon',
  'Ulan',
  'Habagat',
] as const;

// Soft, light backgrounds that read on light and dark shops.
const BACKGROUNDS = ['f6d8c8', 'd9e8f5', 'e3f0d8', 'f5e6b8', 'e8dcf3', 'f3d6dd'];

// 96 px = 2x the largest place they show (48 px).
const SIZE = 96;

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  let index = 0;
  for (const seed of SEEDS) {
    index += 1;
    const background = BACKGROUNDS[(index - 1) % BACKGROUNDS.length] ?? 'e3f0d8';
    const svg = createAvatar(notionists, {
      seed,
      size: SIZE,
      backgroundColor: [background],
    }).toString();
    const file = path.join(OUTPUT_DIR, `default-${String(index).padStart(2, '0')}.webp`);
    await sharp(Buffer.from(svg)).resize(SIZE, SIZE).webp({ quality: 82 }).toFile(file);
  }
  console.log(`Wrote ${SEEDS.length} avatars to ${OUTPUT_DIR}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
