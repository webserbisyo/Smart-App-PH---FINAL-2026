import { useRouter } from '@tanstack/react-router';
import type { NavItem } from '@smartapp/ui/lib/nav';
import type { ShopKind } from '@smartapp/core';
import { NAV_DEFS, CATALOG_FOOD_ICON, CATALOG_RETAIL_ICON } from './nav.js';

function resolvePath(pathname: string, path: string, matchSubPaths?: boolean): boolean {
  if (matchSubPaths) {
    return pathname === path || pathname.startsWith(path + '/');
  }
  return pathname === path;
}

export function useNavItems(kind: ShopKind): {
  dockItems: NavItem[];
  moreItems: NavItem[];
  footItems: NavItem[];
  allSidebarItems: NavItem[];
} {
  const router = useRouter();
  const pathname = router.state.location.pathname;

  const toNavItem = (def: (typeof NAV_DEFS)[number]): NavItem => {
    const label = typeof def.label === 'function' ? def.label(kind) : def.label;

    // Pick correct catalog icon per shop kind
    let icon = def.icon;
    if (def.id === 'catalog') {
      icon = kind === 'retail' ? CATALOG_RETAIL_ICON : CATALOG_FOOD_ICON;
    }

    return {
      id: def.id,
      label,
      href: def.path,
      icon,
      isActive: resolvePath(pathname, def.path, def.matchSubPaths),
    };
  };

  const dockItems = NAV_DEFS.filter((d) => d.placement === 'dock').map(toNavItem);
  const moreItems = NAV_DEFS.filter((d) => d.placement === 'more').map(toNavItem);
  const footItems = NAV_DEFS.filter((d) => d.placement === 'foot').map(toNavItem);

  // Sidebar shows dock + more items together (vertically); foot is separate.
  const allSidebarItems = NAV_DEFS.filter(
    (d) => d.placement === 'dock' || d.placement === 'more',
  ).map(toNavItem);

  return { dockItems, moreItems, footItems, allSidebarItems };
}
