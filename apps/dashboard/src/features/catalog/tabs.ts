import { z } from 'zod';
import { catalogWords } from '@smartapp/core';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { usePathTabs, type PathTab } from '@/app/tabs';

const CATALOG_TABS: readonly PathTab[] = [
  { id: 'items', label: catalogWords.tabItems, to: '/catalog' },
  { id: 'categories', label: catalogWords.tabCategories, to: '/catalog/categories' },
  { id: 'add-ons', label: catalogWords.tabAddOns, to: '/catalog/add-ons' },
  { id: 'variants', label: catalogWords.tabVariants, to: '/catalog/variants' },
];

export function useCatalogTabs(): NavItem[] {
  return usePathTabs(CATALOG_TABS);
}

// The Items list keeps its search and filter in the address (/catalog?q=fries&filter=sold_out), so
// opening an item and coming back shows the list as the owner left it (decision T47).
export const CATALOG_FILTERS = ['all', 'sold_out', 'hidden', 'archived'] as const;
export type CatalogFilter = (typeof CATALOG_FILTERS)[number];
export const CatalogSearchSchema = z.object({
  q: z.string().max(80).optional().catch(undefined),
  filter: z.enum(CATALOG_FILTERS).optional().catch(undefined),
});

// /catalog/new?from=<item id> opens the editor as an unsaved copy of that item (Duplicate).
export const NewItemSearchSchema = z.object({
  from: z.string().min(1).max(64).optional().catch(undefined),
  // "Add 'x'" from a search with no match starts the new item with that name.
  name: z.string().min(1).max(80).optional().catch(undefined),
});
