import { z } from 'zod';

// Fluent Emoji 3D pictures (MIT, Microsoft) for empty, success and order-step states. The files are
// made once by `pnpm --filter @smartapp/tooling art` into apps/storefront/public/art (redesign C9).
export const ART_KEYS = [
  'basket_empty',
  'search_empty',
  'favourites_empty',
  'orders_empty',
  'placed',
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled',
  'expired',
  'paid',
  'offline',
  'not_found',
  'privacy',
  'install',
  'closed',
  'gift',
  'trophy',
  'printer',
] as const;

export type ArtKey = (typeof ART_KEYS)[number];

export const ArtKeyEnum = z.enum(ART_KEYS);

export function artPath(key: ArtKey): string {
  return `/art/${key}.webp`;
}

// Storyset "Gift" (Rafiki, green) for Rewards before a stamp card (decision R25). Its Freepik licence
// needs the credit line next to it, linking to Storyset.
export const STORYSET_GIFT = '/art/storyset-gift.svg';
export const STORYSET_URL = 'https://storyset.com';
