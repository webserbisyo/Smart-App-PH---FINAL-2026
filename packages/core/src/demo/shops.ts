import type { DemoShopSummary } from '../schemas/demo-shop.js'

export const DEMO_SHOPS: readonly DemoShopSummary[] = [
  {
    slug: 'kanto-smash',
    name: 'Kanto Smash Burgers',
    kind: 'food',
    ownerName: 'Paolo Reyes',
    ownerEmail: 'morales.juanmiguel0729+burger@gmail.com',
  },
  {
    slug: 'aqualinis',
    name: 'AquaLinis Water Refilling Station',
    kind: 'retail',
    ownerName: 'Ramon Dizon',
    ownerEmail: 'morales.juanmiguel0729+water@gmail.com',
  },
  {
    slug: 'tala-apparel',
    name: 'Tala Apparel',
    kind: 'retail',
    ownerName: 'Bea Villanueva',
    ownerEmail: 'morales.juanmiguel0729+tala@gmail.com',
  },
  {
    slug: 'kape-juan',
    name: 'Kapé Juan Coffee',
    kind: 'food',
    ownerName: 'Juan Santos',
    ownerEmail: 'morales.juanmiguel0729+cafe@gmail.com',
  },
  {
    slug: 'lola-remy',
    name: 'Panaderya ni Lola Remy',
    kind: 'food',
    ownerName: 'Carla Bautista',
    ownerEmail: 'morales.juanmiguel0729+bakery@gmail.com',
  },
] as const
