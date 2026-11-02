import { useCallback } from 'react';
import type { BoardOrder, OrderStatus, OwnerOrder, ShopKind } from '@smartapp/core';
import { canAdvance, errorWords, nextActions, ordersWords } from '@smartapp/core';
import { errorCodeOf, useAdvanceOrder, useRecallOrder } from '@smartapp/data';
import { notify } from '@smartapp/ui/compositions/notify';
import { orderNoLabel } from './order-ticket.js';

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

        // T51: Recall shows for 5 s (the info toast's timeout); the server allows 10 s.
        let recalled = false;
        notify({
          title: ordersWords.recall.moved(orderNoLabel(order.orderNo), stepName),
          tone: 'info',
          action: {
            label: ordersWords.recall.action,
            onClick: () => {
              if (recalled) return;
              recalled = true;
              recallMutation.mutateAsync({ orderId: order.id }).catch((err: unknown) => {
                const code = errorCodeOf(err);
                notify({
                  title: code === 'recall_expired' ? ordersWords.recall.expired : errorWords(code),
                  tone: 'error',
                });
              });
            },
          },
        });
      } catch (err) {
        notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
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
