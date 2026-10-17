export const DEMO_SHOP_SLUGS = [
  'kanto-smash',
  'aqualinis',
  'tala-apparel',
  'kape-juan',
  'lola-remy',
] as const;

export type DemoShopSlug = (typeof DEMO_SHOP_SLUGS)[number];
