// Makes the customer avatars once as small WebP files the storefront serves from /avatars, run with
// `pnpm --filter @smartapp/tooling avatars`; the packages never ship to customers.
// - 24 DiceBear "Notionists" default faces (decision R11; design CC0, code MIT): default-01..24.
// - The avatar picker's other two sets (decision R23), 12 each: "Lorelei" by Lisa Wischofsky (CC0)
//   as lorelei-01..12 and "Micah" by Micah Lanier (CC BY 4.0, credited on Privacy) as micah-01..12.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAvatar } from '@dicebear/core';
import * as lorelei from '@dicebear/lorelei';
import * as micah from '@dicebear/micah';
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

// The picker's sets use the first 12 seeds; the picker shows them up to 64 px, so 128 px files.
const PICKER_SIZE = 128;
const PICKER_SEEDS = SEEDS.slice(0, 12);

// One drawing function per set, since each style has its own option types.
const PICKER_SETS = {
  lorelei: (seed: string, background: string) =>
    createAvatar(lorelei, { seed, size: PICKER_SIZE, backgroundColor: [background] }).toString(),
  micah: (seed: string, background: string) =>
    createAvatar(micah, { seed, size: PICKER_SIZE, backgroundColor: [background] }).toString(),
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
      const svg = createAvatar(notionists, {
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
