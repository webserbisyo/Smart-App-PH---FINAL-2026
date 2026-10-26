'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { HeartIcon } from 'lucide-react';
import { imageSources, openState, openStateText, words, type OpenStateKind } from '@smartapp/core';
import { useNow } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { ClientOnly } from '@smartapp/ui/components/client-only';
import { Tooltip, TooltipContent, TooltipTrigger } from '@smartapp/ui/components/tooltip';
import { CartButton } from '@smartapp/ui/compositions/cart-button';
import { StatusLogo } from '@smartapp/ui/compositions/status-logo';
import { useNavLink, type NavItem } from '@smartapp/ui/lib/nav';
import { useBasketView } from '../../basket/components/use-basket-view';
import { LocationBar } from '../../location/components/location-bar';
import { AccountButton } from './account-button';
import { OfflineBanner } from './offline-banner';
import { useShopNav } from './nav';
import { useShop } from './shop-context';

function subscribeScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
}

// The bar turns to frosted glass once the page moves under it.
function useScrolled(): boolean {
  return useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 4,
    () => false,
  );
}

// Icon left of the word, the same icons as the phone dock (decision R39).
function DesktopNavLink({ item }: { item: NavItem }) {
  return useNavLink(item, {
    className:
      'flex h-9 items-center gap-2 rounded-full pr-4 pl-3.5 text-sm font-medium text-muted-foreground outline-none transition-colors duration-base hover-hover:hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-active:bg-card data-active:text-foreground data-active:shadow-sm pointer-coarse:h-11',
    children: (
      <>
        <span aria-hidden="true" className="flex *:size-4">
          {item.icon}
        </span>
        {item.label}
      </>
    ),
  });
}

// Hover and keyboard focus show what an icon button does (installed shadcn Tooltip, desktop pointers).
function BarTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="flex" />}>{children}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function BarCart() {
  const { shop, setBasketOpen } = useShop();
  const { count, totalLabel } = useBasketView(shop);
  const label = words.storefrontShell.openBasket(count, totalLabel);
  return (
    <BarTip label={label}>
      <CartButton count={count} label={label} onClick={() => setBasketOpen(true)} />
    </BarTip>
  );
}

// The logo in its open, busy or closed ring (decision R4); the name link says the state in words.
function useOpenKind(): { kind: OpenStateKind; text: string } | null {
  const { shop } = useShop();
  const now = useNow();
  if (!now) return null;
  const state = openState(shop.storefront, now);
  return { kind: state.paused ? 'closed' : state.state, text: openStateText(state, now) };
}

// Phone: ring logo, the name with the short location pill under it, then favourites and the account
// menu; the cart sits beside the dock. From 1024 px: the same left side, Home, Menu and Rewards as a
// pill group in the middle, then favourites, cart and account (decision R5: Orders lives in the
// account menu).
export function TopBar() {
  const { slug, shop, setInfoOpen } = useShop();
  const nav = useShopNav().filter((item) => item.id !== 'orders');
  const scrolled = useScrolled();
  const open = useOpenKind();
  const name = shop.storefront.info.name;
  const logo = imageSources(shop.storefront.info.logo);

  return (
    <header
      data-scrolled={scrolled ? '' : undefined}
      className="sticky top-0 z-sticky border-b border-transparent bg-shop-60 pt-safe transition-colors duration-base data-scrolled:glass data-scrolled:shadow-sm"
    >
      <div className="mx-auto flex h-16 max-w-280 items-center gap-3 px-4 lg:gap-6">
        {/* One stretched button over logo and name opens Shop info (redesign R7); the pill sits above
            it. Decision R4's ring and word on the logo, the full state spoken with the name. */}
        <div className="relative flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
          <StatusLogo
            name={name}
            src={logo}
            state={open?.kind ?? null}
            stateLabel={open ? words.shop.openStateShort[open.kind] : ''}
          />
          <div className="flex min-w-0 flex-col items-start gap-1">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={words.storefrontShell.shopInfo(name, open?.text ?? '')}
              onClick={() => setInfoOpen(true)}
              className="max-w-full truncate rounded-sm text-left text-base leading-tight font-semibold outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {name}
            </button>
            <LocationBar className="z-10" />
          </div>
        </div>
        <nav
          aria-label={words.storefrontShell.mainNav}
          className="mx-auto hidden items-center gap-1 rounded-full bg-muted/70 p-1 lg:flex"
        >
          {nav.map((item) => (
            <DesktopNavLink key={item.id} item={item} />
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          <BarTip label={words.storefrontShell.favourites}>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 rounded-full"
              aria-label={words.storefrontShell.favourites}
              nativeButton={false}
              render={<Link href={`/${slug}/menu?fav=1`} />}
            >
              <HeartIcon aria-hidden="true" className="size-5" />
            </Button>
          </BarTip>
          <ClientOnly>
            <span className="hidden lg:flex">
              <BarCart />
            </span>
          </ClientOnly>
          <AccountButton />
        </div>
      </div>
      <OfflineBanner />
    </header>
  );
}
