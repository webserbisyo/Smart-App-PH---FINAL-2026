import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { GLOBAL_SCOPE, getDeviceStorage } from '../device-storage';
import { createMockStore, type MockStore } from '../mocks/store';
import type { DataSource } from '../env';
import type { DataAdapters } from './types';

let mockStore: MockStore | null = null;

/** The browser's mock back end; what the customer creates is kept on the phone. */
export function getMockStore(): MockStore {
  mockStore ??= createMockStore({
    persistence: {
      load: () => getDeviceStorage().mockState.read(GLOBAL_SCOPE).value,
      save: (data) => getDeviceStorage().mockState.write(GLOBAL_SCOPE, data),
    },
  });
  return mockStore;
}

/** Clears every demo change on this phone (the /kit and dev panel Reset). */
export function resetDemoData(): void {
  getMockStore().reset();
}

export function createAdapters(source: DataSource): DataAdapters {
  if (source === 'api') {
    throw new Error(
      'API adapters are added area by area in phase 4; set DATA_SOURCE=mock for now.',
    );
  }
  return getMockStore();
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
