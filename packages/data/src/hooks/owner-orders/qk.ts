// Query keys for owner orders
export const ownerOrdersQk = {
  all: ['owner-orders'] as const,
  orders: (slug: string) => ['owner-orders', slug] as const,
  open: (slug: string, q?: string) => ['owner-orders', slug, 'open', q ?? ''] as const,
  byDate: (slug: string, date: string, q?: string) =>
    ['owner-orders', slug, 'date', date, q ?? ''] as const,
  scheduled: (slug: string, from: string, to: string) =>
    ['owner-orders', slug, 'scheduled', from, to] as const,
  find: (slug: string, code: string) => ['owner-orders', slug, 'find', code] as const,
  detail: (slug: string, orderId: string) => ['owner-orders', slug, 'detail', orderId] as const,
  bookingRules: (slug: string) => ['owner-orders', slug, 'booking-rules'] as const,
};
