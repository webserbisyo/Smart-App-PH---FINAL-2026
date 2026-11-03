import * as React from 'react';
import type { BoardOrder, DayLoad } from '@smartapp/core';
import { formatClock, formatManila, manilaDate, ordersWords, statusTone } from '@smartapp/core';
import { EventCalendar } from '@smartapp/ui/components/reui/event-calendar/event-calendar';
import { EventCalendarNav } from '@smartapp/ui/components/reui/event-calendar/event-calendar-nav';
import { EventCalendarContent } from '@smartapp/ui/components/reui/event-calendar/event-calendar-content';
import type {
  CalendarEvent,
  CalendarView,
  EventCalendarProposedUpdate,
} from '@smartapp/ui/components/reui/event-calendar/event-calendar-types';
import { useMediaQuery } from '@/app/use-media-query';
import { ORDER_TYPE_ICON } from '@/app/orders/order-type-icons';
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
    const map = new Map<
      string,
      { orders: number; isFull: boolean; progress: number | null; summaryText: string }
    >();

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

      const progress = totalLimit > 0 ? totalCount / totalLimit : null;

      map.set(d.date, {
        orders: d.orders,
        isFull,
        progress,
        summaryText: `${d.orders} orders`,
      });
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

      const TypeIcon = ORDER_TYPE_ICON[order.type];

      list.push({
        id: order.id,
        title: `#${String(order.orderNo).padStart(3, '0')} · ${order.customerName}`,
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
        renderEvent={({ event, occurrence }) => {
          const order = event.data?.order;
          if (!order) return <span>{event.title}</span>;
          const TypeIcon = ORDER_TYPE_ICON[order.type];

          return (
            <div className="flex w-full items-center gap-1 overflow-hidden px-1 py-0.5 text-xs leading-tight font-semibold">
              <TypeIcon className="size-3 shrink-0" aria-hidden="true" />
              <span className="shrink-0 tabular-nums">
                #{String(order.orderNo).padStart(3, '0')}
              </span>
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
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium text-muted-foreground">
                      {meta.orders} {meta.orders === 1 ? 'ord' : 'ords'}
                    </span>
                    {meta.isFull && (
                      <span className="font-bold tracking-wider text-destructive uppercase">
                        {ordersWords.schedule.full}
                      </span>
                    )}
                  </div>
                  {meta.progress !== null && (
                    <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full transition-all',
                          meta.isFull ? 'bg-destructive' : 'bg-primary',
                        )}
                        style={{ width: `${Math.min(100, Math.round(meta.progress * 100))}%` }}
                      />
                    </div>
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
          const dayDate = day.getDate();

          return (
            <div className="flex flex-col items-center justify-center py-1">
              <span className="text-[11px] font-medium text-muted-foreground">{dayName}</span>
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs font-bold',
                  isToday && 'bg-primary text-primary-foreground',
                )}
              >
                {dayDate}
              </span>
              {meta && meta.orders > 0 && (
                <div className="mt-0.5 flex items-center gap-1 text-[10px]">
                  <span className="text-muted-foreground">{meta.orders}</span>
                  {meta.isFull && (
                    <span className="font-bold text-destructive">{ordersWords.schedule.full}</span>
                  )}
                </div>
              )}
            </div>
          );
        }}
      >
        <EventCalendarNav />
        <EventCalendarContent />
      </EventCalendar>
    </div>
  );
}
