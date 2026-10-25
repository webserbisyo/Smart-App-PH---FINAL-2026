'use client';

import { useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { words } from '@smartapp/core';
import { ClientOnly } from '@smartapp/ui/components/client-only';
import { MAIN_CONTENT_ID, SkipNav } from '@smartapp/ui/components/skip-nav';
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
const BasketPanel = dynamic(
  () => import('../../basket/components/basket-panel').then((m) => m.BasketPanel),
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
  const { rows, count, totalLabel } = useBasketView(shop);
  return (
    <StorefrontDock
      label={words.storefrontShell.mainNav}
      items={items}
      cart={
        count > 0
          ? {
              count,
              totalLabel,
              thumbs: rows.map((r) => r.photo),
              link: <button type="button" onClick={() => setBasketOpen(true)} />,
              label: words.storefrontShell.openBasket(count, totalLabel),
            }
          : null
      }
    />
  );
}

function Dock() {
  const items = useShopNav();
  // The basket lives on the phone: the server and the first paint show the dock without it.
  return (
    <ClientOnly
      fallback={<StorefrontDock label={words.storefrontShell.mainNav} items={items} cart={null} />}
    >
      <DockWithCart />
    </ClientOnly>
  );
}

/** The storefront app frame around every shop page (T04). */
export function ShopShell({ children }: { children: ReactNode }) {
  const { slug } = useShop();
  const pathname = usePathname();
  const dockHidden = useDockHidden();
  // From 1280 px, Home and Menu keep the basket in a sticky 360 px column.
  const withColumn = pathname === `/${slug}` || pathname.startsWith(`/${slug}/menu`);

  return (
    <div className="flex min-h-dvh flex-col bg-shop-60">
      <SkipNav>{words.shell.skipToContent}</SkipNav>
      <TopBar />
      <div className="mx-auto flex w-full max-w-280 flex-1 gap-6 px-4 pt-4 pb-dock lg:pb-10">
        <main id={MAIN_CONTENT_ID} className="min-w-0 flex-1" tabIndex={-1}>
          {children}
        </main>
        {withColumn ? (
          <aside
            aria-label={words.basket.title}
            className="sticky top-24 hidden w-90 shrink-0 self-start rounded-xl border border-border bg-card p-4 xl:block"
          >
            <h2 className="mb-3 text-base font-semibold">{words.basket.title}</h2>
            <BasketPanel />
          </aside>
        ) : null}
      </div>
      {dockHidden ? null : (
        <div className="lg:hidden">
          <Dock />
        </div>
      )}
      <LazyBasketDrawer />
    </div>
  );
}
