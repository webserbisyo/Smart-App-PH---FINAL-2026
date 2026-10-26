'use client';

import { useEffect, useRef } from 'react';
import { ReceiptTextIcon, RotateCwIcon, StoreIcon } from 'lucide-react';
import { artPath, DEFAULT_BRAND_COLOR, vocab, words } from '@smartapp/core';
import { useLastShop } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { EmptyState } from '@smartapp/ui/compositions/empty-state';
import { ShopTheme } from '@smartapp/ui/compositions/shop-theme';

const W = words.offlinePage;

/**
 * The offline page (c-empty-9 look): the last shop's name and colours, Try again, and plain links to its
 * Menu and My orders (both open from the saved copy). Plain <a> links: the router can't fetch offline.
 */
export function OfflineScreen() {
  const shop = useLastShop();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <ShopTheme
      brandColor={shop?.brandColor ?? DEFAULT_BRAND_COLOR}
      className="min-h-dvh bg-background"
    >
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-3 px-4 py-10">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="flex items-center justify-center gap-2 text-base font-semibold text-muted-foreground outline-none"
        >
          <StoreIcon aria-hidden="true" className="size-4" />
          {shop?.name ?? W.metaTitle}
        </h1>
        <EmptyState
          id="offline-page"
          art={artPath('offline')}
          title={W.title}
          description={W.body}
          action={
            <div className="flex w-full flex-col gap-2">
              <Button
                onClick={() => window.location.reload()}
                className="h-12 rounded-full text-base"
              >
                <RotateCwIcon aria-hidden="true" />
                {W.tryAgain}
              </Button>
              {shop ? (
                <>
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<a href={`/${shop.slug}/menu`} />}
                    className="h-12 rounded-full text-base"
                  >
                    {W.menu(vocab(shop.kind).catalog)}
                  </Button>
                  <Button
                    variant="ghost"
                    nativeButton={false}
                    render={<a href={`/${shop.slug}/orders`} />}
                    className="h-11 rounded-full text-base"
                  >
                    <ReceiptTextIcon aria-hidden="true" />
                    {W.orders}
                  </Button>
                </>
              ) : null}
            </div>
          }
        />
      </main>
    </ShopTheme>
  );
}
