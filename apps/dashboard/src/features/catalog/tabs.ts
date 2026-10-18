import { words } from '@smartapp/core';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { usePathTabs, type PathTab } from '@/app/tabs';

const CATALOG_TABS: readonly PathTab[] = [
  { id: 'items', label: words.screens.catalog.tabItems, to: '/catalog' },
  { id: 'categories', label: words.screens.catalog.tabCategories, to: '/catalog/categories' },
  { id: 'add-ons', label: words.screens.catalog.tabAddOns, to: '/catalog/add-ons' },
];

export function useCatalogTabs(): NavItem[] {
  return usePathTabs(CATALOG_TABS);
}
