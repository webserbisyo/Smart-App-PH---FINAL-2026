import { CalendarClockIcon, LockIcon } from 'lucide-react';
import { canReschedule, manilaDate, ordersWords, type BoardOrder } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { whenFromToday, whenLong } from '@/app/orders/calendar-days';
import { useNow } from '@/app/orders/use-now';

const W = ordersWords.when;

/**
 * The When card at the top of the order panel (T85): when the order is due, in big type, with Change
 * right beside it. Change slides the same panel to the time picker; orders that can't move say why.
 */
export function WhenCard({ order, onChange }: { order: BoardOrder; onChange: () => void }) {
  const today = manilaDate(useNow(60_000));
  const at = order.scheduledAt ?? order.dueAt;
  const movable = canReschedule(order);
  return (
    <section
      data-slot="when-card"
      className="m-4 mb-0 flex items-center gap-3 rounded-2xl bg-primary/10 p-3.5"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <CalendarClockIcon aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-wide text-primary uppercase">
          {W.label(order.type)}
        </p>
        <p className="text-lg leading-tight font-bold tabular-nums">{whenLong(at)}</p>
        <p className="text-sm text-muted-foreground">{whenFromToday(at, today)}</p>
      </div>
      {movable ? (
        <Button
          type="button"
          onClick={onChange}
          aria-label={W.changeAria}
          className="h-11 shrink-0 rounded-full px-4 font-semibold md:h-9"
        >
          {W.change}
        </Button>
      ) : (
        <LockIcon
          className="size-4 shrink-0 text-muted-foreground"
          role="img"
          aria-label={W.fixed}
        />
      )}
    </section>
  );
}
