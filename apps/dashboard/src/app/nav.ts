import type React from 'react';
import {
  HouseIcon,
  ReceiptTextIcon,
  UtensilsIcon,
  PackageIcon,
  UsersIcon,
  PaintbrushIcon,
  ChartColumnIcon,
  SettingsIcon,
  ExternalLinkIcon,
  QrCodeIcon,
} from 'lucide-react';
import type { ShopKind } from '@smartapp/core';
import { words } from '@smartapp/core';

export type NavPlacement = 'dock' | 'sidebar' | 'more' | 'foot';

export interface NavDef {
  id: string;
  path: string;
  /** For the catalog item the icon depends on kind; for all others it is fixed. */
  icon: React.ComponentType<{ className?: string }>;
  /** For the catalog item the label depends on kind; for all others it is fixed. */
  label: string | ((kind: ShopKind) => string);
  placement: NavPlacement;
  /** When true, sub-paths count as active (e.g. /orders/$id → orders is active). */
  matchSubPaths?: boolean | undefined;
}

// Stable icon per id — catalog is overridden by useNavItems based on kind.
export const CATALOG_FOOD_ICON: React.ComponentType<{ className?: string }> = UtensilsIcon;
export const CATALOG_RETAIL_ICON: React.ComponentType<{ className?: string }> = PackageIcon;

export const NAV_DEFS: readonly NavDef[] = [
  {
    id: 'home',
    path: '/',
    icon: HouseIcon,
    label: words.nav.home,
    placement: 'dock',
  },
  {
    id: 'orders',
    path: '/orders',
    icon: ReceiptTextIcon,
    label: words.nav.orders,
    placement: 'dock',
    matchSubPaths: true,
  },
  {
    id: 'catalog',
    path: '/catalog',
    // Default icon; useNavItems overrides this per kind at runtime.
    icon: UtensilsIcon,
    label: words.nav.catalog,
    placement: 'dock',
    matchSubPaths: true,
  },
  {
    id: 'members',
    path: '/members',
    icon: UsersIcon,
    label: words.nav.members,
    placement: 'dock',
    matchSubPaths: true,
  },
  {
    id: 'editor',
    path: '/editor',
    icon: PaintbrushIcon,
    label: words.nav.editor,
    placement: 'more',
  },
  {
    id: 'insights',
    path: '/insights',
    icon: ChartColumnIcon,
    label: words.nav.insights,
    placement: 'more',
  },
  {
    id: 'settings',
    path: '/settings',
    icon: SettingsIcon,
    label: words.nav.settings,
    placement: 'more',
    matchSubPaths: true,
  },
  {
    id: 'view-shop',
    path: '/',
    icon: ExternalLinkIcon,
    label: words.nav.viewMyShop,
    placement: 'foot',
  },
  {
    id: 'share-shop',
    path: '/',
    icon: QrCodeIcon,
    label: words.nav.shareMyShop,
    placement: 'foot',
  },
];
