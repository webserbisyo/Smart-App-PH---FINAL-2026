import { z } from 'zod';

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
  'kitchen_knife',
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

export interface CategoryIconFluent {
  kind: 'fluent';
  key: IconKey;
  style: 'flat' | 'color' | '3d';
}

export interface CategoryIconEmoji {
  kind: 'emoji';
  char: string;
}

export interface CategoryIconImage {
  kind: 'image';
  ref: string;
}

export type AnyCategoryIcon = CategoryIconFluent | CategoryIconEmoji | CategoryIconImage;

export function charToCodepoint(char: string): string {
  return Array.from(char)
    .map((c) => c.codePointAt(0)?.toString(16) ?? '')
    .filter(Boolean)
    .join('-')
    .toLowerCase();
}

/**
 * Resolves the URL for an icon. Returns a relative URL path or null (e.g. for custom images handled by ImageLoader).
 */
export function categoryIconUrl(
  icon: AnyCategoryIcon | IconKey | string | null | undefined,
  style?: 'flat' | 'color' | '3d',
  baseUrl = '',
): string | null {
  if (!icon) return null;
  const base = baseUrl ? baseUrl.replace(/\/+$/, '') : '';

  if (typeof icon === 'string') {
    const s = style ?? 'flat';
    const ext = s === '3d' ? 'webp' : 'svg';
    return `${base}/icons/fluent/${s}/${icon}.${ext}`;
  }

  if (icon.kind === 'fluent') {
    const s = style ?? icon.style ?? 'flat';
    const ext = s === '3d' ? 'webp' : 'svg';
    return `${base}/icons/fluent/${s}/${icon.key}.${ext}`;
  }

  if (icon.kind === 'emoji') {
    const cp = charToCodepoint(icon.char);
    return `${base}/icons/fluent/all/${cp}.svg`;
  }

  if (icon.kind === 'image') {
    if (
      icon.ref.startsWith('http://') ||
      icon.ref.startsWith('https://') ||
      icon.ref.startsWith('/')
    ) {
      return icon.ref;
    }
    return `${base}/${icon.ref.replace(/^\/+/, '')}`;
  }

  return null;
}

/**
 * Returns path to icon. Compatible with legacy iconPath(key).
 */
export function iconPath(
  icon: IconKey | AnyCategoryIcon | string,
  style?: 'flat' | 'color' | '3d',
): string {
  if (typeof icon === 'string') {
    return `/icons/fluent/${icon}.svg`;
  }
  if (icon.kind === 'fluent') {
    const s = style ?? icon.style ?? 'flat';
    const ext = s === '3d' ? 'webp' : 'svg';
    return `/icons/fluent/${s}/${icon.key}.${ext}`;
  }
  if (icon.kind === 'emoji') {
    return `/icons/fluent/all/${charToCodepoint(icon.char)}.svg`;
  }
  if (icon.kind === 'image') {
    return icon.ref;
  }
  return '';
}
