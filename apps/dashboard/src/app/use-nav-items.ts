import { createElement } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { UserIcon } from 'lucide-react';
import { vocab, words } from '@smartapp/core';
import type { NavItem } from '@smartapp/ui/lib/nav';
import { env } from './env.js';
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
}

export function useNavItems({ onShare }: { onShare: () => void }): NavItems {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const shop = useShop();
  const shopVocab = vocab(shop.kind);

  const all = NAV.map((def): NavItem & { placement: string } => {
    const icon = def.icon === 'catalog' ? CATALOG_ICONS[shopVocab.catalogIcon] : def.icon;
    const label = def.words === 'catalog' ? words.nav.catalog(shop.kind) : words.nav[def.words];
    return {
      id: def.id,
      label,
      icon: createElement(icon),
      link: navLink(def.path),
      active: isActivePath(pathname, def.path),
      placement: def.placement,
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
  };
}
