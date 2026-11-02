import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  BoardOrder,
  BookingRules,
  OrderStatus,
  PauseMode,
  PaymentMethod,
} from '@smartapp/core';
import { useAdapters } from '../../adapters/index';
import { ownerOrdersQk } from './qk';

export function useSetPause(slug: string) {
  const { ownerOrders } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { mode: PauseMode }) => ownerOrders.setPause({ slug, mode: input.mode }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerOrdersQk.orders(slug) });
    },
  });
}

export function useAdvanceOrder(slug: string) {
  const { ownerOrders } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { orderId: string; toStatus: OrderStatus; trackingUrl?: string }) =>
      ownerOrders.advanceOrder({
        slug,
        orderId: input.orderId,
        toStatus: input.toStatus,
        trackingUrl: input.trackingUrl,
      }),
    onMutate: async ({ orderId, toStatus }) => {
      await qc.cancelQueries({ queryKey: ownerOrdersQk.open(slug) });
      const previous = qc.getQueryData<BoardOrder[]>(ownerOrdersQk.open(slug));
      if (previous) {
        qc.setQueryData<BoardOrder[]>(
          ownerOrdersQk.open(slug),
          previous.map((o) => (o.id === orderId ? { ...o, status: toStatus } : o)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(ownerOrdersQk.open(slug), context.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ownerOrdersQk.orders(slug) });
      if (vars?.orderId) {
        qc.invalidateQueries({ queryKey: ownerOrdersQk.detail(slug, vars.orderId) });
      }
    },
  });
}

export function useRecallOrder(slug: string) {
  const { ownerOrders } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { orderId: string }) =>
      ownerOrders.recallOrder({ slug, orderId: input.orderId }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ownerOrdersQk.open(slug) });
      const previous = qc.getQueryData<BoardOrder[]>(ownerOrdersQk.open(slug));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(ownerOrdersQk.open(slug), context.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ownerOrdersQk.orders(slug) });
      if (vars?.orderId) {
        qc.invalidateQueries({ queryKey: ownerOrdersQk.detail(slug, vars.orderId) });
      }
    },
  });
}

export function useCancelOrder(slug: string) {
  const { ownerOrders } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { orderId: string; reason: string }) =>
      ownerOrders.cancelOrder({ slug, orderId: input.orderId, reason: input.reason }),
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ownerOrdersQk.orders(slug) });
      if (vars?.orderId) {
        qc.invalidateQueries({ queryKey: ownerOrdersQk.detail(slug, vars.orderId) });
      }
    },
  });
}

export function useReviewPayment(slug: string) {
  const { ownerOrders } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { orderId: string; approve: boolean; rejectReason?: string }) =>
      ownerOrders.reviewPayment({
        slug,
        orderId: input.orderId,
        approve: input.approve,
        rejectReason: input.rejectReason,
      }),
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ownerOrdersQk.orders(slug) });
      if (vars?.orderId) {
        qc.invalidateQueries({ queryKey: ownerOrdersQk.detail(slug, vars.orderId) });
      }
    },
  });
}

export function useRecordPayment(slug: string) {
  const { ownerOrders } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { orderId: string; method: PaymentMethod }) =>
      ownerOrders.recordPayment({ slug, orderId: input.orderId, method: input.method }),
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ownerOrdersQk.orders(slug) });
      if (vars?.orderId) {
        qc.invalidateQueries({ queryKey: ownerOrdersQk.detail(slug, vars.orderId) });
      }
    },
  });
}

export function useSaveDeliveryInfo(slug: string) {
  const { ownerOrders } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      orderId: string;
      provider?: string;
      trackingUrl?: string;
      riderName?: string;
      riderPhone?: string;
    }) =>
      ownerOrders.saveDeliveryInfo({
        slug,
        orderId: input.orderId,
        provider: input.provider,
        trackingUrl: input.trackingUrl,
        riderName: input.riderName,
        riderPhone: input.riderPhone,
      }),
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ownerOrdersQk.orders(slug) });
      if (vars?.orderId) {
        qc.invalidateQueries({ queryKey: ownerOrdersQk.detail(slug, vars.orderId) });
      }
    },
  });
}

export function useMarkSeen(slug: string) {
  const { ownerOrders } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { orderId: string }) =>
      ownerOrders.markSeen({ slug, orderId: input.orderId }),
    onMutate: async ({ orderId }) => {
      await qc.cancelQueries({ queryKey: ownerOrdersQk.open(slug) });
      const previous = qc.getQueryData<BoardOrder[]>(ownerOrdersQk.open(slug));
      if (previous) {
        qc.setQueryData<BoardOrder[]>(
          ownerOrdersQk.open(slug),
          previous.map((o) =>
            o.id === orderId ? { ...o, seenAt: o.seenAt ?? new Date().toISOString() } : o,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(ownerOrdersQk.open(slug), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerOrdersQk.orders(slug) });
    },
  });
}

export function useRescheduleOrder(slug: string) {
  const { ownerOrders } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { orderId: string; scheduledAt: string; override?: boolean }) =>
      ownerOrders.rescheduleOrder({
        slug,
        orderId: input.orderId,
        scheduledAt: input.scheduledAt,
        override: input.override,
      }),
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ownerOrdersQk.orders(slug) });
      if (vars?.orderId) {
        qc.invalidateQueries({ queryKey: ownerOrdersQk.detail(slug, vars.orderId) });
      }
    },
  });
}

export function useSaveOwnerNote(slug: string) {
  const { ownerOrders } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { orderId: string; note: string | null }) =>
      ownerOrders.saveOwnerNote({ slug, orderId: input.orderId, note: input.note }),
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ownerOrdersQk.orders(slug) });
      if (vars?.orderId) {
        qc.invalidateQueries({ queryKey: ownerOrdersQk.detail(slug, vars.orderId) });
      }
    },
  });
}

export function useSaveBookingRules(slug: string) {
  const { ownerOrders } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { rules: BookingRules }) =>
      ownerOrders.saveBookingRules({ slug, rules: input.rules }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerOrdersQk.bookingRules(slug) });
    },
  });
}
