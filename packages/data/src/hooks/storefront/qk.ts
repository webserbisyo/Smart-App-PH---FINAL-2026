import type { OrderPayload } from '@smartapp/core';

// Every storefront query key in one place, so writes invalidate the right ones.
export const qk = {
  storefront: (slug: string) => ['storefront', slug] as const,
  quote: (slug: string, payload: OrderPayload | null) =>
    ['storefront', slug, 'quote', payload] as const,
  ordersAll: (slug: string) => ['storefront', slug, 'order'] as const,
  order: (slug: string, token: string) => ['storefront', slug, 'order', token] as const,
  myOrdersAll: (slug: string) => ['storefront', slug, 'my-orders'] as const,
  myOrders: (slug: string, tokens: readonly string[]) =>
    ['storefront', slug, 'my-orders', tokens] as const,
  account: (slug: string) => ['storefront', slug, 'account'] as const,
};
