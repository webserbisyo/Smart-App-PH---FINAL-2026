import { z } from 'zod';

export const ICON_KEYS = [
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
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

export const IconKeyEnum = z.enum(ICON_KEYS);

export function iconPath(key: IconKey): string {
  return `/icons/fluent/${key}.svg`;
}
