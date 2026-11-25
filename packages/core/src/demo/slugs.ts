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

// "Start with samples" (T117, phase 4): a demo shop takes its own pack; a real shop the pack of its type.
const SAMPLE_PACK_OF_KIND: Readonly<Record<'food' | 'retail', DemoShopSlug>> = {
  food: 'kanto-smash',
  retail: 'tala-apparel',
};

export function samplePackFor(slug: string, kind: 'food' | 'retail'): DemoShopSlug {
  return isDemoShopSlug(slug) ? slug : SAMPLE_PACK_OF_KIND[kind];
}
