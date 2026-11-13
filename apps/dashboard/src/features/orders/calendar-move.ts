import { errorWords, ordersWords, type BoardOrder } from '@smartapp/core';
import { errorCodeOf, useRescheduleOrder } from '@smartapp/data';
import { notify } from '@smartapp/ui/compositions/notify';
import { whenShort } from '@/app/orders/calendar-days';
import { orderNoLabel } from '@/app/orders/order-ticket-label';

const W = ordersWords.bookings;

/**
 * Moves an order to a new time from the Calendar (T86) and offers Undo for 10 seconds. Resolves true when
 * the move went through, false when the server said no (the reason shows as a toast).
 */
export function useMoveOrder(slug: string, today: string) {
  const reschedule = useRescheduleOrder(slug);
  return (order: BoardOrder, scheduledAt: string): Promise<boolean> => {
    const before = order.scheduledAt ?? order.dueAt;
    const no = orderNoLabel(order.orderNo);
    return reschedule
      .mutateAsync({ orderId: order.id, scheduledAt })
      .then(() => {
        notify({
          title: W.moved(no, whenShort(scheduledAt, today)),
          tone: 'success',
          durationMs: 10_000,
          action: {
            label: W.undo,
            // Back to the time the shop already accepted, even if that time has filled since.
            onClick: () =>
              void reschedule
                .mutateAsync({ orderId: order.id, scheduledAt: before, override: true })
                .then(() =>
                  notify({
                    title: ordersWords.changeTime.undone(no, whenShort(before, today)),
                    tone: 'info',
                  }),
                )
                .catch((err: unknown) =>
                  notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }),
                ),
          },
        });
        return true;
      })
      .catch((err: unknown) => {
        const code = errorCodeOf(err);
        notify({
          title: code === 'slot_full' ? ordersWords.changeTime.errors.slot_full : errorWords(code),
          tone: 'error',
        });
        return false;
      });
  };
}
