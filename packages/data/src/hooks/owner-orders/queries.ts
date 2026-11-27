import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { OwnerOrderPayload } from '@smartapp/core';
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
  return useOrdersInRange(slug, date, date, q);
}

/** Orders made from one business day to another (T95), for the List's period picker. */
export function useOrdersInRange(slug: string, from: string, to: string, q?: string) {
  const { ownerOrders } = useAdapters();
  return useQuery({
    queryKey: ownerOrdersQk.byRange(slug, from, to, q),
    queryFn: () => ownerOrders.listOrders({ slug, from, to, q }),
    enabled: Boolean(slug && from && to),
  });
}

/** Orders on any day that match a search (T126): finished ones too, newest first. */
export function useOrderSearch(slug: string, q: string) {
  const { ownerOrders } = useAdapters();
  const text = q.trim();
  return useQuery({
    queryKey: ownerOrdersQk.anyDay(slug, text),
    queryFn: () => ownerOrders.listOrders({ slug, anyDay: true, q: text }),
    enabled: Boolean(slug && text),
    placeholderData: keepPreviousData,
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

/**
 * The owner's quote for New order and Edit order (T111): prices and checks the lines the server's way
 * while the owner picks. Null payload (nothing picked yet) asks nothing; the last answer stays on
 * screen while the next one loads.
 */
export function useOwnerQuote(slug: string, payload: OwnerOrderPayload | null, orderId?: string) {
  const { ownerOrders } = useAdapters();
  const key = payload ? JSON.stringify(payload) : '';
  return useQuery({
    queryKey: ownerOrdersQk.ownerQuote(slug, key, orderId ?? ''),
    queryFn: () => {
      if (!payload) throw new Error('no payload');
      return ownerOrders.quoteOwnerOrder({ slug, payload, orderId });
    },
    enabled: Boolean(slug && payload),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

/** Days and times for New order and Edit order (T111): the owner's 60 days for these lines. */
export function useOwnerSchedule(
  slug: string,
  lines: OwnerOrderPayload['lines'],
  enabled: boolean,
  orderId?: string,
) {
  const { ownerOrders } = useAdapters();
  const key = JSON.stringify(lines.map((l) => [l.itemId, l.qty]));
  return useQuery({
    queryKey: ownerOrdersQk.ownerSchedule(slug, key, orderId ?? ''),
    queryFn: () => ownerOrders.getOwnerSchedule({ slug, lines, orderId }),
    enabled: Boolean(slug) && enabled && lines.length > 0,
    placeholderData: keepPreviousData,
  });
}
