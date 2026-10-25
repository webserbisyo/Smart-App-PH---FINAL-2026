// The storefront's data root: one QueryClient per browser tab, the adapters, the shop the server
// already read, and the dev scenario switch from the URL (?mock=, ?as=, ?now=; decision T26).
import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import type { PublicShop } from '@smartapp/core';
import { DataProvider, useAdapters } from '../../adapters/index';
import { getDeviceStorage } from '../../device-storage';
import { loadMockScenario, readMockScenarioFromUrl } from '../../mocks/scenario';
import type { DataSource } from '../../env';
import { qk } from './qk';

// Bundlers replace process.env.NODE_ENV at build time (Next and Vite), so dev-only code drops out of production.
declare const process: { env: { NODE_ENV?: string | undefined } };

function DevScenario({ slug, source }: { slug: string; source: DataSource }) {
  const client = useQueryClient();
  const adapters = useAdapters();
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || source !== 'mock') return;
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
  }, [adapters, client, slug, source]);
  return null;
}

export function StorefrontDataProvider({
  slug,
  source,
  initialShop,
  children,
}: {
  slug: string;
  source: DataSource;
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
      <DataProvider source={source}>
        <DevScenario slug={slug} source={source} />
        {children}
      </DataProvider>
    </QueryClientProvider>
  );
}
