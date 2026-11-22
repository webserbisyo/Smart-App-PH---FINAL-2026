export const DEMO_SHOP_SLUGS = [
  'kanto-smash',
  'aqualinis',
  'tala-apparel',
  'kape-juan',
  'lola-remy',
] as const;

export type DemoShopSlug = (typeof DEMO_SHOP_SLUGS)[number];

// Storefront paths that are ours, not a shop's: no shop may take them as its link.
export const RESERVED_SHOP_SLUGS = ['demo', 'samples'] as const;

// The Sample shops page on the storefront (T109): every demo shop with its cover and links.
export const SAMPLES_PATH = '/samples';

export type ReservedShopSlug = (typeof RESERVED_SHOP_SLUGS)[number];

export function isDemoShopSlug(slug: string): slug is DemoShopSlug {
  return DEMO_SHOP_SLUGS.some((s) => s === slug);
}

export function isReservedShopSlug(slug: string): slug is ReservedShopSlug {
  return RESERVED_SHOP_SLUGS.some((s) => s === slug.toLowerCase());
}
