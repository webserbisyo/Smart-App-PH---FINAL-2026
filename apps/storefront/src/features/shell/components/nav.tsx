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
    active: href === base ? pathname === base : pathname.startsWith(href),
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

/** Checkout, receipt and open item sheet have their own actions, so the dock steps aside. */
export function useDockHidden(): boolean {
  const { slug } = useShop();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasItem = Boolean(searchParams?.get('item'));
  return pathname.startsWith(`/${slug}/checkout`) || pathname.startsWith(`/${slug}/o/`) || hasItem;
}
