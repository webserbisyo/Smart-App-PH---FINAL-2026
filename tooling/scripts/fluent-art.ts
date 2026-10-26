// Downloads Fluent Emoji 3D pictures (MIT) once and saves them as small WebP files for the
// storefront's empty, success and order-step states. Run: pnpm --filter @smartapp/tooling art
// (or `... art printer` to fetch only the named keys).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TARGET_DIR = path.join(root, 'apps/storefront/public/art');
const RAW = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main';
// Shown at up to 96 CSS px, so 192 px covers 2x screens.
const SIZE = 192;

// Art key (packages/core/src/art.ts) -> Fluent Emoji folder in microsoft/fluentui-emoji/assets.
const ART: Record<string, string> = {
  basket_empty: 'Shopping cart',
  search_empty: 'Magnifying glass tilted left',
  favourites_empty: 'Sparkling heart',
  orders_empty: 'Receipt',
  placed: 'Memo',
  preparing: 'Hourglass not done',
  ready: 'Shopping bags',
  out_for_delivery: 'Motor scooter',
  completed: 'Party popper',
  cancelled: 'Cross mark',
  expired: 'Alarm clock',
  paid: 'Money with wings',
  offline: 'Cloud',
  not_found: 'Compass',
  privacy: 'Locked',
  install: 'Mobile phone',
  closed: 'Crescent moon',
  gift: 'Wrapped gift',
  trophy: 'Trophy',
  printer: 'Printer',
};

function pngPath(folder: string): string {
  const file = folder.toLowerCase().replace(/[\s-]+/g, '_') + '_3d.png';
  return `assets/${folder}/3D/${file}`;
}

async function main() {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  const licence = await fetch(`${RAW}/LICENSE`);
  if (!licence.ok) throw new Error(`LICENSE: HTTP ${licence.status}`);
  fs.writeFileSync(path.join(TARGET_DIR, 'LICENSE'), await licence.text(), 'utf8');

  const only = process.argv.slice(2);
  for (const [key, folder] of Object.entries(ART)) {
    if (only.length > 0 && !only.includes(key)) continue;
    const url = `${RAW}/${encodeURI(pngPath(folder))}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${key}: HTTP ${res.status} for ${url}`);
    const input = Buffer.from(await res.arrayBuffer());
    const dest = path.join(TARGET_DIR, `${key}.webp`);
    await sharp(input).resize(SIZE, SIZE, { fit: 'contain' }).webp({ quality: 82 }).toFile(dest);
    console.log(`${key}.webp  ${(fs.statSync(dest).size / 1024).toFixed(1)} KB  (${folder})`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
