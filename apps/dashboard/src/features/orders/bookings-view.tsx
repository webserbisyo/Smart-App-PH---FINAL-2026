import * as React from 'react';
import { CalendarDaysIcon, MoveIcon } from 'lucide-react';
import {
  addDays,
  canReschedule,
  errorWords,
  formatManila,
  ordersWords,
  statusStage,
  type BoardOrder,
  type OpeningRange,
} from '@smartapp/core';
import { errorCodeOf, useRescheduleOrder, useScheduledOrders } from '@smartapp/data';
import { EventCalendar } from '@smartapp/ui/components/reui/event-calendar/event-calendar';
import { EventCalendarContent } from '@smartapp/ui/components/reui/event-calendar/event-calendar-content';
import { EventCalendarNav } from '@smartapp/ui/components/reui/event-calendar/event-calendar-nav';
import type {
  CalendarEvent,
  CalendarView,
  EventCalendarProposedUpdate,
} from '@smartapp/ui/components/reui/event-calendar/event-calendar-types';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { notify } from '@smartapp/ui/compositions/notify';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { orderNoLabel } from '@/app/orders/order-card';
import { PageEmpty, PageError } from '@/app/page-state';

const W = ordersWords.bookings;
// The calendar shows the next 60 days; customers book at most 60 ahead (T48).
const RANGE_DAYS = 60;
const DESKTOP_VIEWS: CalendarView[] = ['week', 'month', 'agenda'];
const PHONE_VIEWS: CalendarView[] = ['agenda'];
const MS_MINUTE = 60_000;

const I18N = {
  labels: {
    today: W.calendar.today,
    previous: W.calendar.previous,
    next: W.calendar.next,
    noEvents: W.calendar.noEvents,
    loading: W.calendar.loading,
    allDay: W.calendar.allDay,
    more: W.calendar.more,
    dropNotAllowed: W.calendar.dropNotAllowed,
  },
  viewNames: { month: W.calendar.month, week: W.calendar.week, agenda: W.calendar.agenda },
};

// One colour per stage (T56), the same tokens as the board.
const STAGE_COLOR = {
  new: 'var(--stage-new)',
  preparing: 'var(--stage-preparing)',
  ready: 'var(--stage-ready)',
  out: 'var(--stage-out)',
  done: 'var(--stage-done)',
} as const;

function toEvents(orders: readonly BoardOrder[], slotMinutes: number): CalendarEvent<BoardOrder>[] {
  return orders.map((o) => {
    const start = new Date(o.dueAt);
    const stage = statusStage(o.status) ?? 'done';
    return {
      id: o.id,
      title: `${orderNoLabel(o.orderNo)} · ${o.customerName}`,
      start,
      end: new Date(start.getTime() + slotMinutes * MS_MINUTE),
      color: STAGE_COLOR[stage],
      draggable: canReschedule(o),
      data: o,
    };
  });
}

/** The first and last opening hour of the week, so the week grid starts and ends with the shop. */
function hoursOf(hours: readonly OpeningRange[]): { start: number; end: number } {
  if (hours.length === 0) return { start: 6, end: 22 };
  const toHour = (clock: string) => Number(clock.slice(0, 2));
  const start = Math.min(...hours.map((h) => toHour(h.open)));
  const end = Math.max(...hours.map((h) => Math.min(24, toHour(h.close) + 1)));
  return { start: Math.max(0, start - 1), end: Math.max(end, start + 4) };
}

/**
 * Bookings (T83, amends T54): orders for later days on the installed ReUI Event Calendar. Week and Month on
 * a laptop, a List (agenda) on phones. Drag a New or Preparing pickup or delivery order to change its time;
 * Undo puts it back. Tapping an order opens the same order panel as the board.
 */
export default function BookingsView({
  slug,
  today,
  now,
  hours,
  slotMinutes,
  online,
  matches,
  onOpen,
}: {
  slug: string;
  today: string;
  now: Date;
  hours: readonly OpeningRange[];
  slotMinutes: number;
  online: boolean;
  matches: (o: BoardOrder) => boolean;
  onOpen: (order: BoardOrder) => void;
}) {
  const isPhone = useFormFactor() === 'phone';
  const query = useScheduledOrders(slug, today, addDays(today, RANGE_DAYS));
  const reschedule = useRescheduleOrder(slug);
  const orders = React.useMemo(
    () => (query.data?.orders ?? []).filter((o) => o.dueAt >= now.toISOString() && matches(o)),
    [query.data, now, matches],
  );
  const [events, setEvents] = React.useState(() => toEvents(orders, slotMinutes));
  // New orders from the server replace what a drag left on screen (a failed move snaps back).
  const [source, setSource] = React.useState(orders);
  if (source !== orders) {
    setSource(orders);
    setEvents(toEvents(orders, slotMinutes));
  }
  const [view, setView] = React.useState<CalendarView>(isPhone ? 'agenda' : 'week');
  const shown = isPhone ? 'agenda' : view;
  const day = hoursOf(hours);

  const move = (orderId: string, orderNo: number, scheduledAt: string, before: string) =>
    reschedule
      .mutateAsync({ orderId, scheduledAt })
      .then(() =>
        notify({
          title: W.moved(orderNoLabel(orderNo), formatManila(scheduledAt, 'datetime')),
          tone: 'success',
          durationMs: 10_000,
          action: {
            label: W.undo,
            // Back to the time the shop already accepted, even if that slot has filled since.
            onClick: () =>
              void reschedule
                .mutateAsync({ orderId, scheduledAt: before, override: true })
                .catch((err: unknown) =>
                  notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }),
                ),
          },
        }),
      )
      .catch((err: unknown) =>
        notify({
          title:
            errorCodeOf(err) === 'slot_full'
              ? ordersWords.changeTime.errors.slot_full
              : errorWords(errorCodeOf(err)),
          tone: 'error',
        }),
      );

  const canDrop = (update: EventCalendarProposedUpdate<BoardOrder>) =>
    online && !update.allDay && update.start.getTime() >= now.getTime();

  const onUpdate = (update: EventCalendarProposedUpdate<BoardOrder>) => {
    const order = update.event.data;
    if (!order || !canDrop(update)) return false;
    void move(order.id, order.orderNo, update.start.toISOString(), order.dueAt);
    return true;
  };

  if (query.isPending) return <Skeleton className="h-130 w-full rounded-xl" />;
  if (query.isError) {
    return (
      <PageError
        title={ordersWords.states.errorBoard}
        message={errorWords(errorCodeOf(query.error))}
        retryLabel={ordersWords.states.tryAgain}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (orders.length === 0) {
    return (
      <PageEmpty
        variant="box"
        icon={<CalendarDaysIcon className="size-8 text-muted-foreground" />}
        title={W.empty}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <MoveIcon aria-hidden="true" className="size-4 shrink-0" />
        {isPhone ? W.hintPhone : W.hint}
      </p>
      <div className="h-160 rounded-xl border bg-card p-2 text-card-foreground shadow-xs md:h-176">
        <EventCalendar<BoardOrder>
          events={events}
          onEventsChange={(next) => setEvents([...next])}
          view={shown}
          defaultView={shown}
          onViewChange={setView}
          views={isPhone ? PHONE_VIEWS : DESKTOP_VIEWS}
          timeZone="Asia/Manila"
          dayStartHour={day.start}
          dayEndHour={day.end}
          slotDuration={slotMinutes}
          snapDuration={slotMinutes}
          agendaDayCount={14}
          i18n={I18N}
          interactions={{ drag: online && !isPhone, resize: false, selectSlot: false }}
          canDropEvent={canDrop}
          onEventUpdate={onUpdate}
          onEventClick={(occurrence) => {
            const order = occurrence.event.data;
            if (order) onOpen(order);
          }}
        >
          <EventCalendarNav />
          <EventCalendarContent />
        </EventCalendar>
      </div>
    </div>
  );
}
