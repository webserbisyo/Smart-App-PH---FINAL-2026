// The storefront's server reads (launch phase 5): sample packs, or NestJS with Next's cache. A shop's pages
// are cached under the tag `shop:<slug>`; NestJS calls /api/revalidate after a menu, look or settings change
// (R8). Prices, stock and open or closed are still checked fresh by the phone and at checkout (T6).
import { cacheTag } from 'next/cache';
import type { OrderReceipt, PublicShop } from '@smartapp/core';
import {
  getOrderReceiptForServer,
  getStorefrontForServer,
  readReceiptFromApi,
  readShopFromApi,
  readShopPreviewFromApi,
} from '@smartapp/data/server';
import { apiUrl, serverReadSecret, storefrontOnApi } from './env';

/** The cache tag of one shop's pages (the same words NestJS sends). */
export function shopTag(slug: string): string {
  return `shop:${slug}`;
}

/** A shop as its customers see it, or null (unknown, pending or suspended: the page shows Not found). */
export async function getShop(slug: string): Promise<PublicShop | null> {
  'use cache';
  cacheTag(shopTag(slug));
  if (!storefrontOnApi || !apiUrl) return getStorefrontForServer(slug);
  return readShopFromApi(slug, { apiUrl, secret: serverReadSecret });
}

/** One order's receipt for the first paint; the phone keeps it fresh. Never cached. */
export async function getReceipt(slug: string, token: string): Promise<OrderReceipt | null> {
  if (!storefrontOnApi || !apiUrl) return getOrderReceiptForServer(slug, token);
  return readReceiptFromApi(slug, token, { apiUrl, secret: serverReadSecret });
}

/**
 * The Editor's preview (T72): with the API and a preview token, the draft (a shop still setting up too);
 * otherwise the shop as customers see it. Never cached.
 */
export async function getPreviewShop(
  slug: string,
  token: string | null,
): Promise<PublicShop | null> {
  if (storefrontOnApi && apiUrl && token) {
    return readShopPreviewFromApi(slug, token, { apiUrl, secret: serverReadSecret });
  }
  return getShop(slug);
}
