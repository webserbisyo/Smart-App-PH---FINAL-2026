// The storefront's two API adapters together, loaded on a shop page's first call (createShopAdapters).
import type { ShopAdapters } from '../types';
import { createApiCustomerAuthAdapter } from './customer-auth';
import { createApiStorefrontAdapter } from './storefront';

export function createApiShopAdapters(baseUrl: string): ShopAdapters {
  return {
    storefront: createApiStorefrontAdapter({ baseUrl }),
    customerAuth: createApiCustomerAuthAdapter(baseUrl),
  };
}
