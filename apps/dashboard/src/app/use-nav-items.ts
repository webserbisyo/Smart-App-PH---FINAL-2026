import { createElement } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { CalendarDaysIcon, UserIcon } from 'lucide-react';
import { manilaDate, vocab, words } from '@smartapp/core';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { env } from './env.js';
import { useOpenOrders, useStorefront } from '@smartapp/data';
import { calendarLink } from './orders/calendar-link.js';
import { CATALOG_ICONS, FOOTER_ICONS, NAV, type NavPath } from './nav.js';
import { useShop } from './shop.js';

export function isActivePath(pathname: string, path: string): boolean {
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function storefrontUrl(slug: string): string {
  return `${env.VITE_STOREFRONT_URL}/${slug}`;
}

function navLink(to: NavPath | '/settings/account') {
  return createElement(Link, { to, preload: 'intent' });
}

export interface NavItems {
  dock: NavItem[];
  more: NavItem[];
  // dock + more, in order: the sidebar and rail list.
  all: NavItem[];
  viewMyShop: NavItem;
  shareMyShop: NavItem;
  account: NavItem;
  // Under Orders in the sidebar, for shops that take orders for later days (T85).
  ordersCalendar: NavItem | null;
}

export function useNavItems({ onShare }: { onShare: () => void }): NavItems {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const onCalendar = useRouterState({
    select: (state) =>
      state.location.pathname === '/orders' && state.location.search.view === 'bookings',
  });
  const shop = useShop();
  const shopVocab = vocab(shop.kind);
  const { data: openOrders } = useOpenOrders(shop.slug);
  const openCount = openOrders?.length ?? 0;
  const { data: storefront } = useStorefront(shop.slug);
  const takesLater = (storefront?.storefront.daysAhead ?? 1) > 1;
  const today = manilaDate(new Date());
  const laterCount = (openOrders ?? []).filter(
    (o) => o.scheduledAt !== null && manilaDate(o.dueAt) > today,
  ).length;

  const all = NAV.map((def): NavItem & { placement: string } => {
    const icon = def.icon === 'catalog' ? CATALOG_ICONS[shopVocab.catalogIcon] : def.icon;
    const label = def.words === 'catalog' ? words.nav.catalog(shop.kind) : words.nav[def.words];
    const count = def.id === 'orders' && openCount > 0 ? openCount : undefined;
    return {
      id: def.id,
      label,
      icon: createElement(icon),
      link: navLink(def.path),
      active: isActivePath(pathname, def.path),
      placement: def.placement,
      count,
    };
  });

  return {
    all,
    dock: all.filter((item) => item.placement === 'dock'),
    more: all.filter((item) => item.placement === 'more'),
    viewMyShop: {
      id: 'view-my-shop',
      label: words.nav.viewMyShop,
      icon: createElement(FOOTER_ICONS.viewMyShop),
      link: createElement('a', {
        href: storefrontUrl(shop.slug),
        target: '_blank',
        rel: 'noopener noreferrer',
      }),
      active: false,
    },
    shareMyShop: {
      id: 'share-my-shop',
      label: words.nav.shareMyShop,
      icon: createElement(FOOTER_ICONS.shareMyShop),
      link: createElement('button', { type: 'button', onClick: onShare }),
      active: false,
    },
    account: {
      id: 'account',
      label: words.nav.account,
      icon: createElement(UserIcon),
      link: navLink('/settings/account'),
      active: isActivePath(pathname, '/settings/account'),
    },
    ordersCalendar: takesLater
      ? {
          id: 'orders-calendar',
          label: words.nav.calendar,
          icon: createElement(CalendarDaysIcon),
          link: calendarLink(),
          active: onCalendar,
          count: laterCount > 0 ? laterCount : undefined,
        }
      : null,
  };
}
