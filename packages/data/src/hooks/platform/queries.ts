import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { AdminPaymentView, AdminShopFilter } from '@smartapp/core';
import { useAdapters } from '../../adapters/index';
import { platformQk } from './qk';

/** Today: what needs the founder, the 4 numbers and the 30-day funnel. Looks again every minute. */
export function useAdminToday() {
  const { platform } = useAdapters();
  return useQuery({
    queryKey: platformQk.today(),
    queryFn: () => platform.getAdminToday(),
    refetchInterval: 60_000,
  });
}

export function useAdminShops(filter: AdminShopFilter, q: string) {
  const { platform } = useAdapters();
  return useQuery({
    queryKey: platformQk.shops(filter, q),
    queryFn: () => platform.listAdminShops({ filter, q }),
    placeholderData: keepPreviousData,
  });
}

/** One shop for the side panel; null while none is open. */
export function useAdminShop(shopId: string | null) {
  const { platform } = useAdapters();
  return useQuery({
    queryKey: platformQk.shop(shopId ?? ''),
    queryFn: () => {
      if (!shopId) throw new Error('no shop picked');
      return platform.getAdminShop({ shopId });
    },
    enabled: shopId !== null,
    refetchInterval: 30_000,
  });
}

export function useAdminLeads(enabled = true) {
  const { platform } = useAdapters();
  return useQuery({ queryKey: platformQk.leads(), queryFn: () => platform.listLeads(), enabled });
}

export function useAdminPayments(view: AdminPaymentView) {
  const { platform } = useAdapters();
  return useQuery({
    queryKey: platformQk.payments(view),
    queryFn: () => platform.listAdminPayments({ view }),
    placeholderData: keepPreviousData,
  });
}

export function useTracking() {
  const { platform } = useAdapters();
  return useQuery({ queryKey: platformQk.tracking(), queryFn: () => platform.getTracking() });
}

export function usePlatformSetup() {
  const { platform } = useAdapters();
  return useQuery({ queryKey: platformQk.setup(), queryFn: () => platform.getPlatformSetup() });
}
