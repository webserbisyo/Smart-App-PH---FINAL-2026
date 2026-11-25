import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DataSource } from '../env';
import { lazyAdapters, lazyShopAdapters, loadMockStore } from './lazy';
import type { DataAdapters, OwnerOrdersAdapter, ShopAdapters } from './types';

/** Clears every demo change on this phone (the kit page and dev panel Reset). */
export async function resetDemoData(): Promise<void> {
  (await loadMockStore()).reset();
}

// Without given adapters only sample data is possible: an app on the API builds them with createAdapters.
function sampleAdapters(source: DataSource): DataAdapters {
  if (source !== 'mock') throw new Error('Pass the adapters from createAdapters to use the API.');
  return lazyAdapters(loadMockStore);
}

const AdaptersContext = createContext<DataAdapters | null>(null);

/** Pass `adapters` when the app also needs them outside React (the dashboard's route guards). */
export function DataProvider({
  source,
  adapters: given,
  children,
}: {
  source: DataSource;
  adapters?: DataAdapters | undefined;
  children: ReactNode;
}) {
  const adapters = useMemo(() => given ?? sampleAdapters(source), [given, source]);
  return <AdaptersContext.Provider value={adapters}>{children}</AdaptersContext.Provider>;
}

export function useAdapters(): DataAdapters {
  const adapters = useContext(AdaptersContext);
  if (!adapters) throw new Error('useAdapters needs a <DataProvider> above it');
  return adapters;
}

const ShopAdaptersContext = createContext<ShopAdapters | null>(null);

/**
 * A shop page's data root: only the storefront's two areas, so the owner adapters stay out of the
 * storefront's first-load JS. Without `adapters` it reads the sample shops.
 */
export function ShopDataProvider({
  source,
  adapters: given,
  children,
}: {
  source: DataSource;
  adapters?: ShopAdapters | undefined;
  children: ReactNode;
}) {
  const adapters = useMemo(() => {
    if (given) return given;
    if (source !== 'mock') throw new Error('Pass the shop adapters to use the API.');
    return lazyShopAdapters(loadMockStore);
  }, [given, source]);
  return <ShopAdaptersContext.Provider value={adapters}>{children}</ShopAdaptersContext.Provider>;
}

/** The storefront hooks' adapters: a shop page's own set, else the app's full set (the dashboard's tour). */
export function useShopAdapters(): ShopAdapters {
  const shop = useContext(ShopAdaptersContext);
  const all = useContext(AdaptersContext);
  const adapters = shop ?? all;
  if (!adapters) throw new Error('useShopAdapters needs a <ShopDataProvider> above it');
  return adapters;
}

/** The sample shops' owner Orders, for the demo panel on a preview build's receipt (loads on first use). */
export function sampleOwnerOrders(): Promise<OwnerOrdersAdapter> {
  return loadMockStore().then((store) => store.ownerOrders);
}

/**
 * Sample shops only, whatever the app's data source (T108): the sign-up tour reuses real screens (order chat,
 * order cards, the sales card) and their hooks read the sample shops here, never a signed-in owner's shop.
 * It keeps its own query cache, so nothing it reads mixes with the app's.
 */
export function SampleDataProvider({ children }: { children: ReactNode }) {
  const adapters = useMemo(() => lazyAdapters(loadMockStore), []);
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AdaptersContext.Provider value={adapters}>{children}</AdaptersContext.Provider>
    </QueryClientProvider>
  );
}
