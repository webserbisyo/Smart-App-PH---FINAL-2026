import * as React from 'react';
import type { BoardOrder, DayLoad } from '@smartapp/core';
import { BanIcon } from 'lucide-react';
import { canReschedule, formatManila, manilaDate, ordersWords, statusTone } from '@smartapp/core';
import { Progress } from '@smartapp/ui/components/progress';
import { EventCalendar } from '@smartapp/ui/components/reui/event-calendar/event-calendar';
import { EventCalendarContent } from '@smartapp/ui/components/reui/event-calendar/event-calendar-content';
import type {
  CalendarEvent,
  CalendarView,
  EventCalendarProposedUpdate,
} from '@smartapp/ui/components/reui/event-calendar/event-calendar-types';
import { useMediaQuery } from '@/app/use-media-query';
import { ORDER_TYPE_ICON } from '@/app/orders/order-type-icons';
import { orderNoLabel } from '@/app/orders/order-ticket';
import { cn } from 'cn';

export interface ScheduledCalendarProps {
  orders: BoardOrder[];
  days: DayLoad[];
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  date: Date;
  onDateChange: (date: Date) => void;
  showDone: boolean;
  onSelectOrder: (order: BoardOrder) => void;
  onDropOrderToReschedule: (order: BoardOrder, proposedStart: Date) => void;
  className?: string;
}

const AVAILABLE_VIEWS: CalendarView[] = ['month', 'week', 'agenda'];

export function ScheduledCalendar({
  orders,
  days,
  view,
  onViewChange,
  date,
  onDateChange,
  showDone,
  onSelectOrder,
  onDropOrderToReschedule,
  className,
}: ScheduledCalendarProps) {
  // Turn drag on ONLY for a fine pointer (mouse / trackpad) per requirement 4
  const isFinePointer = useMediaQuery('(pointer: fine)');

  // Build DayLoad map by Manila date
  const dayLoadMap = React.useMemo(() => {
    const map = new Map<string, { orders: number; isFull: boolean; progress: number | null }>();

    for (const d of days) {
      let isFull = false;
      let totalCount = 0;
      let totalLimit = 0;

      for (const it of d.items) {
        if (it.limit !== null) {
          totalCount += it.count;
          totalLimit += it.limit;
          if (it.count >= it.limit) isFull = true;
        }
      }

      const progress =
        totalLimit > 0 ? Math.min(100, Math.round((totalCount / totalLimit) * 100)) : null;

      map.set(d.date, { orders: d.orders, isFull, progress });
    }

    return map;
  }, [days]);

  // Convert orders to CalendarEvents
  const events = React.useMemo<CalendarEvent<{ order: BoardOrder }>[]>(() => {
    const list: CalendarEvent<{ order: BoardOrder }>[] = [];

    for (const order of orders) {
      // Cancelled and expired orders never show
      if (order.status === 'cancelled' || order.status === 'expired') continue;

      // Completed orders only show if showDone is true
      if (order.status === 'completed' && !showDone) continue;

      const due = new Date(order.dueAt);
      const end = new Date(due.getTime() + 30 * 60_000);

      // Status tone color mapping
      const tone = statusTone(order.status).tone;
      const colorVar =
        order.status === 'completed'
          ? 'var(--muted-foreground)'
          : tone === 'info'
            ? 'var(--info)'
            : tone === 'warning'
              ? 'var(--warning)'
              : tone === 'success'
                ? 'var(--success)'
                : 'var(--primary)';

      list.push({
        id: order.id,
        title: `${orderNoLabel(order.orderNo)} · ${order.customerName}`,
        // Only orders that can still change time can be dragged (T52).
        draggable: canReschedule(order),
        start: due,
        end,
        color: colorVar,
        data: { order },
      });
    }

    return list;
  }, [orders, showDone]);

  // Drag-and-drop: Dropping NEVER directly saves; opens ChangeTimeDialog and returns false to revert gesture
  const handleEventUpdate = React.useCallback(
    (update: EventCalendarProposedUpdate<{ order: BoardOrder }>) => {
      const order = update.event.data?.order;
      if (!order) return false;

      // Intercept drop proposal and pass to caller
      onDropOrderToReschedule(order, update.start);

      // Return false to revert the visual event on the calendar until confirmed
      return false;
    },
    [onDropOrderToReschedule],
  );

  return (
    <div
      className={cn(
        'flex h-160 flex-col rounded-xl border border-border/80 bg-card p-3 shadow-2xs',
        className,
      )}
    >
      <EventCalendar
        events={events}
        view={view}
        onViewChange={onViewChange}
        date={date}
        onDateChange={onDateChange}
        views={AVAILABLE_VIEWS}
        timeZone="Asia/Manila"
        interactions={{
          drag: isFinePointer,
          resize: false,
          selectSlot: false,
        }}
        onEventClick={(occ) => {
          const order = occ.event.data?.order;
          if (order) onSelectOrder(order);
        }}
        onEventUpdate={handleEventUpdate}
        renderEvent={({ occurrence }) => {
          const order = occurrence.event.data?.order;
          if (!order) return <span>{occurrence.event.title}</span>;
          const TypeIcon = ORDER_TYPE_ICON[order.type];

          return (
            <div className="flex w-full items-center gap-1 overflow-hidden px-1 py-0.5 text-xs leading-tight font-semibold">
              <TypeIcon className="size-3 shrink-0" aria-hidden="true" />
              <span className="shrink-0 tabular-nums">{orderNoLabel(order.orderNo)}</span>
              <span className="truncate font-normal">{order.customerName}</span>
            </div>
          );
        }}
        renderMonthCell={({ day, defaultContent }) => {
          const dayKey = manilaDate(day);
          const meta = dayLoadMap.get(dayKey);

          return (
            <div className="flex h-full flex-col justify-between">
              <div>{defaultContent}</div>
              {meta && meta.orders > 0 && (
                <div className="mt-auto px-1.5 pb-1">
                  <div className="flex items-center justify-between gap-1 text-xs">
                    <span className="truncate font-medium text-muted-foreground">
                      {ordersWords.schedule.dayLoadCount(meta.orders)}
                    </span>
                    {meta.isFull && <FullMark />}
                  </div>
                  {meta.progress !== null && (
                    <Progress
                      value={meta.progress}
                      aria-label={ordersWords.schedule.dayLoadCount(meta.orders)}
                      className="mt-0.5"
                    />
                  )}
                </div>
              )}
            </div>
          );
        }}
        renderDayHeader={({ day, isToday }) => {
          const dayKey = manilaDate(day);
          const meta = dayLoadMap.get(dayKey);
          const dayName = formatManila(day, 'day');
          const dayDate = Number(manilaDate(day).slice(8));

          return (
            <div className="flex flex-col items-center justify-center py-1">
              <span className="text-xs font-medium text-muted-foreground">{dayName}</span>
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs font-bold',
                  isToday && 'bg-primary text-primary-foreground',
                )}
              >
                {dayDate}
              </span>
              {meta && meta.orders > 0 && (
                <div className="mt-0.5 flex w-full flex-col items-center gap-0.5 px-1 text-xs">
                  <span className="text-muted-foreground">
                    {ordersWords.schedule.dayLoadCount(meta.orders)}
                  </span>
                  {meta.isFull && <FullMark />}
                  {meta.progress !== null && (
                    <Progress
                      value={meta.progress}
                      aria-label={ordersWords.schedule.dayLoadCount(meta.orders)}
                      className="w-full"
                    />
                  )}
                </div>
              )}
            </div>
          );
        }}
      >
        <EventCalendarContent />
      </EventCalendar>
    </div>
  );
}

/** A day at its limit: icon + word + colour. */
function FullMark() {
  return (
    <span className="inline-flex items-center gap-0.5 font-bold text-destructive">
      <BanIcon className="size-3" aria-hidden="true" />
      {ordersWords.schedule.full}
    </span>
  );
}
