// Builds the adapters an app uses: sample data, or NestJS area by area (decision T116). Kept apart from the
// React provider so the storefront, which reads sample data until phase 4, never bundles the owner's API
// adapters (its JS budget, T31).
import { dataPlan, usesApi, type ApiArea, type DataPlan } from '../api-areas';
import type { AppEnv, DataSource } from '../env';
import type { OwnerAuth } from '../owner-auth';
import { createApiOnboardingAdapter } from './api/onboarding';
import { createApiOwnerAuth } from './api/owner-auth';
import { createApiOwnerCatalogAdapter } from './api/owner-catalog';
import { createApiOwnerEditorAdapter } from './api/owner-editor';
import { createApiOwnerMembersAdapter } from './api/owner-members';
import { createApiOwnerOrdersAdapter } from './api/owner-orders';
import { createApiOwnerSettingsAdapter } from './api/owner-settings';
import { createApiUploadsAdapter } from './api/uploads';
import { lazyAdapters, loadMockStore } from './lazy';
import type { DataAdapters } from './types';

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
    ...(usesApi(plan, 'uploads') ? { uploads: createApiUploadsAdapter(baseUrl) } : {}),
    ...(usesApi(plan, 'ownerSettings')
      ? { ownerSettings: createApiOwnerSettingsAdapter({ baseUrl, getToken }) }
      : {}),
    ...(usesApi(plan, 'ownerCatalog')
      ? { ownerCatalog: createApiOwnerCatalogAdapter({ baseUrl, getToken }) }
      : {}),
    ...(usesApi(plan, 'ownerEditor')
      ? { ownerEditor: createApiOwnerEditorAdapter({ baseUrl, getToken }) }
      : {}),
    ...(usesApi(plan, 'ownerOrders')
      ? { ownerOrders: createApiOwnerOrdersAdapter({ baseUrl, getToken }) }
      : {}),
    ...(usesApi(plan, 'ownerMembers')
      ? { ownerMembers: createApiOwnerMembersAdapter({ baseUrl, getToken }) }
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
