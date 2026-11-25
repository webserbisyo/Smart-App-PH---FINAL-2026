import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DataSource } from '../env';
import { lazyAdapters, loadMockStore } from './lazy';
import type { DataAdapters } from './types';

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
