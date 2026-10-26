import { createContext, useContext, useMemo, type ReactNode } from 'react';
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
