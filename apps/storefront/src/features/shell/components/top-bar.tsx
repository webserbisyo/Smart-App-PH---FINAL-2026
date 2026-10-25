'use client';

import Link from 'next/link';
import { ShoppingBagIcon } from 'lucide-react';
import { imageSources, words } from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Button } from '@smartapp/ui/components/button';
import { ClientOnly } from '@smartapp/ui/components/client-only';
import { ShopLogo } from '@smartapp/ui/compositions/shop-logo';
import { useNavLink, type NavItem } from '@smartapp/ui/lib/nav';
import { useBasketView } from '../../basket/components/use-basket-view';
import { LocationBar } from '../../location/components/location-bar';
import { AccountButton } from './account-button';
import { OfflineBanner } from './offline-banner';
import { OpenState } from './open-state';
import { useShopNav } from './nav';
import { useShop } from './shop-context';

function DesktopNavLink({ item }: { item: NavItem }) {
  return useNavLink(item, {
    className:
      'flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-muted-foreground outline-none hover-hover:hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-active:bg-shop-10-soft data-active:text-foreground',
    children: item.label,
  });
}

function BasketButton() {
  const { shop, setBasketOpen } = useShop();
  const { count, totalLabel } = useBasketView(shop);
  return (
    <Button
      variant="outline"
      className="relative min-h-11 shrink-0 rounded-full bg-card"
      aria-label={words.storefrontShell.openBasket(count, totalLabel)}
      onClick={() => setBasketOpen(true)}
    >
      <ShoppingBagIcon aria-hidden="true" />
      <span className="hidden whitespace-nowrap tabular xl:inline">{totalLabel}</span>
      {count > 0 ? (
        <Badge size="sm" radius="full" className="tabular" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </Badge>
      ) : null}
    </Button>
  );
}

// Phone and tablet: logo, name with the open state under it, then Join or the avatar; the location bar
// below. From 1024 px: one row with the nav links, location bar, basket button and avatar (no dock there).
// Name and location bar shrink with an ellipsis; links and buttons keep their size.
export function TopBar() {
  const { slug, shop } = useShop();
  const nav = useShopNav();
  const name = shop.storefront.info.name;
  const logo = imageSources(shop.storefront.info.logo);

  return (
    <header className="sticky top-0 z-sticky border-b border-border bg-shop-60 pt-safe">
      <div className="mx-auto flex max-w-280 flex-col gap-2 px-4 py-2 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex min-w-0 items-center gap-3 lg:max-w-64 lg:flex-1">
          <Link
            href={`/${slug}`}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ShopLogo name={name} src={logo} size="sm" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-base font-semibold">{name}</span>
              <OpenState />
            </span>
          </Link>
          <span className="lg:hidden">
            <AccountButton />
          </span>
        </div>
        <nav
          aria-label={words.storefrontShell.mainNav}
          className="hidden shrink-0 items-center gap-1 lg:flex"
        >
          {nav.map((item) => (
            <DesktopNavLink key={item.id} item={item} />
          ))}
        </nav>
        <LocationBar className="w-full lg:ml-auto lg:w-auto lg:max-w-xs lg:min-w-0 lg:flex-1" />
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <ClientOnly>
            <BasketButton />
          </ClientOnly>
          <AccountButton />
        </div>
      </div>
      <OfflineBanner />
    </header>
  );
}
