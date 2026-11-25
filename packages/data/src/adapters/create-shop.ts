// The storefront's adapters: sample data, or NestJS per area (decision T116, launch phase 5). Kept apart from
// createAdapters so a shop page bundles none of the owner's adapters (its JS budget, T31); the API code itself
// loads on the first call.
import type { AppEnv, DataSource } from '../env';
import { lazyShopAdapters, loadMockStore } from './lazy';
import type { ShopAdapters } from './types';

export interface ShopAdapterOptions {
  // The NestJS address (NEXT_PUBLIC_API_URL); needed once an area comes from the API.
  apiUrl?: string | undefined;
  // Area names (checked on the server with ApiAreasSchema); kept as plain text here so the schemas stay out
  // of the shop pages' JS.
  apiAreas?: readonly string[] | undefined;
  appEnv?: AppEnv | undefined;
}

export function createShopAdapters(
  source: DataSource,
  options: ShopAdapterOptions = {},
): ShopAdapters {
  // The same rule as dataPlan: a live build never reads sample data.
  if (options.appEnv === 'production' && source !== 'api') {
    throw new Error('A live build cannot use sample data: set DATA_SOURCE=api.');
  }
  const areas = options.apiAreas ?? [];
  const shopOnApi = source === 'api' || areas.includes('storefront');
  const authOnApi = source === 'api' || areas.includes('customerAuth');
  if (!shopOnApi && !authOnApi) return lazyShopAdapters(loadMockStore);
  if (!options.apiUrl) throw new Error('Set the API address (NEXT_PUBLIC_API_URL) to use the API.');
  const baseUrl = options.apiUrl.replace(/\/+$/, '');
  return lazyShopAdapters(async () => {
    const [api, mock] = await Promise.all([
      import('./api/shop').then((m) => m.createApiShopAdapters(baseUrl)),
      shopOnApi && authOnApi ? null : loadMockStore(),
    ]);
    return {
      storefront: shopOnApi || !mock ? api.storefront : mock.storefront,
      customerAuth: authOnApi || !mock ? api.customerAuth : mock.customerAuth,
    };
  });
}
