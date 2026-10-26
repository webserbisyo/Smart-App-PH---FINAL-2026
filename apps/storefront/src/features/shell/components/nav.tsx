'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { GiftIcon, HouseIcon, PackageIcon, ReceiptTextIcon, UtensilsIcon } from 'lucide-react';
import { vocab, words } from '@smartapp/core';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { useShop } from './shop-context';

const CATALOG_ICON = { utensils: <UtensilsIcon />, package: <PackageIcon /> } as const;

/** Home, Menu or Products, Rewards (only when the stamp card is not Off), Orders (decision N30). */
export function useShopNav(): NavItem[] {
  const { slug, shop } = useShop();
  const pathname = usePathname();
  const base = `/${slug}`;
  const kind = vocab(shop.storefront.info.kind);
  const entry = (id: string, label: string, icon: NavItem['icon'], href: string): NavItem => ({
    id,
    label,
    icon,
    link: <Link href={href} />,
    active:
      href === base
        ? pathname === base
        : pathname.startsWith(href) ||
          // An order's own page lights up Orders (decision R45).
          (id === 'orders' && pathname.startsWith(`${base}/o/`)),
  });
  return [
    entry('home', words.nav.home, <HouseIcon />, base),
    entry('catalog', kind.catalog, CATALOG_ICON[kind.catalogIcon], `${base}/menu`),
    ...(shop.storefront.stampCard.status === 'off'
      ? []
      : [entry('rewards', words.storefrontShell.rewards, <GiftIcon />, `${base}/rewards`)]),
    entry('orders', words.nav.orders, <ReceiptTextIcon />, `${base}/orders`),
  ];
}

/**
 * Checkout and an open item sheet have their own bottom actions, so the dock steps aside. An order's page
 * keeps it, so there is always a way back to the shop (decision R45).
 */
export function useDockHidden(): boolean {
  const { slug } = useShop();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasItem = Boolean(searchParams?.get('item'));
  return pathname.startsWith(`/${slug}/checkout`) || hasItem;
}

/** Pages that pull to refresh (decision R46): Home, the menu, Rewards, Orders and an order's page. */
export function usePullRefreshOn(): boolean {
  const { slug } = useShop();
  const pathname = usePathname();
  const base = `/${slug}`;
  return (
    pathname === base ||
    ['/menu', '/rewards', '/orders', '/o/'].some((page) => pathname.startsWith(`${base}${page}`))
  );
}
