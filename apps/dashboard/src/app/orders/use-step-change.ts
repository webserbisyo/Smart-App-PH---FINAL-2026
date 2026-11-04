import { useCallback } from 'react';
import type { BoardOrder, OrderStatus, ShopKind } from '@smartapp/core';
import { canAdvance, errorWords, ordersWords } from '@smartapp/core';
import { errorCodeOf, useAdvanceOrder, useRecallOrder, useRecordPayment } from '@smartapp/data';
import { notify } from '@smartapp/ui/compositions/notify';
import { orderNoLabel } from './order-ticket-label.js';
import { statusStageLabel } from './stage.js';

type StepOrder = Pick<
  BoardOrder,
  'id' | 'orderNo' | 'status' | 'type' | 'paymentStatus' | 'paymentMethod'
>;

export interface UseStepChangeOptions {
  slug: string;
  kind: ShopKind;
}

/** The words for a refused move, from its code (never from a message). */
export function refusedMoveWords(code: 'invalid_transition' | 'not_paid', to: OrderStatus): string {
  if (code === 'not_paid') {
    return to === 'completed' ? ordersWords.drop.notPaidComplete : ordersWords.drop.notPaid;
  }
  return ordersWords.drop.backwards;
}

/**
 * Moves an order forward (one step or a skip, decision T55) and shows the toast with Recall (T51: 5 s on
 * screen, the server allows 10 s). Finishing an order has no Recall: a stamp may already be on the card.
 */
export function useStepChange({ slug, kind }: UseStepChangeOptions) {
  const advanceMutation = useAdvanceOrder(slug);
  const recallMutation = useRecallOrder(slug);
  const recordPayment = useRecordPayment(slug);

  const advance = useCallback(
    async (order: StepOrder, to: OrderStatus): Promise<void> => {
      const check = canAdvance(order, to);
      if (!check.ok) {
        notify({ title: refusedMoveWords(check.code, to), tone: 'error' });
        return;
      }
      try {
        await advanceMutation.mutateAsync({ orderId: order.id, toStatus: to });
      } catch (err) {
        notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
        throw err;
      }
      const title = ordersWords.recall.moved(
        orderNoLabel(order.orderNo),
        statusStageLabel(to, kind),
      );
      if (to === 'completed') {
        notify({ title, tone: 'success' });
        return;
      }
      let recalled = false;
      notify({
        title,
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
    },
    [advanceMutation, recallMutation, kind],
  );

  // Cash and COD are paid on handover: the card's "Paid · Done" records the payment, then finishes.
  const payAndComplete = useCallback(
    async (order: StepOrder): Promise<void> => {
      try {
        await recordPayment.mutateAsync({ orderId: order.id, method: order.paymentMethod });
      } catch (err) {
        notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
        throw err;
      }
      await advance({ ...order, paymentStatus: 'paid' }, 'completed');
    },
    [recordPayment, advance],
  );

  return { advance, payAndComplete, isAdvancing: advanceMutation.isPending };
}
