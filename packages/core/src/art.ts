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
] as const;

export type ArtKey = (typeof ART_KEYS)[number];

export const ArtKeyEnum = z.enum(ART_KEYS);

export function artPath(key: ArtKey): string {
  return `/art/${key}.webp`;
}
