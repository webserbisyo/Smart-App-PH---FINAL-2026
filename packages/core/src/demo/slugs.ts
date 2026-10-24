export const DEMO_SHOP_SLUGS = [
  'kanto-smash',
  'aqualinis',
  'tala-apparel',
  'kape-juan',
  'lola-remy',
] as const;

export type DemoShopSlug = (typeof DEMO_SHOP_SLUGS)[number];

export const RESERVED_SHOP_SLUGS = ['demo'] as const;

export type ReservedShopSlug = (typeof RESERVED_SHOP_SLUGS)[number];

export function isDemoShopSlug(slug: string): slug is DemoShopSlug {
  return DEMO_SHOP_SLUGS.some((s) => s === slug);
}

export function isReservedShopSlug(slug: string): slug is ReservedShopSlug {
  return RESERVED_SHOP_SLUGS.some((s) => s === slug.toLowerCase());
}
