import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';
import { AdminPaymentViewEnum, AdminShopFilterEnum } from '@smartapp/core';
export const PANEL_TABS = ['overview', 'billing', 'activity'] as const;
export type PanelTab = (typeof PANEL_TABS)[number];
const PanelTabEnum = z.enum(PANEL_TABS);

// Shops (T88): the chip, the search and the open shop all live in the address, so a link opens the same view.
export const AdminShopsSearchSchema = z.object({
  filter: AdminShopFilterEnum.optional().catch(undefined),
  q: z.string().max(60).optional().catch(undefined),
  shop: z.string().min(1).max(64).optional().catch(undefined),
  tab: PanelTabEnum.optional().catch(undefined),
});
export type AdminShopsSearch = z.infer<typeof AdminShopsSearchSchema>;

// Payments (T88): the view and the shop whose Billing chat is open.
export const AdminPaymentsSearchSchema = z.object({
  view: AdminPaymentViewEnum.optional().catch(undefined),
  shop: z.string().min(1).max(64).optional().catch(undefined),
  tab: PanelTabEnum.optional().catch(undefined),
});
export type AdminPaymentsSearch = z.infer<typeof AdminPaymentsSearchSchema>;

export function useAdminShopsSearch(): AdminShopsSearch {
  const search = useSearch({ strict: false });
  return AdminShopsSearchSchema.parse({
    filter: search.filter,
    q: search.q,
    shop: search.shop,
    tab: search.tab,
  });
}

export function useAdminPaymentsSearch(): AdminPaymentsSearch {
  const search = useSearch({ strict: false });
  return AdminPaymentsSearchSchema.parse({ view: search.view, shop: search.shop, tab: search.tab });
}

/** Changes some params and keeps the rest; `replace` for typing and chips so Back stays useful. */
export function useSetAdminShopsSearch() {
  const navigate = useNavigate();
  return useCallback(
    (patch: Partial<AdminShopsSearch>, options: { replace?: boolean } = {}) => {
      void navigate({
        to: '/admin/shops',
        search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }),
        replace: options.replace ?? false,
      });
    },
    [navigate],
  );
}

export function useSetAdminPaymentsSearch() {
  const navigate = useNavigate();
  return useCallback(
    (patch: Partial<AdminPaymentsSearch>, options: { replace?: boolean } = {}) => {
      void navigate({
        to: '/admin/payments',
        search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }),
        replace: options.replace ?? false,
      });
    },
    [navigate],
  );
}
