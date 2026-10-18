import { words } from '@smartapp/core';
import type { ShopKind } from '@smartapp/core';
import type { NavItem } from '@smartapp/ui/lib/nav';

export function getCatalogTabs(kind: ShopKind, activePath: string): NavItem[] {
  return [
    {
      id: 'catalog-items',
      label: words.screens.catalog.tabItems(kind),
      href: '/catalog',
      isActive: activePath === '/catalog',
    },
    {
      id: 'catalog-categories',
      label: words.screens.catalog.tabCategories,
      href: '/catalog/categories',
      isActive: activePath === '/catalog/categories',
    },
    {
      id: 'catalog-addons',
      label: words.screens.catalog.tabAddOns,
      href: '/catalog/add-ons',
      isActive: activePath === '/catalog/add-ons',
    },
  ];
}
