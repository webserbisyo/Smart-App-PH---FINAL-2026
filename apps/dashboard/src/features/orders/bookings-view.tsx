import * as React from 'react';
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  Columns3Icon,
  ListIcon,
  MoveIcon,
} from 'lucide-react';
import {
  addDays,
  canReschedule,
  errorWords,
  formatPeso,
  intervalsForDate,
  manilaDate,
  manilaParts,
  ordersWords,
  type BoardOrder,
  type ShopKind,
  type Storefront,
} from '@smartapp/core';
import { errorCodeOf, useRescheduleOrder, useScheduledOrders } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Hitbox } from '@smartapp/ui/components/hitbox';
import { EventCalendar } from '@smartapp/ui/components/reui/event-calendar/event-calendar';
import { EventCalendarContent } from '@smartapp/ui/components/reui/event-calendar/event-calendar-content';
import { EventCalendarNav } from '@smartapp/ui/components/reui/event-calendar/event-calendar-nav';
import {
  EventCalendarDaysView,
  EventCalendarDayView,
} from '@smartapp/ui/components/reui/event-calendar/event-calendar-time-grid';
import type {
  CalendarEvent,
  CalendarView,
  EventCalendarProposedUpdate,
} from '@smartapp/ui/components/reui/event-calendar/event-calendar-types';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { DayChips, type SlotChip } from '@smartapp/ui/compositions/slot-chips';
import { notify } from '@smartapp/ui/compositions/notify';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';
import { dayAsDate, dayChipLabel, dayLong, periodOf, whenShort } from '@/app/orders/calendar-days';
import { CustomerLegend, customerKind, customerLabel } from '@/app/orders/customer-kind';
import { orderNoLabel } from '@/app/orders/order-card';
import { PageEmpty, PageError } from '@/app/page-state';
import {
  CalendarEventCard,
  CalendarOrderRow,
  CustomerStack,
  WhatToMakeButton,
  WhatToMakeDialog,
} from './calendar-order.js';

const W = ordersWords.bookings;
// The calendar shows the next 60 days; customers book at most 60 ahead (T48).
const RANGE_DAYS = 60;
const MS_MINUTE = 60_000;
// One booking time is this tall on the grid, room for the name, the time and the item photos (T85).
const SLOT_REM = 5.25;
const PRESSED = 'aria-pressed:bg-primary aria-pressed:text-primary-foreground';
const PERIODS = ['morning', 'afternoon', 'evening'] as const;
const PHONE_MODES = ['list', 'days', 'month'] as const;
type PhoneMode = (typeof PHONE_MODES)[number];
const PHONE_MODE_ICON = { list: ListIcon, days: Columns3Icon, month: CalendarDaysIcon } as const;

export type ScheduleRules = Pick<
  Storefront,
  'hours' | 'closures' | 'slotMinutes' | 'ordersPerSlot' | 'daysAhead'
>;

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
  viewNames: {
    month: W.calendar.month,
    week: W.calendar.week,
    day: W.calendar.day,
    days: W.calendar.days,
    agenda: W.calendar.agenda,
  },
};

// Our card is the event's surface: the calendar's own tint and padding step aside.
const EVENT_CLASS =
  'rounded-md bg-transparent p-0 inset-ring-0 hover:bg-transparent data-selected:bg-transparent dark:bg-transparent dark:hover:bg-transparent';

// ---------------------------------------------------------------- Day facts

function minutesOf(at: Date, date: string): number {
  if (manilaDate(at) !== date) return 24 * 60;
  const p = manilaParts(at);
  return p.hour * 60 + p.minute;
}

/** The parts of a day the shop is open, in minutes from midnight (Manila). */
function openMinutes(rules: ScheduleRules, date: string): [number, number][] {
  return intervalsForDate(rules, date).map((i) => [
    minutesOf(i.start, date),
    minutesOf(i.end, date),
  ]);
}

function slotKey(iso: string, slotMinutes: number): string {
  const date = manilaDate(iso);
  const p = manilaParts(iso);
  const start = Math.floor((p.hour * 60 + p.minute) / slotMinutes) * slotMinutes;
  return `${date}|${start}`;
}

interface DayFacts {
  byDay: Map<string, BoardOrder[]>;
  // Orders per booking time ("2026-11-14|600").
  perSlot: Map<string, BoardOrder[]>;
}

function dayFacts(orders: readonly BoardOrder[], slotMinutes: number): DayFacts {
  const byDay = new Map<string, BoardOrder[]>();
  const perSlot = new Map<string, BoardOrder[]>();
  const sorted = [...orders].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  for (const o of sorted) {
    const day = manilaDate(o.dueAt);
    byDay.set(day, [...(byDay.get(day) ?? []), o]);
    const key = slotKey(o.dueAt, slotMinutes);
    perSlot.set(key, [...(perSlot.get(key) ?? []), o]);
  }
  return { byDay, perSlot };
}

function dayTotal(orders: readonly BoardOrder[]): string {
  return W.dayTotal(orders.length, formatPeso(orders.reduce((sum, o) => sum + o.total, 0)));
}

function toEvents(orders: readonly BoardOrder[], slotMinutes: number): CalendarEvent<BoardOrder>[] {
  return orders.map((o) => {
    const start = new Date(o.dueAt);
    return {
      id: o.id,
      title: `${orderNoLabel(o.orderNo)}, ${o.customerName}, ${customerLabel(customerKind(o))}`,
      start,
      end: new Date(start.getTime() + slotMinutes * MS_MINUTE),
      draggable: canReschedule(o),
      data: o,
    };
  });
}

/** The first and last opening hour of the week, so the grid starts and ends with the shop. */
function hoursOf(hours: ScheduleRules['hours']): { start: number; end: number } {
  if (hours.length === 0) return { start: 6, end: 22 };
  const toHour = (clock: string) => Number(clock.slice(0, 2));
  const start = Math.min(...hours.map((h) => toHour(h.open)));
  const end = Math.max(...hours.map((h) => Math.min(24, toHour(h.close) + 1)));
  return { start: Math.max(0, start - 1), end: Math.max(end, start + 4) };
}

// ---------------------------------------------------------------- The grid

interface GridProps {
  slug: string;
  orders: readonly BoardOrder[];
  facts: DayFacts;
  rules: ScheduleRules;
  today: string;
  now: Date;
  online: boolean;
  drag: boolean;
  views: CalendarView[];
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  date: Date;
  onDateChange: (date: Date) => void;
  dayCount: number;
  dayCountPresets: number[];
  showSwitcher: boolean;
  // A month day was tapped.
  onPickDay: (date: string) => void;
  pickedDay?: string | undefined;
  compactMonth?: boolean | undefined;
  onOpen: (order: BoardOrder) => void;
  onWhatToMake: (date: string) => void;
  className?: string | undefined;
}

/**
 * Orders on the installed ReUI Event Calendar (T85): each order is a card coloured by who ordered, closed
 * hours are shaded, full times are marked, and drag (laptop, tablet long-press) moves an order to an open
 * time that still has room. Undo puts it back.
 */
function OrdersGrid({
  slug,
  orders,
  facts,
  rules,
  today,
  now,
  online,
  drag,
  views,
  view,
  onViewChange,
  date,
  onDateChange,
  dayCount,
  dayCountPresets,
  showSwitcher,
  onPickDay,
  pickedDay,
  compactMonth = false,
  onOpen,
  onWhatToMake,
  className,
}: GridProps) {
  const reschedule = useRescheduleOrder(slug);
  const slotMinutes = rules.slotMinutes;
  const [events, setEvents] = React.useState(() => toEvents(orders, slotMinutes));
  // New orders from the server replace what a drag left on screen (a failed move snaps back).
  const [source, setSource] = React.useState(orders);
  if (source !== orders) {
    setSource(orders);
    setEvents(toEvents(orders, slotMinutes));
  }
  const bounds = hoursOf(rules.hours);

  const move = (order: BoardOrder, scheduledAt: string) => {
    const before = order.dueAt;
    return reschedule
      .mutateAsync({ orderId: order.id, scheduledAt })
      .then(() =>
        notify({
          title: W.moved(orderNoLabel(order.orderNo), whenShort(scheduledAt, today)),
          tone: 'success',
          durationMs: 10_000,
          action: {
            label: W.undo,
            // Back to the time the shop already accepted, even if that time has filled since.
            onClick: () =>
              void reschedule
                .mutateAsync({ orderId: order.id, scheduledAt: before, override: true })
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
  };

  const isOpenAt = (start: Date) => {
    const day = manilaDate(start);
    const min = minutesOf(start, day);
    return openMinutes(rules, day).some(([from, to]) => min >= from && min < to);
  };

  const hasRoom = (start: Date, orderId: string) => {
    if (rules.ordersPerSlot === null) return true;
    const taken = (facts.perSlot.get(slotKey(start.toISOString(), slotMinutes)) ?? []).filter(
      (o) => o.id !== orderId,
    );
    return taken.length < rules.ordersPerSlot;
  };

  const canDrop = (update: EventCalendarProposedUpdate<BoardOrder>) => {
    const order = update.event.data;
    return (
      online &&
      order !== undefined &&
      !update.allDay &&
      update.start.getTime() >= now.getTime() &&
      isOpenAt(update.start) &&
      hasRoom(update.start, order.id)
    );
  };

  const onUpdate = (update: EventCalendarProposedUpdate<BoardOrder>) => {
    const order = update.event.data;
    if (!order || !canDrop(update)) return false;
    void move(order, update.start.toISOString());
    return true;
  };

  // Stable render functions: the calendar skips a card's subtree while another one is dragged.
  const renderEvent = React.useCallback(
    ({
      occurrence,
      isDragging,
    }: {
      occurrence: { event: CalendarEvent<BoardOrder> };
      isDragging: boolean;
    }) => {
      const order = occurrence.event.data;
      return order ? <CalendarEventCard order={order} dragging={isDragging} /> : null;
    },
    [],
  );

  const renderDayHeader = ({
    day,
    view: shownView,
    isToday,
  }: {
    day: Date;
    view: CalendarView;
    isToday: boolean;
  }) => {
    // The month's weekday row keeps the calendar's own "Sun", "Mon".
    if (shownView === 'month') return null;
    const d = manilaDate(day);
    const list = facts.byDay.get(d) ?? [];
    const closed = intervalsForDate(rules, d).length === 0;
    return (
      <span className="flex min-w-0 items-center gap-1">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn('truncate font-semibold', isToday && 'text-primary')}>
            {dayChipLabel(d, today)}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground tabular-nums">
            {closed ? W.closed : list.length > 0 ? dayTotal(list) : W.dayCount(0)}
          </span>
        </span>
        {list.length > 0 ? (
          <Hitbox
            size="sm"
            radius="full"
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${W.whatToMake}, ${dayLong(d)}`}
                onClick={() => onWhatToMake(d)}
                className="shrink-0 rounded-full"
              >
                <ClipboardListIcon aria-hidden="true" />
              </Button>
            }
          />
        ) : null}
      </span>
    );
  };

  // Closed hours shaded, full times washed red, both behind the cards.
  const renderDayColumnBackground = ({
    day,
    boundsStartMin,
    boundsEndMin,
  }: {
    day: Date;
    boundsStartMin: number;
    boundsEndMin: number;
  }) => {
    const d = manilaDate(day);
    const open = openMinutes(rules, d);
    const closed: [number, number][] = [];
    let cursor = boundsStartMin;
    for (const [from, to] of open) {
      if (from > cursor) closed.push([cursor, Math.min(from, boundsEndMin)]);
      cursor = Math.max(cursor, to);
    }
    if (cursor < boundsEndMin) closed.push([cursor, boundsEndMin]);
    const full: number[] = [];
    if (rules.ordersPerSlot !== null) {
      for (const [key, list] of facts.perSlot) {
        const [slotDay, start] = key.split('|');
        if (slotDay === d && list.length >= rules.ordersPerSlot) full.push(Number(start));
      }
    }
    const top = (from: number) => (from - boundsStartMin) / 60;
    return (
      <>
        {closed
          .filter(([from, to]) => to > from)
          .map(([from, to]) => (
            <div
              key={`c${from}`}
              data-slot="calendar-closed"
              className="absolute inset-x-0 ec-band bg-muted"
              style={cssVars({ '--band-top': top(from), '--band-len': (to - from) / 60 })}
            />
          ))}
        {full.map((start) => (
          <div
            key={`f${start}`}
            data-slot="calendar-full"
            className="absolute inset-x-0 ec-band border-y border-destructive/30 bg-destructive/10"
            style={cssVars({ '--band-top': top(start), '--band-len': slotMinutes / 60 })}
          />
        ))}
      </>
    );
  };

  const renderMonthCell = ({ day, isToday }: { day: Date; isToday: boolean }) => {
    const d = manilaDate(day);
    const list = facts.byDay.get(d) ?? [];
    const closed = intervalsForDate(rules, d).length === 0;
    return (
      <span className="flex size-full min-w-0 flex-col gap-1 p-1.5">
        <span className="flex min-w-0 items-center justify-between gap-1">
          <span
            className={cn(
              'text-sm font-semibold tabular-nums',
              isToday && 'text-primary',
              closed && 'text-muted-foreground',
            )}
          >
            {manilaParts(day).day}
          </span>
          {closed && !compactMonth ? (
            <span className="truncate text-xs text-muted-foreground">{W.closed}</span>
          ) : null}
        </span>
        {list.length === 0 ? null : compactMonth ? (
          <span className="mt-auto self-start rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground tabular-nums">
            {list.length}
          </span>
        ) : (
          <span className="mt-auto flex min-w-0 flex-col gap-1">
            <CustomerStack orders={list} />
            <span className="truncate text-xs text-muted-foreground tabular-nums">
              {dayTotal(list)}
            </span>
          </span>
        )}
      </span>
    );
  };

  const dayClassName = (day: Date) => {
    const d = manilaDate(day);
    if (pickedDay === d) return 'bg-primary/10';
    if (intervalsForDate(rules, d).length === 0) return 'bg-muted/60';
    return undefined;
  };

  // The time grids are taller than the calendar's default so a card shows its photos; no all-day row.
  const hourHeight = `${(SLOT_REM * 60) / slotMinutes}rem`;
  const components = React.useMemo(
    () => ({
      days: () => (
        <EventCalendarDaysView
          showAllDay={false}
          style={cssVars({ '--ec-hour-height': hourHeight })}
        />
      ),
      day: () => (
        <EventCalendarDayView
          showAllDay={false}
          style={cssVars({ '--ec-hour-height': hourHeight })}
        />
      ),
    }),
    [hourHeight],
  );

  return (
    <div
      data-slot="orders-calendar"
      className={cn(
        'flex flex-col rounded-xl border bg-card p-2 text-card-foreground shadow-xs',
        className,
      )}
    >
      <EventCalendar<BoardOrder>
        className="flex-1"
        events={events}
        onEventsChange={(next) => setEvents([...next])}
        view={view}
        defaultView={view}
        onViewChange={onViewChange}
        views={views}
        date={date}
        onDateChange={onDateChange}
        dayCount={dayCount}
        dayCountPresets={dayCountPresets}
        timeZone="Asia/Manila"
        dayStartHour={bounds.start}
        dayEndHour={bounds.end}
        scrollToHour={bounds.start}
        slotDuration={slotMinutes}
        snapDuration={slotMinutes}
        interval={slotMinutes}
        nowIndicator
        i18n={I18N}
        interactions={{ drag: drag && online, resize: false, selectSlot: false }}
        canDropEvent={canDrop}
        onEventUpdate={onUpdate}
        onEventClick={(occurrence) => {
          const order = occurrence.event.data;
          if (order) onOpen(order);
        }}
        onSlotClick={(slot) => {
          if (slot.view === 'month') onPickDay(manilaDate(slot.date));
        }}
        components={components}
        classNames={{ event: EVENT_CLASS }}
        renderEvent={renderEvent}
        renderDayHeader={renderDayHeader}
        renderDayColumnBackground={renderDayColumnBackground}
        renderMonthCell={renderMonthCell}
        dayClassName={dayClassName}
      >
        <EventCalendarNav showViewSwitcher={showSwitcher} />
        <EventCalendarContent />
      </EventCalendar>
    </div>
  );
}

// ---------------------------------------------------------------- One day's list (phone)

function DayList({
  date,
  facts,
  rules,
  kind,
  now,
  onOpen,
  onWhatToMake,
}: {
  date: string;
  facts: DayFacts;
  rules: ScheduleRules;
  kind: ShopKind;
  now: Date;
  onOpen: (order: BoardOrder) => void;
  onWhatToMake: (date: string) => void;
}) {
  const list = facts.byDay.get(date) ?? [];
  const closed = intervalsForDate(rules, date).length === 0;
  const day = dayLong(date);
  return (
    <section data-slot="calendar-day" aria-label={day} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold">{day}</h3>
          <p className="text-sm text-muted-foreground tabular-nums">
            {closed && list.length === 0 ? W.closed : dayTotal(list)}
          </p>
        </div>
        {list.length > 0 ? <WhatToMakeButton onClick={() => onWhatToMake(date)} /> : null}
      </div>
      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {closed ? W.closedDay(day) : W.noOrdersDay(day)}
        </p>
      ) : (
        PERIODS.map((period) => {
          const inPeriod = list.filter((o) => periodOf(o.dueAt) === period);
          if (inPeriod.length === 0) return null;
          return (
            <div key={period} className="flex flex-col gap-2">
              <h4 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                {W[period]}
              </h4>
              {inPeriod.map((o) => (
                <CalendarOrderRow key={o.id} order={o} shopKind={kind} now={now} onOpen={onOpen} />
              ))}
            </div>
          );
        })
      )}
    </section>
  );
}

// ---------------------------------------------------------------- The view

/**
 * The Calendar (T85, amends T83): orders for later days. Laptop: a week from today, a day, or a month;
 * drag to move. Tablet: 3 days, press and hold to drag. Phone: a day list first, then 3 days or a month
 * to look ahead; no drag there, tap an order and use Change in its panel. The colour key sits on top.
 */
export default function BookingsView({
  slug,
  kind,
  today,
  now,
  rules,
  online,
  matches,
  onOpen,
}: {
  slug: string;
  kind: ShopKind;
  today: string;
  now: Date;
  rules: ScheduleRules;
  online: boolean;
  matches: (o: BoardOrder) => boolean;
  onOpen: (order: BoardOrder) => void;
}) {
  const formFactor = useFormFactor();
  const query = useScheduledOrders(slug, today, addDays(today, RANGE_DAYS));
  const orders = React.useMemo(
    () => (query.data?.orders ?? []).filter((o) => o.dueAt >= now.toISOString() && matches(o)),
    [query.data, now, matches],
  );
  const facts = React.useMemo(
    () => dayFacts(orders, rules.slotMinutes),
    [orders, rules.slotMinutes],
  );
  const [whatDay, setWhatDay] = React.useState<string | null>(null);

  if (query.isPending) return <Skeleton className="h-160 w-full rounded-xl md:h-176" />;
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

  const shared = {
    slug,
    orders,
    facts,
    rules,
    today,
    now,
    online,
    onOpen,
    onWhatToMake: setWhatDay,
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MoveIcon aria-hidden="true" className="size-4 shrink-0" />
          {formFactor === 'phone' ? W.hintPhone : formFactor === 'tablet' ? W.hintTablet : W.hint}
        </p>
        <CustomerLegend />
      </div>
      {formFactor === 'phone' ? (
        <PhoneCalendar {...shared} kind={kind} />
      ) : (
        <WideCalendar {...shared} tablet={formFactor === 'tablet'} />
      )}
      <WhatToMakeDialog
        date={whatDay}
        orders={whatDay ? (facts.byDay.get(whatDay) ?? []) : []}
        onOpenChange={(open) => {
          if (!open) setWhatDay(null);
        }}
      />
    </div>
  );
}

type SharedProps = Pick<
  GridProps,
  'slug' | 'orders' | 'facts' | 'rules' | 'today' | 'now' | 'online' | 'onOpen' | 'onWhatToMake'
>;

function WideCalendar({ tablet, ...shared }: SharedProps & { tablet: boolean }) {
  const span = tablet ? 3 : 7;
  const [view, setView] = React.useState<CalendarView>('days');
  const [date, setDate] = React.useState(() => dayAsDate(shared.today));
  const [dayCount, setDayCount] = React.useState(span);
  return (
    <OrdersGrid
      {...shared}
      drag
      views={['days', 'day', 'month']}
      view={view}
      onViewChange={(next) => {
        setView(next);
        if (next === 'days') setDayCount(span);
      }}
      date={date}
      onDateChange={setDate}
      dayCount={dayCount}
      dayCountPresets={[span]}
      showSwitcher
      // A month day opens that day.
      onPickDay={(d) => {
        setDate(dayAsDate(d));
        setView('day');
      }}
      className="h-160 md:h-176"
    />
  );
}

function PhoneCalendar({ kind, ...shared }: SharedProps & { kind: ShopKind }) {
  const { facts, rules, today } = shared;
  const [mode, setMode] = React.useState<PhoneMode>('list');
  // Every day customers can book, and on to the last order if the owner moved one further.
  const last = [...facts.byDay.keys()].sort().at(-1) ?? today;
  const days = React.useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < RANGE_DAYS; i += 1) {
      const d = addDays(today, i);
      if (i >= rules.daysAhead && d > last) break;
      out.push(d);
    }
    return out;
  }, [today, last, rules.daysAhead]);
  const [picked, setPicked] = React.useState(
    () => days.find((d) => (facts.byDay.get(d) ?? []).length > 0) ?? today,
  );
  const [date, setDate] = React.useState(() => dayAsDate(today));

  const chips: SlotChip[] = days.map((d) => {
    const count = (facts.byDay.get(d) ?? []).length;
    const closed = intervalsForDate(rules, d).length === 0;
    return {
      value: d,
      label: dayChipLabel(d, today),
      detail: count > 0 ? W.dayCount(count) : closed ? W.closed : undefined,
      tone: count > 0 ? 'primary' : 'muted',
      ariaLabel: `${dayLong(d)}, ${count > 0 ? W.dayCount(count) : closed ? W.closed : W.dayCount(0)}`,
    };
  });

  const list = (
    <DayList
      date={picked}
      facts={facts}
      rules={rules}
      kind={kind}
      now={shared.now}
      onOpen={shared.onOpen}
      onWhatToMake={shared.onWhatToMake}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        value={[mode]}
        onValueChange={(value) => {
          const next = PHONE_MODES.find((m) => m === value[0]);
          if (next) setMode(next);
        }}
        aria-label={W.viewLabel}
        spacing={1}
        className="grid w-full grid-cols-3 rounded-xl border border-border/60 bg-muted/60 p-1"
      >
        {PHONE_MODES.map((m) => {
          const Icon = PHONE_MODE_ICON[m];
          return (
            <ToggleGroupItem
              key={m}
              value={m}
              className="h-10 gap-1.5 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs"
            >
              <Icon aria-hidden="true" />
              {W.phoneViews[m]}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>

      {mode === 'list' ? (
        <>
          <DayChips
            label={W.dayStrip}
            value={picked}
            onValueChange={setPicked}
            pressedClassName={PRESSED}
            chips={chips}
          />
          {list}
        </>
      ) : mode === 'days' ? (
        <OrdersGrid
          key="days"
          {...shared}
          drag={false}
          views={['days']}
          view="days"
          onViewChange={() => undefined}
          date={date}
          onDateChange={setDate}
          dayCount={3}
          dayCountPresets={[3]}
          showSwitcher={false}
          onPickDay={setPicked}
          className="h-160"
        />
      ) : (
        <>
          <OrdersGrid
            key="month"
            {...shared}
            drag={false}
            views={['month']}
            view="month"
            onViewChange={() => undefined}
            date={date}
            onDateChange={setDate}
            dayCount={3}
            dayCountPresets={[3]}
            showSwitcher={false}
            onPickDay={setPicked}
            pickedDay={picked}
            compactMonth
            className="h-120"
          />
          {list}
        </>
      )}
    </div>
  );
}
