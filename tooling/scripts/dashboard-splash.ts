import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

// The owner dashboard's iPhone and iPad launch pictures (decision T121): the Smart App PH mark on the page
// colour, light and dark, one per screen in packages/core/src/rules/ios-screens.ts. They match the opening
// screen in apps/dashboard/index.html (the mark at 96 CSS px, centred on the page), so the app goes from the
// picture straight into the page: the page starts under the status bar, so the picture's mark sits half a
// status bar below the screen's centre (T125). Run after a screen is added: pnpm --filter @smartapp/tooling dashboard:splash
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SCREENS_FILE = path.join(ROOT, 'packages/core/src/rules/ios-screens.ts');
const MARK = path.join(ROOT, 'docs/brand/smartappph-mark-gradient.webp');
const OUTPUT = path.join(ROOT, 'apps/dashboard/public/splash');
const MARK_CSS_PX = 96;

// The dashboard's page colours (packages/ui/src/styles/tokens.css, --background), in hex for the pictures.
const THEMES = { light: '#f9fafd', dark: '#1b1e24' } as const;

interface Screen {
  width: number;
  height: number;
  ratio: number;
  statusBar: number;
}

function isScreen(value: unknown): value is Screen {
  if (typeof value !== 'object' || value === null) return false;
  return (
    'width' in value &&
    typeof value.width === 'number' &&
    'height' in value &&
    typeof value.height === 'number' &&
    'ratio' in value &&
    typeof value.ratio === 'number' &&
    'statusBar' in value &&
    typeof value.statusBar === 'number'
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
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  for (const screen of screens) {
    const width = screen.width * screen.ratio;
    const height = screen.height * screen.ratio;
    const side = MARK_CSS_PX * screen.ratio;
    const mark = await sharp(MARK).resize(side, side).png().toBuffer();
    const left = Math.round((width - side) / 2);
    const top = Math.round((height - side) / 2 + (screen.statusBar / 2) * screen.ratio);
    for (const [theme, background] of Object.entries(THEMES)) {
      const file = path.join(OUTPUT, `dashboard-${width}x${height}-${theme}.png`);
      await sharp({ create: { width, height, channels: 3, background } })
        .composite([{ input: mark, left, top }])
        .png({ compressionLevel: 9, palette: true })
        .toFile(file);
    }
  }
  console.log(`${screens.length * 2} launch pictures in ${path.relative(ROOT, OUTPUT)}`);
}

await main();
