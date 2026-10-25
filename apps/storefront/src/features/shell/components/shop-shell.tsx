'use client';

import { useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { words } from '@smartapp/core';
import { ClientOnly } from '@smartapp/ui/components/client-only';
import { MAIN_CONTENT_ID, SkipNav } from '@smartapp/ui/components/skip-nav';
import { CartButton } from '@smartapp/ui/compositions/cart-button';
import { StorefrontDock } from '@smartapp/ui/compositions/storefront-dock';
import { useBasketView } from '../../basket/components/use-basket-view';
import { useDockHidden, useShopNav } from './nav';
import { useShop } from './shop-context';
import { TopBar } from './top-bar';

// Drawer and basket lines (number fields, items) load when first needed, not with the page.
const BasketDrawer = dynamic(
  () => import('../../basket/components/basket-drawer').then((m) => m.BasketDrawer),
  { ssr: false },
);

function LazyBasketDrawer() {
  const { basketOpen } = useShop();
  const [loaded, setLoaded] = useState(false);
  if (basketOpen && !loaded) setLoaded(true);
  return loaded ? <BasketDrawer /> : null;
}

function DockWithCart() {
  const { shop, setBasketOpen } = useShop();
  const items = useShopNav();
  const { count, totalLabel } = useBasketView(shop);
  return (
    <StorefrontDock
      label={words.storefrontShell.mainNav}
      items={items}
      cart={
        count > 0 ? (
          <CartButton
            variant="dock"
            count={count}
            label={words.storefrontShell.openBasket(count, totalLabel)}
            onClick={() => setBasketOpen(true)}
          />
        ) : null
      }
    />
  );
}

function Dock() {
  const items = useShopNav();
  // The basket lives on the phone: the server and the first paint show the dock without it.
  return (
    <ClientOnly fallback={<StorefrontDock label={words.storefrontShell.mainNav} items={items} />}>
      <DockWithCart />
    </ClientOnly>
  );
}

/** The storefront app frame around every shop page (T04; one column at every width, decision R1). */
export function ShopShell({ children }: { children: ReactNode }) {
  const dockHidden = useDockHidden();

  return (
    <div className="flex min-h-dvh flex-col bg-shop-60">
      <SkipNav>{words.shell.skipToContent}</SkipNav>
      <TopBar />
      <main
        id={MAIN_CONTENT_ID}
        className="mx-auto w-full max-w-280 min-w-0 flex-1 px-4 pt-4 pb-dock lg:pb-10"
        tabIndex={-1}
      >
        {children}
      </main>
      {dockHidden ? null : (
        <div className="lg:hidden">
          <Dock />
        </div>
      )}
      <LazyBasketDrawer />
    </div>
  );
}
