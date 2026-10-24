import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const TARGET_DIR = path.join(projectRoot, 'apps/storefront/public/icons/fluent');

// 52 keys mapping to Fluent Emoji folders in microsoft/fluentui-emoji
// Format: key -> folder name in assets/
const ICON_MAPPING: Record<string, string> = {
  burger: 'Hamburger',
  chicken: 'Poultry leg',
  rice: 'Cooked rice',
  fries: 'French fries',
  combo: 'Fork and knife with plate',
  nuggets: 'Poultry leg',
  soda: 'Cup with straw',
  iced_tea: 'Tumbler glass',
  shake: 'Glass of milk',
  juice: 'Beverage box',
  water: 'Droplet',
  water_gallon: 'Potable water',
  container: 'Bucket',
  ice: 'Ice',
  tshirt: 'T-shirt',
  trousers: 'Jeans',
  dress: 'Dress',
  set: 'Coat',
  accessories: 'Handbag',
  earrings: 'Gem stone',
  hat: 'Billed cap',
  scarf: 'Scarf',
  coffee: 'Hot beverage',
  kapeng_pinoy: 'Teacup without handle',
  milk_tea: 'Bubble tea',
  sandwich: 'Sandwich',
  beans: 'Beans',
  bread: 'Bread',
  pastry: 'Croissant',
  cake: 'Shortcake',
  birthday_cake: 'Birthday cake',
  pasalubong: 'Wrapped gift',
  chocolate: 'Chocolate bar',
  cupcake: 'Cupcake',
  donut: 'Doughnut',
  cookie: 'Cookie',
  ice_cream: 'Soft ice cream',
  noodles: 'Steaming bowl',
  pizza: 'Pizza',
  meat: 'Cut of meat',
  egg: 'Cooking',
  delivery: 'Delivery truck',
  other: 'Shopping bags',
  promo: 'Fire',
  new: 'Sparkles',
  bestseller: 'Star',
  gift: 'Wrapped gift',
  stamp: 'Ticket',
  reward: 'Trophy',
  store: 'Convenience store',
  offline: 'Cloud',
  closed: 'Crescent moon',
};

// Map each folder to its exact Flat SVG path in microsoft/fluentui-emoji
function getSvgPath(folder: string): string {
  // T-shirt retains hyphen in filename
  if (folder === 'T-shirt') {
    return 'assets/T-shirt/Flat/t-shirt_flat.svg';
  }
  const fileName = folder.toLowerCase().replace(/[\s-]+/g, '_') + '_flat.svg';
  return `assets/${folder}/Flat/${fileName}`;
}

async function downloadFluentIcons() {
  console.log('Ensuring directory exists:', TARGET_DIR);
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  const rawBase = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main';

  // 1. Download LICENSE
  const licenseUrl = `${rawBase}/LICENSE`;
  const licenseDest = path.join(TARGET_DIR, 'LICENSE');
  if (!fs.existsSync(licenseDest)) {
    console.log('Downloading LICENSE from:', licenseUrl);
    const res = await fetch(licenseUrl);
    if (!res.ok) {
      throw new Error(`Failed to download LICENSE: HTTP ${res.status}`);
    }
    const text = await res.text();
    fs.writeFileSync(licenseDest, text, 'utf8');
    console.log('LICENSE saved.');
  } else {
    console.log('LICENSE already exists, skipping.');
  }

  // 2. Cache unique SVG content by repo path to avoid duplicate downloads
  const contentCache = new Map<string, string>();

  const entries = Object.entries(ICON_MAPPING);
  console.log(`Downloading ${entries.length} Fluent icon keys...`);

  for (const [key, folder] of entries) {
    const destPath = path.join(TARGET_DIR, `${key}.svg`);
    const repoRelativePath = getSvgPath(folder);
    const url = `${rawBase}/${encodeURI(repoRelativePath)}`;

    let svgText = contentCache.get(repoRelativePath);
    if (!svgText) {
      console.log(`Downloading [${key}] from: ${url}`);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to download icon [${key}] from ${url}: HTTP ${res.status}`);
      }
      svgText = await res.text();
      if (!svgText.includes('<svg')) {
        throw new Error(`Downloaded content for [${key}] is not valid SVG`);
      }
      contentCache.set(repoRelativePath, svgText);
    } else {
      console.log(`Reusing cached SVG for [${key}] (${folder})`);
    }

    fs.writeFileSync(destPath, svgText, 'utf8');
  }

  console.log(`Successfully downloaded all ${entries.length} Fluent icon keys to ${TARGET_DIR}`);
}

downloadFluentIcons().catch((err) => {
  console.error('Fatal error downloading Fluent icons:', err);
  process.exit(1);
});
