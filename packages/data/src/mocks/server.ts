// Server-safe shop reads for Next server components: packs only, no device state.
import { PublicShopSchema, SHOP_PACKS, TEST_SHOP_PACKS, type PublicShop } from '@smartapp/core';

// Bundlers replace process.env.NODE_ENV at build time (Next and Vite), so dev-only code drops out of production.
declare const process: { env: { NODE_ENV?: string | undefined } };

export function getStorefrontForServer(slug: string): PublicShop | null {
  const demo = Object.entries(SHOP_PACKS).find(([s]) => s === slug)?.[1];
  const test =
    process.env.NODE_ENV === 'production'
      ? undefined
      : Object.entries(TEST_SHOP_PACKS).find(([s]) => s === slug)?.[1];
  const pack = demo ?? test;
  if (!pack) return null;
  const shop = structuredClone({ storefront: pack.storefront, catalog: pack.catalog });
  if (!shop.storefront.info.isDemo)
    shop.catalog.items = shop.catalog.items.filter((i) => !i.sample);
  return PublicShopSchema.parse(shop);
}
