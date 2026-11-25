// The storefront's data root: one QueryClient per browser tab, the adapters, the shop the server
// already read, and the dev scenario switch from the URL (?mock=, ?as=, ?now=; decision T26).
import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import type { PublicShop } from '@smartapp/core';
import { ShopDataProvider, useShopAdapters } from '../../adapters/index';
import type { ShopAdapters } from '../../adapters/types';
import { getDeviceStorage } from '../../device-storage';
import type { DataSource } from '../../env';
import { qk } from './qk';

// Bundlers replace process.env.NODE_ENV and SMARTAPP_PREVIEW at build time (Next and Vite), so the sample-data
// tools ship only in development and preview builds and drop out of live builds (decision T100).
declare const process: {
  env: { NODE_ENV?: string | undefined; SMARTAPP_PREVIEW?: string | undefined };
};

function DevScenario({ slug, source }: { slug: string; source: DataSource }) {
  const client = useQueryClient();
  const adapters = useShopAdapters();
  useEffect(() => {
    if (
      (process.env.NODE_ENV === 'production' && process.env.SMARTAPP_PREVIEW !== '1') ||
      source !== 'mock'
    )
      return;
    // The scenario writer loads only here, so production builds never contain it (decision T26).
    void import('../../mocks/scenario').then(({ loadMockScenario, readMockScenarioFromUrl }) => {
      loadMockScenario();
      const url = readMockScenarioFromUrl(new URLSearchParams(window.location.search), source);
      if (!url) return;
      if (url.fillBasket) {
        // Dev only: the demo lines module loads on demand, like the mock store.
        void Promise.all([
          adapters.storefront.getStorefront({ slug }),
          import('../../mocks/activity'),
        ]).then(([shop, { demoBasketLines }]) => {
          if (shop) getDeviceStorage().basket.write(slug, demoBasketLines(shop, new Date()));
        });
      }
      if (Object.keys(url.scenario).length > 0)
        void client.invalidateQueries({ queryKey: ['storefront'] });
    });
  }, [adapters, client, slug, source]);
  return null;
}

export function StorefrontDataProvider({
  slug,
  source,
  adapters,
  initialShop,
  children,
}: {
  slug: string;
  source: DataSource;
  // The API's shop adapters; left out, the sample shops.
  adapters?: ShopAdapters | undefined;
  // Read on the server for this request, so the first paint needs no fetch.
  initialShop: PublicShop;
  children: ReactNode;
}) {
  const [client] = useState(() => {
    const created = new QueryClient({
      defaultOptions: {
        queries: {
          // On the server nothing is stale, so the prerender never reads the clock (Next flags Date.now()).
          staleTime: () => (typeof window === 'undefined' ? 'static' : 30_000),
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    });
    // A fixed time, not Date.now(): Next prerenders this, and the client refetches on mount anyway.
    created.setQueryData(qk.storefront(slug), initialShop, { updatedAt: 0 });
    return created;
  });
  return (
    <QueryClientProvider client={client}>
      <ShopDataProvider source={source} adapters={adapters}>
        <DevScenario slug={slug} source={source} />
        {children}
      </ShopDataProvider>
    </QueryClientProvider>
  );
}
