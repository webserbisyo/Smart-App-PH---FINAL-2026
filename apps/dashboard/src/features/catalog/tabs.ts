import { catalogWords } from '@smartapp/core';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { usePathTabs, type PathTab } from '@/app/tabs';

const CATALOG_TABS: readonly PathTab[] = [
  { id: 'items', label: catalogWords.tabItems, to: '/catalog' },
  { id: 'categories', label: catalogWords.tabCategories, to: '/catalog/categories' },
  { id: 'add-ons', label: catalogWords.tabAddOns, to: '/catalog/add-ons' },
];

export function useCatalogTabs(): NavItem[] {
  return usePathTabs(CATALOG_TABS);
}
