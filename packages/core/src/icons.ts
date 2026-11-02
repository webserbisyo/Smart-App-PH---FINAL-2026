import { z } from 'zod';
import type { CategoryIcon } from './schemas/catalog.js';
export type { CategoryIcon };

export const ICON_KEYS = [
  // 52 existing keys
  'burger',
  'chicken',
  'rice',
  'fries',
  'combo',
  'nuggets',
  'soda',
  'iced_tea',
  'shake',
  'juice',
  'water',
  'water_gallon',
  'container',
  'ice',
  'tshirt',
  'trousers',
  'dress',
  'set',
  'accessories',
  'earrings',
  'hat',
  'scarf',
  'coffee',
  'kapeng_pinoy',
  'milk_tea',
  'sandwich',
  'beans',
  'bread',
  'pastry',
  'cake',
  'birthday_cake',
  'pasalubong',
  'chocolate',
  'cupcake',
  'donut',
  'cookie',
  'ice_cream',
  'noodles',
  'pizza',
  'meat',
  'egg',
  'delivery',
  'other',
  'promo',
  'new',
  'bestseller',
  'gift',
  'stamp',
  'reward',
  'store',
  'offline',
  'closed',

  // 148 additional curated food & retail keys
  'hotdog',
  'taco',
  'burrito',
  'bacon',
  'curry',
  'spaghetti',
  'ramen',
  'soup',
  'salad',
  'bento',
  'dumpling',
  'fish',
  'shrimp',
  'crab',
  'lobster',
  'sushi',
  'popcorn',
  'pretzel',
  'cheese',
  'butter',
  'waffle',
  'pancakes',
  'bagel',
  'baguette',
  'pie',
  'custard',
  'lollipop',
  'candy',
  'honey',
  'peanuts',
  'chestnut',
  'corn',
  'apple',
  'banana',
  'orange',
  'mango',
  'strawberry',
  'watermelon',
  'grapes',
  'pineapple',
  'coconut',
  'avocado',
  'lemon',
  'peach',
  'cherries',
  'blueberries',
  'kiwi',
  'melon',
  'tomato',
  'potato',
  'sweet_potato',
  'carrot',
  'bell_pepper',
  'chili_pepper',
  'cucumber',
  'garlic',
  'onion',
  'mushroom',
  'eggplant',
  'broccoli',
  'canned_food',
  'beer',
  'wine',
  'cocktail',
  'champagne',
  'baby_bottle',
  'tea',
  'socks',
  'sneakers',
  'heels',
  'flat_shoe',
  'glasses',
  'sunglasses',
  'watch',
  'ring',
  'backpack',
  'clutch',
  'purse',
  'luggage',
  'umbrella',
  'shopping_cart',
  'shopping_bag',
  'package',
  'tag',
  'receipt',
  'credit_card',
  'money_bag',
  'coin',
  'fire',
  'bell',
  'alarm_clock',
  'mobile_phone',
  'fork_knife',
  'spoon',
  'knife',
  'salt',
  'takeout_box',
  'fortune_cookie',
  'moon_cake',
  'dango',
  'oden',
  'rice_ball',
  'rice_cracker',
  'fish_cake',
  'falafel',
  'tamale',
  'flatbread',
  'fondue',
  'olive',
  'green_apple',
  'pear',
  'clinking_beer',
  'clinking_glasses',
  'mate',
  'teapot',
  'pouring_liquid',
  'ice_cube',
  'briefcase',
  'thread',
  'yarn',
  'safety_pin',
  'scissors',
  'inbox',
  'envelope',
  'pushpin',
  'round_pushpin',
  'paperclip',
  'calendar',
  'notepad',
  'clipboard',
  'megaphone',
  'sparkler',
  'balloon',
  'confetti_ball',
  'party_popper',
  'ribbon',
  'glowing_star',
  'red_heart',
  'sparkling_heart',
  'shaved_ice',
  'zap',
  'sun',
  'bubbles',
  'broom',
  'wastebasket',
  'soap',
  'sponge',
  'lotion',
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

export const IconKeyEnum = z.enum(ICON_KEYS);

export const CATEGORY_ICON_STYLES = ['flat', 'color', '3d'] as const;
export type CategoryIconStyle = (typeof CATEGORY_ICON_STYLES)[number];
export const CategoryIconStyleEnum = z.enum(CATEGORY_ICON_STYLES);

export function iconExtension(style: CategoryIconStyle = 'flat'): 'svg' | 'webp' {
  return style === 'flat' ? 'svg' : 'webp';
}

/**
 * Returns path to an icon. Compatible with legacy iconPath(key).
 */
export function iconPath(icon: IconKey | CategoryIcon, style?: CategoryIconStyle): string {
  if (typeof icon === 'string') {
    const s = style ?? 'flat';
    return `/icons/fluent/${s}/${icon}.${iconExtension(s)}`;
  }
  if (icon.kind === 'fluent') {
    const s = style ?? icon.style ?? 'flat';
    return `/icons/fluent/${s}/${icon.key}.${iconExtension(s)}`;
  }
  return '';
}

/**
 * Resolves the URL for an icon. Returns a relative URL path or null (e.g. for custom images handled by ImageLoader).
 */
export function categoryIconUrl(
  icon: CategoryIcon | IconKey | null | undefined,
  style?: CategoryIconStyle,
  baseUrl = '',
): string | null {
  if (!icon) return null;
  const base = baseUrl ? baseUrl.replace(/\/+$/, '') : '';

  if (typeof icon === 'string') {
    const s = style ?? 'flat';
    return `${base}/icons/fluent/${s}/${icon}.${iconExtension(s)}`;
  }

  if (icon.kind === 'fluent') {
    const s = style ?? icon.style ?? 'flat';
    return `${base}/icons/fluent/${s}/${icon.key}.${iconExtension(s)}`;
  }

  return null;
}

// Plain words (English and Filipino) that find an icon, so owners can type "kape",
// "inumin" or "shirt" instead of the icon's file name. The key's own words count too.
const ICON_WORDS: Partial<Record<IconKey, string>> = {
  burger: 'burger burgers hamburger smash patty',
  chicken: 'chicken manok fried wings inasal chickenjoy',
  rice: 'rice kanin meal meals silog rice meals ulam',
  fries: 'fries french fries potato chips snacks sides',
  combo: 'combo combos meal deal value set bundle',
  nuggets: 'nuggets bites',
  soda: 'soda drinks drink inumin softdrinks coke beverage beverages',
  iced_tea: 'iced tea juice drinks inumin',
  shake: 'shake shakes milkshake smoothie frappe inumin',
  juice: 'juice fruit juice drinks inumin',
  water: 'water tubig mineral bottle inumin',
  water_gallon: 'gallon refill water tubig container round slim',
  container: 'container jug refill gallon',
  ice: 'ice yelo tube ice',
  tshirt: 'shirt shirts tshirt tee tops top damit',
  trousers: 'pants trousers jeans shorts bottoms pantalon',
  dress: 'dress dresses gown bestida',
  set: 'set sets coord terno outfit',
  accessories: 'accessories accessory jewelry',
  earrings: 'earrings hikaw jewelry',
  hat: 'hat hats cap caps sumbrero',
  scarf: 'scarf scarves',
  coffee: 'coffee kape latte espresso americano cappuccino hot drinks',
  kapeng_pinoy: 'kape barako kapeng pinoy native coffee',
  milk_tea: 'milk tea milktea boba pearl',
  sandwich: 'sandwich sandwiches sub',
  bread: 'bread tinapay pandesal loaf bakery',
  pastry: 'pastry pastries croissant bakery',
  cake: 'cake cakes slice',
  birthday_cake: 'birthday cake celebration',
  pasalubong: 'pasalubong gift box delicacies',
  cupcake: 'cupcake cupcakes',
  donut: 'donut donuts doughnut',
  cookie: 'cookie cookies biscuit',
  ice_cream: 'ice cream sorbetes dessert desserts',
  noodles: 'noodles pancit mami lomi pasta',
  pizza: 'pizza pizzas',
  meat: 'meat karne pork baboy beef baka grill bbq liempo',
  egg: 'egg eggs itlog breakfast silog',
  delivery: 'delivery deliver',
  promo: 'promo promos sale discount',
  new: 'new bago arrivals',
  bestseller: 'bestseller bestsellers best seller popular favorite top',
  gift: 'gift gifts regalo',
  store: 'store shop tindahan',
  spaghetti: 'spaghetti pasta',
  ramen: 'ramen',
  soup: 'soup sabaw sinigang bulalo',
  salad: 'salad salads vegetables gulay healthy',
  dumpling: 'dumpling siomai siopao dimsum',
  fish: 'fish isda seafood bangus tilapia',
  shrimp: 'shrimp hipon seafood',
  sushi: 'sushi japanese',
  popcorn: 'popcorn snacks',
  cheese: 'cheese keso',
  waffle: 'waffle waffles',
  pancakes: 'pancakes breakfast',
  pie: 'pie pies buko pie',
  custard: 'custard leche flan flan dessert',
  candy: 'candy candies sweets kendi',
  banana: 'banana saging turon',
  mango: 'mango mangga',
  coconut: 'coconut buko niyog',
  beer: 'beer alcohol',
  wine: 'wine alcohol',
  cocktail: 'cocktail cocktails',
  tea: 'tea tsaa',
  socks: 'socks medyas',
  sneakers: 'shoes sneakers sapatos rubber shoes',
  heels: 'heels shoes sandals',
  flat_shoe: 'flats shoes sandals tsinelas slippers',
  glasses: 'glasses eyewear',
  sunglasses: 'sunglasses shades',
  watch: 'watch watches relo',
  ring: 'ring rings singsing jewelry',
  backpack: 'bag bags backpack',
  clutch: 'clutch bag',
  purse: 'purse wallet pitaka bag',
  shopping_bag: 'bag tote shopping',
  package: 'package parcel box items',
  tag: 'tag sale price',
  takeout_box: 'takeout to go box',
  rice_ball: 'rice ball onigiri',
  shaved_ice: 'halo halo halo-halo shaved ice dessert',
  soap: 'soap sabon',
  lotion: 'lotion skincare beauty',
  sponge: 'sponge cleaning',
  broom: 'broom walis cleaning',
  ribbon: 'ribbon gift wrap',
  thread: 'thread sewing',
  yarn: 'yarn knit crochet',
};

function wordsFor(key: IconKey): string {
  return `${key.replaceAll('_', ' ')} ${ICON_WORDS[key] ?? ''}`.toLowerCase();
}

/** Icons whose plain words match every word typed, best match first. */
export function searchIcons(query: string): IconKey[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...ICON_KEYS];
  const scored: { key: IconKey; score: number }[] = [];
  for (const key of ICON_KEYS) {
    const haystack = wordsFor(key);
    const tokens = haystack.split(/\s+/);
    let score = 0;
    let all = true;
    for (const term of terms) {
      if (tokens.includes(term)) score += 3;
      else if (tokens.some((t) => t.startsWith(term))) score += 2;
      else if (haystack.includes(term)) score += 1;
      else all = false;
    }
    if (all) scored.push({ key, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.key);
}

/** The icon a category name most likely means ("Kape" → coffee), or null. */
export function guessIconKey(name: string): IconKey | null {
  const words = name
    .trim()
    .toLowerCase()
    .split(/[\s,&/-]+/)
    .filter((w) => w.length > 2);
  for (const word of words) {
    const exact = ICON_KEYS.find((key) => wordsFor(key).split(/\s+/).includes(word));
    if (exact) return exact;
  }
  for (const word of words) {
    const [first] = searchIcons(word);
    if (first) return first;
  }
  return null;
}
