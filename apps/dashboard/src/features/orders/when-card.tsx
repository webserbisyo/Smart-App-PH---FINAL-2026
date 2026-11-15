import { CalendarClockIcon, CircleAlertIcon, LockIcon } from 'lucide-react';
import {
  canReschedule,
  formatManila,
  isStillOpenPast,
  manilaDate,
  ordersWords,
  type BoardOrder,
} from '@smartapp/core';
import { cn } from 'cn';
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
  // From an earlier day and never finished (T95): red, and it says what to do.
  const stale = isStillOpenPast(order, today);
  return (
    <section
      data-slot="when-card"
      className={cn(
        'm-4 mb-0 flex items-center gap-3 rounded-2xl p-3.5',
        stale ? 'bg-destructive/10' : 'bg-primary/10',
      )}
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl',
          stale
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-primary text-primary-foreground',
        )}
      >
        {stale ? (
          <CircleAlertIcon aria-hidden="true" className="size-5" />
        ) : (
          <CalendarClockIcon aria-hidden="true" className="size-5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-xs font-bold tracking-wide uppercase',
            stale ? 'text-destructive' : 'text-primary',
          )}
        >
          {W.label(order.type)}
        </p>
        <p className="text-lg leading-tight font-bold tabular-nums">{whenLong(at)}</p>
        <p className={cn('text-sm', stale ? 'text-destructive' : 'text-muted-foreground')}>
          {stale ? W.stillOpen(formatManila(at, 'date')) : whenFromToday(at, today)}
        </p>
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
