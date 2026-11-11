// Makes the customer avatars once as small WebP files the storefront serves from /avatars, run with
// `pnpm --filter @smartapp/tooling avatars`; the packages never ship to customers. Customers get their own
// styles, none of the owner's faces (decision T80):
// - 24 DiceBear "Toon Head" default faces by Johan Melin (CC BY 4.0): default-01..24. The picker's Toon
//   set is the first 12 of them.
// - The picker's other sets, 12 each: "Big Smile" by Ashley Seo (CC BY 4.0) as smile-01..12, "Thumbs" by
//   DiceBear (CC0) as blob-01..12 with no background, so the shop's own soft colour shows behind it, and
//   "Adventurer" by Lisa Wischofsky (CC BY 4.0) as adventure-01..12. The CC BY ones are credited on Privacy.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as adventurer from '@dicebear/adventurer';
import * as bigSmile from '@dicebear/big-smile';
import { createAvatar } from '@dicebear/core';
import * as thumbs from '@dicebear/thumbs';
import * as toonHead from '@dicebear/toon-head';
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

// The blob's own colours (Thumbs), each with enough weight on a light or dark shop tint.
const BLOB_COLOURS = [
  'f97316',
  '0ea5e9',
  '16a34a',
  '9333ea',
  'e11d48',
  'ca8a04',
  '0d9488',
  '2563eb',
];

// 96 px = 2x the largest place they show (48 px).
const SIZE = 96;

// The picker's sets use the first 12 seeds; the picker shows them up to 64 px, so 128 px files.
const PICKER_SIZE = 128;
const PICKER_SEEDS = SEEDS.slice(0, 12);

// One drawing function per set, since each style has its own option types.
const PICKER_SETS = {
  smile: (seed: string, background: string) =>
    createAvatar(bigSmile, { seed, size: PICKER_SIZE, backgroundColor: [background] }).toString(),
  // No background: the storefront draws it on the shop's soft colour.
  blob: (seed: string) =>
    createAvatar(thumbs, {
      seed,
      size: PICKER_SIZE,
      backgroundColor: ['transparent'],
      // Strong colours only, so every blob stands out on a pale or a dark shop.
      shapeColor: BLOB_COLOURS,
    }).toString(),
  adventure: (seed: string, background: string) =>
    createAvatar(adventurer, { seed, size: PICKER_SIZE, backgroundColor: [background] }).toString(),
};

async function write(svg: string, size: number, name: string) {
  const file = path.join(OUTPUT_DIR, `${name}.webp`);
  await sharp(Buffer.from(svg)).resize(size, size).webp({ quality: 82 }).toFile(file);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const only = process.argv.slice(2);
  const wants = (set: string) => only.length === 0 || only.includes(set);
  if (wants('default')) {
    let index = 0;
    for (const seed of SEEDS) {
      index += 1;
      const background = BACKGROUNDS[(index - 1) % BACKGROUNDS.length] ?? 'e3f0d8';
      const svg = createAvatar(toonHead, {
        seed,
        size: SIZE,
        backgroundColor: [background],
      }).toString();
      await write(svg, SIZE, `default-${String(index).padStart(2, '0')}`);
    }
    console.log(`Wrote ${SEEDS.length} default avatars to ${OUTPUT_DIR}`);
  }
  for (const [set, draw] of Object.entries(PICKER_SETS)) {
    if (!wants(set)) continue;
    let index = 0;
    for (const seed of PICKER_SEEDS) {
      index += 1;
      const background = BACKGROUNDS[(index - 1) % BACKGROUNDS.length] ?? 'e3f0d8';
      await write(draw(seed, background), PICKER_SIZE, `${set}-${String(index).padStart(2, '0')}`);
    }
    console.log(`Wrote ${PICKER_SEEDS.length} ${set} avatars to ${OUTPUT_DIR}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
