import { useCallback } from 'react';
import type { BoardOrder, OrderStatus, OwnerOrder, ShopKind } from '@smartapp/core';
import { canAdvance, nextActions, ordersWords } from '@smartapp/core';
import { useAdvanceOrder, useRecallOrder } from '@smartapp/data';
import { notify } from '@smartapp/ui/compositions/notify';

export interface UseStepChangeOptions {
  slug: string;
  kind?: ShopKind;
}

export function useStepChange({ slug, kind = 'food' }: UseStepChangeOptions) {
  const advanceMutation = useAdvanceOrder(slug);
  const recallMutation = useRecallOrder(slug);

  const advance = useCallback(
    async (order: BoardOrder | OwnerOrder, targetStatus?: OrderStatus) => {
      const next = targetStatus ?? nextActions(order)[0];
      if (!next) return;

      const check = canAdvance(order, next);
      if (!check.ok) {
        if (check.code === 'not_paid') {
          notify({
            title: ordersWords.recall.notPaidError,
            tone: 'error',
          });
        } else {
          notify({
            title: ordersWords.recall.stepJumpError,
            tone: 'error',
          });
        }
        return;
      }

      try {
        await advanceMutation.mutateAsync({ orderId: order.id, toStatus: next });

        const stepName =
          next === 'preparing'
            ? ordersWords.columns.preparing(kind)
            : next === 'ready'
              ? ordersWords.columns.ready
              : next === 'out_for_delivery'
                ? ordersWords.columns.out
                : ordersWords.columns.completed;

        notify({
          title: ordersWords.recall.moved(order.orderNo, stepName),
          tone: 'info',
          action: {
            label: ordersWords.recall.action,
            onClick: async () => {
              try {
                await recallMutation.mutateAsync({ orderId: order.id });
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : '';
                if (message.includes('recall_expired')) {
                  notify({
                    title: ordersWords.recall.expired,
                    tone: 'error',
                  });
                } else {
                  notify({
                    title: ordersWords.recall.expired,
                    tone: 'error',
                  });
                }
              }
            },
          },
        });
      } catch (_err) {
        notify({
          title: 'Could not update order status. Try again.',
          tone: 'error',
        });
      }
    },
    [advanceMutation, recallMutation, kind],
  );

  return {
    advance,
    isAdvancing: advanceMutation.isPending,
    isRecalling: recallMutation.isPending,
  };
}
