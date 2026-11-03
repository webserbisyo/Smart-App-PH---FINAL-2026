import * as React from 'react';
import type { BoardOrder, DayLoad } from '@smartapp/core';
import { formatManila, manilaDate, ordersWords } from '@smartapp/core';
import { BanIcon } from 'lucide-react';
import { Calendar, CalendarDayButton } from '@smartapp/ui/components/calendar';
import { Status, StatusIndicator } from '@smartapp/ui/components/status';
import { OrderTicket } from '@/app/orders/order-ticket';
import { cn } from 'cn';

type CalendarDayButtonProps = React.ComponentProps<typeof CalendarDayButton>;

export interface DayAgendaProps {
  orders: BoardOrder[];
  days: DayLoad[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSelectOrder: (order: BoardOrder) => void;
  now: Date;
  className?: string;
}

export function DayAgenda({
  orders,
  days,
  selectedDate,
  onSelectDate,
  onSelectOrder,
  now,
  className,
}: DayAgendaProps) {
  const selectedDateKey = manilaDate(selectedDate);

  // Map each Manila date key to its order count and DayLoad
  const dateMetaMap = React.useMemo(() => {
    const map = new Map<string, { count: number; dayLoad?: DayLoad; isFull: boolean }>();

    for (const d of days) {
      const full = Boolean(d.items.some((it) => it.limit !== null && it.count >= it.limit));
      map.set(d.date, { count: d.orders, dayLoad: d, isFull: full });
    }

    for (const o of orders) {
      const k = manilaDate(o.dueAt);
      const existing = map.get(k);
      if (existing) {
        if (existing.count === 0) existing.count = 1;
      } else {
        map.set(k, { count: 1, isFull: false });
      }
    }

    return map;
  }, [orders, days]);

  // Modifiers for react-day-picker
  const bookedDates = React.useMemo(() => {
    const dates: Date[] = [];
    for (const [key, meta] of dateMetaMap.entries()) {
      if (meta.count > 0) {
        const [y, m, d] = key.split('-').map(Number);
        if (y && m && d) {
          dates.push(new Date(y, m - 1, d));
        }
      }
    }
    return dates;
  }, [dateMetaMap]);

  const fullDates = React.useMemo(() => {
    const dates: Date[] = [];
    for (const [key, meta] of dateMetaMap.entries()) {
      if (meta.isFull) {
        const [y, m, d] = key.split('-').map(Number);
        if (y && m && d) {
          dates.push(new Date(y, m - 1, d));
        }
      }
    }
    return dates;
  }, [dateMetaMap]);

  // Filter orders for the selected day
  const dayOrders = React.useMemo(() => {
    return orders.filter((o) => manilaDate(o.dueAt) === selectedDateKey);
  }, [orders, selectedDateKey]);

  const currentDayMeta = dateMetaMap.get(selectedDateKey);
  const currentDayLoad = currentDayMeta?.dayLoad;

  // Custom DayButton wrapper that shows dots and counts under date number
  const CustomDayButton = React.useCallback(
    (buttonProps: CalendarDayButtonProps) => {
      const dayKey = manilaDate(buttonProps.day.date);
      const meta = dateMetaMap.get(dayKey);

      return (
        <CalendarDayButton {...buttonProps}>
          <span className="text-inherit">{buttonProps.day.date.getDate()}</span>
          {meta && meta.count > 0 && (
            <span
              className={cn(
                'flex items-center gap-0.5 leading-none font-bold',
                meta.isFull ? 'text-destructive' : 'text-primary',
              )}
            >
              <span
                className={cn('size-1 rounded-full', meta.isFull ? 'bg-destructive' : 'bg-primary')}
              />
              {meta.count > 1 ? <span>{meta.count}</span> : null}
            </span>
          )}
        </CalendarDayButton>
      );
    },
    [dateMetaMap],
  );

  return (
    <div className={cn('flex flex-col gap-6 md:flex-row md:items-start', className)}>
      {/* Month Day Picker Grid (shadcn Calendar) */}
      <div className="shrink-0 rounded-xl border border-border/80 bg-card p-3 shadow-2xs">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => {
            if (d) onSelectDate(d);
          }}
          modifiers={{
            booked: bookedDates,
            full: fullDates,
          }}
          modifiersClassNames={{
            booked: 'font-semibold',
            full: 'font-bold text-destructive',
          }}
          components={{
            DayButton: CustomDayButton,
          }}
          className="w-full"
        />
      </div>

      {/* Picked Day Tickets Section */}
      <div className="flex-1 space-y-3">
        {/* Day Header with count, load & Full status */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-foreground">
              {formatManila(selectedDate, 'date')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {ordersWords.schedule.dayLoadCount(dayOrders.length)}
              {currentDayLoad && currentDayLoad.items.length > 0 && (
                <span>
                  {' · '}
                  {currentDayLoad.items
                    .filter((it) => it.limit !== null)
                    .map((it) => ordersWords.schedule.dayLoad(it.count, it.limit ?? 0, it.name))
                    .join(', ')}
                </span>
              )}
            </p>
          </div>

          {currentDayMeta?.isFull && (
            <Status variant="error">
              <StatusIndicator />
              <BanIcon className="size-3" aria-hidden="true" />
              <span>{ordersWords.schedule.full}</span>
            </Status>
          )}
        </div>

        {/* Tickets List */}
        {dayOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <p className="text-xs text-muted-foreground">
              {ordersWords.schedule.emptyDay(formatManila(selectedDate, 'date'))}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayOrders.map((order) => (
              <OrderTicket
                key={order.id}
                order={order}
                size="card"
                now={now}
                onClick={() => onSelectOrder(order)}
                className="cursor-pointer transition-shadow hover:shadow-md"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
