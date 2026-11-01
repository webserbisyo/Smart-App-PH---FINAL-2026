import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const TARGET_DIR = path.join(projectRoot, 'apps/storefront/public/icons/fluent');
const FLAT_DIR = path.join(TARGET_DIR, 'flat');
const COLOR_DIR = path.join(TARGET_DIR, 'color');
const THREE_D_DIR = path.join(TARGET_DIR, '3d');

// 200 curated keys mapping to Fluent Emoji folders in microsoft/fluentui-emoji
export const ICON_MAPPING: Record<string, string> = {
  // 52 existing keys
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

  // 148 additional curated food & retail keys
  hotdog: 'Hot dog',
  taco: 'Taco',
  burrito: 'Burrito',
  bacon: 'Bacon',
  curry: 'Curry rice',
  spaghetti: 'Spaghetti',
  ramen: 'Steaming bowl',
  soup: 'Bowl with spoon',
  salad: 'Green salad',
  bento: 'Bento box',
  dumpling: 'Dumpling',
  fish: 'Fish',
  shrimp: 'Shrimp',
  crab: 'Crab',
  lobster: 'Lobster',
  sushi: 'Sushi',
  popcorn: 'Popcorn',
  pretzel: 'Pretzel',
  cheese: 'Cheese wedge',
  butter: 'Butter',
  waffle: 'Waffle',
  pancakes: 'Pancakes',
  bagel: 'Bagel',
  baguette: 'Baguette bread',
  pie: 'Pie',
  custard: 'Custard',
  lollipop: 'Lollipop',
  candy: 'Candy',
  honey: 'Honey pot',
  peanuts: 'Peanuts',
  chestnut: 'Chestnut',
  corn: 'Ear of corn',
  apple: 'Red apple',
  banana: 'Banana',
  orange: 'Tangerine',
  mango: 'Mango',
  strawberry: 'Strawberry',
  watermelon: 'Watermelon',
  grapes: 'Grapes',
  pineapple: 'Pineapple',
  coconut: 'Coconut',
  avocado: 'Avocado',
  lemon: 'Lemon',
  peach: 'Peach',
  cherries: 'Cherries',
  blueberries: 'Blueberries',
  kiwi: 'Kiwi fruit',
  melon: 'Melon',
  tomato: 'Tomato',
  potato: 'Potato',
  sweet_potato: 'Roasted sweet potato',
  carrot: 'Carrot',
  bell_pepper: 'Bell pepper',
  chili_pepper: 'Hot pepper',
  cucumber: 'Cucumber',
  garlic: 'Garlic',
  onion: 'Onion',
  mushroom: 'Mushroom',
  eggplant: 'Eggplant',
  broccoli: 'Broccoli',
  canned_food: 'Canned food',
  beer: 'Beer mug',
  wine: 'Wine glass',
  cocktail: 'Cocktail glass',
  champagne: 'Bottle with popping cork',
  baby_bottle: 'Baby bottle',
  tea: 'Teacup without handle',
  socks: 'Socks',
  sneakers: 'Running shoe',
  heels: 'High-heeled shoe',
  flat_shoe: 'Flat shoe',
  glasses: 'Glasses',
  sunglasses: 'Sunglasses',
  watch: 'Watch',
  ring: 'Ring',
  backpack: 'Backpack',
  clutch: 'Clutch bag',
  purse: 'Purse',
  luggage: 'Luggage',
  umbrella: 'Umbrella',
  shopping_cart: 'Shopping cart',
  shopping_bag: 'Shopping bags',
  package: 'Package',
  tag: 'Label',
  receipt: 'Receipt',
  credit_card: 'Credit card',
  money_bag: 'Money bag',
  coin: 'Coin',
  fire: 'Fire',
  bell: 'Bell',
  alarm_clock: 'Alarm clock',
  mobile_phone: 'Mobile phone',
  fork_knife: 'Fork and knife',
  spoon: 'Spoon',
  knife: 'Kitchen knife',
  salt: 'Salt',
  takeout_box: 'Takeout box',
  fortune_cookie: 'Fortune cookie',
  moon_cake: 'Moon cake',
  dango: 'Dango',
  oden: 'Oden',
  rice_ball: 'Rice ball',
  rice_cracker: 'Rice cracker',
  fish_cake: 'Fish cake with swirl',
  falafel: 'Falafel',
  tamale: 'Tamale',
  flatbread: 'Flatbread',
  fondue: 'Fondue',
  olive: 'Olive',
  green_apple: 'Green apple',
  pear: 'Pear',
  clinking_beer: 'Clinking beer mugs',
  clinking_glasses: 'Clinking glasses',
  mate: 'Mate',
  teapot: 'Teapot',
  pouring_liquid: 'Pouring liquid',
  ice_cube: 'Ice',
  briefcase: 'Briefcase',
  thread: 'Thread',
  yarn: 'Yarn',
  safety_pin: 'Safety pin',
  scissors: 'Scissors',
  inbox: 'Inbox tray',
  envelope: 'Envelope',
  pushpin: 'Pushpin',
  round_pushpin: 'Round pushpin',
  paperclip: 'Paperclip',
  calendar: 'Calendar',
  notepad: 'Spiral notepad',
  clipboard: 'Clipboard',
  megaphone: 'Megaphone',
  sparkler: 'Sparkler',
  balloon: 'Balloon',
  confetti_ball: 'Confetti ball',
  party_popper: 'Party popper',
  ribbon: 'Ribbon',
  glowing_star: 'Glowing star',
  red_heart: 'Red heart',
  sparkling_heart: 'Sparkling heart',
  shaved_ice: 'Shaved ice',
  zap: 'High voltage',
  sun: 'Sun',
  bubbles: 'Bubbles',
  broom: 'Broom',
  wastebasket: 'Wastebasket',
  soap: 'Soap',
  sponge: 'Sponge',
  lotion: 'Lotion bottle',
};

function getAssetPath(folder: string, style: 'Flat' | 'Color' | '3D', ext: string): string {
  if (folder === 'T-shirt') {
    return `assets/T-shirt/${style}/t-shirt_${style.toLowerCase()}.${ext}`;
  }
  if (folder === 'High-heeled shoe') {
    return `assets/High-heeled shoe/${style}/high-heeled_shoe_${style.toLowerCase()}.${ext}`;
  }
  const fileName = folder.toLowerCase().replace(/[\s-]+/g, '_') + `_${style.toLowerCase()}.${ext}`;
  return `assets/${folder}/${style}/${fileName}`;
}

async function runWithLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const executing: Promise<void>[] = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    executing.push(p);
    if (limit <= items.length) {
      const e: Promise<void> = p.then(() => {
        executing.splice(executing.indexOf(e), 1);
      });
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  await Promise.all(executing);
}

async function downloadFluentIcons() {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  fs.mkdirSync(FLAT_DIR, { recursive: true });
  fs.mkdirSync(COLOR_DIR, { recursive: true });
  fs.mkdirSync(THREE_D_DIR, { recursive: true });

  const rawBase = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main';

  // 1. Download LICENSE
  const licenseDest = path.join(TARGET_DIR, 'LICENSE');
  if (!fs.existsSync(licenseDest)) {
    const res = await fetch(`${rawBase}/LICENSE`);
    if (res.ok) {
      fs.writeFileSync(licenseDest, await res.text(), 'utf8');
    }
  }

  const entries = Object.entries(ICON_MAPPING);
  console.log(`Processing ${entries.length} Fluent icon keys across Flat, Color, and 3D styles...`);

  await runWithLimit(entries, 12, async ([key, folder]) => {
    const flatDest = path.join(FLAT_DIR, `${key}.svg`);
    const colorDest = path.join(COLOR_DIR, `${key}.webp`);
    const threeDDest = path.join(THREE_D_DIR, `${key}.webp`);
    const oldColorSvg = path.join(COLOR_DIR, `${key}.svg`);

    // 1. Flat SVG
    if (!fs.existsSync(flatDest)) {
      const relPath = getAssetPath(folder, 'Flat', 'svg');
      const url = `${rawBase}/${encodeURI(relPath)}`;
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        fs.writeFileSync(flatDest, text, 'utf8');
      }
    }

    // 2. Color WebP (128x128)
    if (!fs.existsSync(colorDest)) {
      if (fs.existsSync(oldColorSvg)) {
        const buf = fs.readFileSync(oldColorSvg);
        await sharp(buf)
          .resize(128, 128, { fit: 'contain' })
          .webp({ quality: 82 })
          .toFile(colorDest);
        fs.unlinkSync(oldColorSvg);
      } else {
        const relPath = getAssetPath(folder, 'Color', 'svg');
        const url = `${rawBase}/${encodeURI(relPath)}`;
        const res = await fetch(url);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          await sharp(buf)
            .resize(128, 128, { fit: 'contain' })
            .webp({ quality: 82 })
            .toFile(colorDest);
        }
      }
    } else if (fs.existsSync(oldColorSvg)) {
      fs.unlinkSync(oldColorSvg);
    }

    // 3. 3D WebP (128x128)
    if (!fs.existsSync(threeDDest)) {
      const relPath = getAssetPath(folder, '3D', 'png');
      const url = `${rawBase}/${encodeURI(relPath)}`;
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        await sharp(buf)
          .resize(128, 128, { fit: 'contain' })
          .webp({ quality: 82 })
          .toFile(threeDDest);
      }
    }
  });

  console.log('Finished downloading and preparing all 200 Fluent icons.');
}

downloadFluentIcons().catch((err) => {
  console.error('Error downloading Fluent icons:', err);
  process.exit(1);
});
