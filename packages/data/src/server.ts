// Server-side reads for the storefront's pages: the sample packs, or NestJS once the storefront area is on the
// API (launch phase 5). The app wraps the API reads in its own cache ('use cache' + cacheTag).
import {
  OrderReceiptSchema,
  PublicShopSchema,
  type OrderReceipt,
  type PublicShop,
} from '@smartapp/core';

export { getStorefrontForServer, getOrderReceiptForServer } from './mocks/server';

export interface ServerReadOptions {
  // The NestJS address.
  apiUrl: string;
  // Shared with NestJS so its per-address rate limit skips the storefront's server (header x-server-read).
  secret?: string | undefined;
}

const TIMEOUT_MS = 8_000;

async function serverGet(path: string, { apiUrl, secret }: ServerReadOptions): Promise<unknown> {
  const res = await fetch(`${apiUrl.replace(/\/+$/, '')}${path}`, {
    headers: { 'x-smartapp': '1', ...(secret ? { 'x-server-read': secret } : {}) },
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // Not live, not there or another shop's: the page shows Not found.
  if (res.status === 404 || res.status === 410) return null;
  // Anything else is a real failure: the page shows its error, never a wrong Not found.
  if (!res.ok) throw new Error(`Shop read answered ${res.status}`);
  return res.json();
}

/** A live (or demo) shop's storefront from NestJS; null when it is not there or not live. */
export async function readShopFromApi(
  slug: string,
  options: ServerReadOptions,
): Promise<PublicShop | null> {
  const body = await serverGet(`/s/${encodeURIComponent(slug)}`, options);
  return body === null ? null : PublicShopSchema.parse(body);
}

/** One order's receipt from NestJS (never cached: it changes with every step). */
export async function readReceiptFromApi(
  slug: string,
  token: string,
  options: ServerReadOptions,
): Promise<OrderReceipt | null> {
  try {
    const body = await serverGet(
      `/s/${encodeURIComponent(slug)}/o/${encodeURIComponent(token)}`,
      options,
    );
    return body === null ? null : OrderReceiptSchema.parse(body);
  } catch {
    // The phone reads it again on mount; a slow server never blocks the receipt page.
    return null;
  }
}
