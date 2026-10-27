import type { DemoShopSummary } from '../schemas/demo-shop.js';

export const DEMO_SHOP_SLUGS = [
  'kanto-smash',
  'aqualinis',
  'tala-apparel',
  'kape-juan',
  'lola-remy',
] as const;

export type DemoShopSlug = (typeof DEMO_SHOP_SLUGS)[number];

export const DEMO_SHOPS: readonly DemoShopSummary[] = [
  {
    slug: 'kanto-smash',
    name: 'Kanto Smash Burgers',
    kind: 'food',
    ownerName: 'Paolo Reyes',
    city: 'Marikina',
    brandColor: '#D7372F',
    surface: 'dark',
    pageColor: null,
  },
  {
    slug: 'aqualinis',
    name: 'AquaLinis Water Refilling Station',
    kind: 'retail',
    ownerName: 'Ramon Dizon',
    city: 'Las Piñas',
    brandColor: '#0E7AC4',
    surface: 'light',
    pageColor: '#E2F1FD',
  },
  {
    slug: 'tala-apparel',
    name: 'Tala Apparel',
    kind: 'retail',
    ownerName: 'Bea Villanueva',
    city: 'Cebu City',
    brandColor: '#C9A227',
    surface: 'dark',
    pageColor: '#253475',
  },
  {
    slug: 'kape-juan',
    name: 'Kapé Juan Coffee',
    kind: 'food',
    ownerName: 'Juan Santos',
    city: 'Quezon City',
    brandColor: '#6F4E37',
    surface: 'light',
    pageColor: '#EEE2CF',
  },
  {
    slug: 'lola-remy',
    name: 'Panaderya ni Lola Remy',
    kind: 'food',
    ownerName: 'Carla Bautista',
    city: 'Malolos',
    brandColor: '#C27C2C',
    surface: 'light',
    pageColor: '#FFF1C9',
  },
] as const;
