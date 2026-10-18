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
    ownerEmail: 'morales.juanmiguel0729+burger@gmail.com',
    city: 'Marikina',
    brandColor: '#D7372F',
  },
  {
    slug: 'aqualinis',
    name: 'AquaLinis Water Refilling Station',
    kind: 'retail',
    ownerName: 'Ramon Dizon',
    ownerEmail: 'morales.juanmiguel0729+water@gmail.com',
    city: 'Las Piñas',
    brandColor: '#0E7AC4',
  },
  {
    slug: 'tala-apparel',
    name: 'Tala Apparel',
    kind: 'retail',
    ownerName: 'Bea Villanueva',
    ownerEmail: 'morales.juanmiguel0729+tala@gmail.com',
    city: 'Cebu City',
    brandColor: '#2E3A87',
  },
  {
    slug: 'kape-juan',
    name: 'Kapé Juan Coffee',
    kind: 'food',
    ownerName: 'Juan Santos',
    ownerEmail: 'morales.juanmiguel0729+cafe@gmail.com',
    city: 'Quezon City',
    brandColor: '#6F4E37',
  },
  {
    slug: 'lola-remy',
    name: 'Panaderya ni Lola Remy',
    kind: 'food',
    ownerName: 'Carla Bautista',
    ownerEmail: 'morales.juanmiguel0729+bakery@gmail.com',
    city: 'Malolos',
    brandColor: '#C27C2C',
  },
] as const;
