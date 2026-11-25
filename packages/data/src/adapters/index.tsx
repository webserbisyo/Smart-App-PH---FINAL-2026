import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  dataPlan,
  usesApi,
  type ApiArea,
  type AppEnv,
  type DataPlan,
  type DataSource,
} from '../env';
import type { OwnerAuth } from '../owner-auth';
import { createApiOnboardingAdapter } from './api/onboarding';
import { createApiOwnerAuth } from './api/owner-auth';
import { createApiOwnerEditorAdapter } from './api/owner-editor';
import { createApiOwnerSettingsAdapter } from './api/owner-settings';
import { lazyAdapters } from './lazy';
import type { DataAdapters } from './types';

const loadMockStore = () => import('../mocks/browser').then((m) => m.getMockStore());

/** Clears every demo change on this phone (the kit page and dev panel Reset). */
export async function resetDemoData(): Promise<void> {
  (await loadMockStore()).reset();
}

export interface AdapterOptions {
  // The NestJS address (VITE_API_URL); needed once any area comes from the API.
  apiUrl?: string | undefined;
  // Areas to take from the API while the rest stay on sample data (decision T116, per-area switch).
  apiAreas?: readonly ApiArea[] | undefined;
  appEnv?: AppEnv | undefined;
}

export function planOf(source: DataSource, options: AdapterOptions = {}): DataPlan {
  return dataPlan(source, options.apiAreas ?? [], options.appEnv ?? 'development');
}

/**
 * The adapters a build uses. Sample data by default; each area listed in `apiAreas` (all of them with
 * DATA_SOURCE=api) calls NestJS instead. Areas not wired to the API yet stay on sample data outside a live
 * build; a live build refuses sample data altogether (dataPlan).
 */
export function createAdapters(source: DataSource, options: AdapterOptions = {}): DataAdapters {
  const plan = planOf(source, options);
  const mock = lazyAdapters(loadMockStore);
  if (plan.apiAreas.size === 0) return mock;
  const baseUrl = apiUrlOf(options);
  const getToken = async () => null;
  return {
    ...mock,
    ...(usesApi(plan, 'onboarding')
      ? { onboarding: createApiOnboardingAdapter({ baseUrl, getToken }) }
      : {}),
    ...(usesApi(plan, 'ownerSettings')
      ? { ownerSettings: createApiOwnerSettingsAdapter({ baseUrl, getToken }) }
      : {}),
    ...(usesApi(plan, 'ownerEditor')
      ? { ownerEditor: createApiOwnerEditorAdapter({ baseUrl, getToken }) }
      : {}),
  };
}

function apiUrlOf(options: AdapterOptions): string {
  if (!options.apiUrl) throw new Error('Set the API address (VITE_API_URL) to use the API.');
  return options.apiUrl.replace(/\/+$/, '');
}

/** The owner's login for this build: NestJS, or the sample-data mock (development and preview only). */
export function createOwnerAuth(source: DataSource, options: AdapterOptions = {}): OwnerAuth {
  const plan = planOf(source, options);
  if (usesApi(plan, 'ownerAuth')) return createApiOwnerAuth(apiUrlOf(options));
  const mock = () => import('../mocks/owner-auth').then((m) => m.mockOwnerAuth);
  return {
    getSession: async () => (await mock()).getSession(),
    signIn: async (input) => (await mock()).signIn(input),
    signOut: async () => (await mock()).signOut(),
    signUp: async (input) => (await mock()).signUp(input),
    verifySignupCode: async (input) => (await mock()).verifySignupCode(input),
    resendSignupCode: async (input) => (await mock()).resendSignupCode(input),
    sendResetCode: async (input) => (await mock()).sendResetCode(input),
    resetPassword: async (input) => (await mock()).resetPassword(input),
  };
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
  const adapters = useMemo(() => given ?? createAdapters(source), [given, source]);
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
