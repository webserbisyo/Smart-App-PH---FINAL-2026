import {
  ChartColumnIcon,
  ExternalLinkIcon,
  HouseIcon,
  PackageIcon,
  PaintbrushIcon,
  QrCodeIcon,
  ReceiptTextIcon,
  SettingsIcon,
  UsersIcon,
  UtensilsIcon,
  type LucideIcon,
} from 'lucide-react';
import type { CatalogIcon } from '@smartapp/core';

export const NAV_PLACEMENTS = ['dock', 'more'] as const;
export type NavPlacement = (typeof NAV_PLACEMENTS)[number];

export type NavWordKey =
  'home' | 'orders' | 'catalog' | 'members' | 'editor' | 'insights' | 'settings';

// The catalog icon depends on the shop kind, so it comes from vocab().catalogIcon.
export const CATALOG_ICONS: Record<CatalogIcon, LucideIcon> = {
  utensils: UtensilsIcon,
  package: PackageIcon,
};

// The one nav list. Sidebar, rail, dock and nav drawer all read it through useNavItems().
export const NAV = [
  { id: 'home', path: '/', icon: HouseIcon, words: 'home', placement: 'dock' },
  { id: 'orders', path: '/orders', icon: ReceiptTextIcon, words: 'orders', placement: 'dock' },
  { id: 'catalog', path: '/catalog', icon: 'catalog', words: 'catalog', placement: 'dock' },
  { id: 'members', path: '/members', icon: UsersIcon, words: 'members', placement: 'dock' },
  { id: 'editor', path: '/editor', icon: PaintbrushIcon, words: 'editor', placement: 'more' },
  {
    id: 'insights',
    path: '/insights',
    icon: ChartColumnIcon,
    words: 'insights',
    placement: 'more',
  },
  { id: 'settings', path: '/settings', icon: SettingsIcon, words: 'settings', placement: 'more' },
] as const satisfies readonly {
  id: string;
  path: string;
  icon: LucideIcon | 'catalog';
  words: NavWordKey;
  placement: NavPlacement;
}[];

export type NavPath = (typeof NAV)[number]['path'];

// Shop links at the foot of the sidebar and in the nav drawer.
export const FOOTER_ICONS = {
  viewMyShop: ExternalLinkIcon,
  shareMyShop: QrCodeIcon,
} as const satisfies Record<string, LucideIcon>;
