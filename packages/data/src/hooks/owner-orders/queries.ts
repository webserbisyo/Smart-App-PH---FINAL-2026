import { useQuery } from '@tanstack/react-query';
import { useAdapters } from '../../adapters/index';
import { ownerOrdersQk } from './qk';

export function useOpenOrders(slug: string, q?: string) {
  const { ownerOrders } = useAdapters();
  return useQuery({
    queryKey: ownerOrdersQk.open(slug, q),
    queryFn: () => ownerOrders.listOrders({ slug, open: true, q }),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    enabled: Boolean(slug),
  });
}

export function useOrdersByDate(slug: string, date: string, q?: string) {
  const { ownerOrders } = useAdapters();
  return useQuery({
    queryKey: ownerOrdersQk.byDate(slug, date, q),
    queryFn: () => ownerOrders.listOrders({ slug, date, q }),
    enabled: Boolean(slug && date),
  });
}

export function useScheduledOrders(slug: string, from: string, to: string) {
  const { ownerOrders } = useAdapters();
  return useQuery({
    queryKey: ownerOrdersQk.scheduled(slug, from, to),
    queryFn: () => ownerOrders.listScheduled({ slug, from, to }),
    enabled: Boolean(slug && from && to),
  });
}

export function useOrderDetail(slug: string, orderId: string) {
  const { ownerOrders } = useAdapters();
  return useQuery({
    queryKey: ownerOrdersQk.detail(slug, orderId),
    queryFn: () => ownerOrders.getOrderDetail({ slug, orderId }),
    enabled: Boolean(slug && orderId),
  });
}

export function useFindOrder(slug: string, code: string) {
  const { ownerOrders } = useAdapters();
  return useQuery({
    queryKey: ownerOrdersQk.find(slug, code),
    queryFn: () => ownerOrders.findOrder({ slug, code }),
    enabled: Boolean(slug && code.trim()),
  });
}

export function useBookingRules(slug: string) {
  const { ownerOrders } = useAdapters();
  return useQuery({
    queryKey: ownerOrdersQk.bookingRules(slug),
    queryFn: () => ownerOrders.getBookingRules({ slug }),
    enabled: Boolean(slug),
  });
}

/** Where an order can move (T85): the shop's days and times with this order's own spot counted as free. */
export function useRescheduleSchedule(slug: string, orderId: string, enabled = true) {
  const { ownerOrders } = useAdapters();
  return useQuery({
    queryKey: ownerOrdersQk.rescheduleSchedule(slug, orderId),
    queryFn: () => ownerOrders.getRescheduleSchedule({ slug, orderId }),
    enabled: enabled && Boolean(slug && orderId),
  });
}

// The Chats list (T87): refreshed like the board, so a new photo shows within seconds.
export function useChats(slug: string, enabled = true) {
  const { ownerOrders } = useAdapters();
  return useQuery({
    queryKey: ownerOrdersQk.chats(slug),
    queryFn: () => ownerOrders.listChats({ slug }),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    enabled: Boolean(slug) && enabled,
  });
}

// A payment photo's address. Signed links run out, so it is fetched when shown, not stored.
export function useProofUrl(slug: string, path: string | null) {
  const { ownerOrders } = useAdapters();
  return useQuery({
    queryKey: ownerOrdersQk.proofUrl(slug, path ?? ''),
    queryFn: () => ownerOrders.getProofUrl({ slug, path: path ?? '' }),
    staleTime: 5 * 60_000,
    enabled: Boolean(slug && path),
  });
}
