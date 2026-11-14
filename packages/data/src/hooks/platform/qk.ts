// Query keys for Super Admin (T88 to T92).
import type { AdminPaymentView, AdminShopFilter } from '@smartapp/core';

export const platformQk = {
  all: ['platform'] as const,
  today: () => ['platform', 'today'] as const,
  shops: (filter: AdminShopFilter, q: string) => ['platform', 'shops', filter, q] as const,
  shop: (id: string) => ['platform', 'shop', id] as const,
  leads: () => ['platform', 'leads'] as const,
  payments: (view: AdminPaymentView) => ['platform', 'payments', view] as const,
  tracking: () => ['platform', 'tracking'] as const,
  setup: () => ['platform', 'setup'] as const,
};
