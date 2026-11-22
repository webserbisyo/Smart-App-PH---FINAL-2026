import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DataSource } from '../env';
import { lazyAdapters } from './lazy';
import type { DataAdapters } from './types';

const loadMockStore = () => import('../mocks/browser').then((m) => m.getMockStore());

/** Clears every demo change on this phone (the kit page and dev panel Reset). */
export async function resetDemoData(): Promise<void> {
  (await loadMockStore()).reset();
}

export function createAdapters(source: DataSource): DataAdapters {
  if (source === 'api') {
    throw new Error(
      'API adapters are added area by area in phase 4; set DATA_SOURCE=mock for now.',
    );
  }
  return lazyAdapters(loadMockStore);
}

const AdaptersContext = createContext<DataAdapters | null>(null);

export function DataProvider({ source, children }: { source: DataSource; children: ReactNode }) {
  const adapters = useMemo(() => createAdapters(source), [source]);
  return <AdaptersContext.Provider value={adapters}>{children}</AdaptersContext.Provider>;
}

export function useAdapters(): DataAdapters {
  const adapters = useContext(AdaptersContext);
  if (!adapters) throw new Error('useAdapters needs a <DataProvider> above it');
  return adapters;
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
