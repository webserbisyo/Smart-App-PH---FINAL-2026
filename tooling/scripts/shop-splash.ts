import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

// The demo shops' iPhone and iPad launch pictures as ready-made files (decision T125), like the dashboard's:
// iOS gets a plain file in the first bytes instead of a picture drawn on request. Each one is the storefront's
// own picture route (apps/storefront/src/app/[shop]/splash/[size]/route.ts) saved and made smaller, so the two
// never differ. Run with the storefront built and started on :3100 (or pass its address), after a demo shop's
// logo or opening colour changes or a screen is added:
//   pnpm --filter @smartapp/tooling shop:splash [http://localhost:3100]
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SCREENS_FILE = path.join(ROOT, 'packages/core/src/rules/ios-screens.ts');
const DEMO_DIR = path.join(ROOT, 'apps/storefront/public/demo');
const BASE = process.argv[2] ?? 'http://localhost:3100';

interface Screen {
  width: number;
  height: number;
  ratio: number;
}

function isScreen(value: unknown): value is Screen {
  if (typeof value !== 'object' || value === null) return false;
  return (
    'width' in value &&
    typeof value.width === 'number' &&
    'height' in value &&
    typeof value.height === 'number' &&
    'ratio' in value &&
    typeof value.ratio === 'number'
  );
}

async function readScreens(): Promise<Screen[]> {
  const loaded: unknown = await import(pathToFileURL(SCREENS_FILE).href);
  const list =
    typeof loaded === 'object' && loaded !== null && 'IOS_SCREENS' in loaded
      ? loaded.IOS_SCREENS
      : null;
  if (!Array.isArray(list) || !list.every(isScreen)) throw new Error('IOS_SCREENS not found');
  return list.filter(isScreen);
}

async function main() {
  const screens = await readScreens();
  // The demo shops with brand files: the storefront points only those at ready-made pictures.
  const slugs = fs
    .readdirSync(DEMO_DIR)
    .filter((slug) => fs.existsSync(path.join(DEMO_DIR, slug, 'brand', 'icon-512.png')));
  let count = 0;
  for (const slug of slugs) {
    const out = path.join(DEMO_DIR, slug, 'splash');
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });
    for (const screen of screens) {
      const size = `${screen.width * screen.ratio}x${screen.height * screen.ratio}`;
      const response = await fetch(`${BASE}/${slug}/splash/${size}`);
      if (!response.ok) throw new Error(`${slug} ${size}: ${response.status}`);
      const png = Buffer.from(await response.arrayBuffer());
      await sharp(png)
        .png({ compressionLevel: 9, palette: true })
        .toFile(path.join(out, `${size}.png`));
      count += 1;
    }
  }
  console.log(`${count} launch pictures for ${slugs.join(', ')}`);
}

await main();
