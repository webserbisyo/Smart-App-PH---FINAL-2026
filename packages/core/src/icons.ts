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
