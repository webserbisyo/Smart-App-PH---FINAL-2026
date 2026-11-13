import { formatPeso, manilaDate, manilaParts, ordersWords, type BoardOrder } from '@smartapp/core';
import { EventCalendar } from '@smartapp/ui/components/reui/event-calendar/event-calendar';
import { EventCalendarContent } from '@smartapp/ui/components/reui/event-calendar/event-calendar-content';
import type { CalendarEvent } from '@smartapp/ui/components/reui/event-calendar/event-calendar-types';
import { cn } from 'cn';
import { dayAsDate } from '@/app/orders/calendar-days';
import { isClosedDay, sumOf, type DayFacts, type ScheduleRules } from './calendar-facts.js';

const W = ordersWords.bookings;

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

// The month only counts orders: each day's cell is ours, so the calendar gets no events to draw.
const NO_EVENTS: CalendarEvent<BoardOrder>[] = [];
const VIEWS = ['month' as const];

/**
 * The month (T86) on the installed ReUI Event Calendar: each day says how many orders and how much, closed
 * days are shaded, and a tap opens that day. A phone shows the count only. The top bar above moves it.
 */
export function MonthView({
  date,
  facts,
  rules,
  today,
  lastDay,
  compact,
  onPickDay,
}: {
  // Any day of the month on screen.
  date: string;
  facts: DayFacts;
  rules: ScheduleRules;
  today: string;
  lastDay: string;
  compact: boolean;
  onPickDay: (date: string) => void;
}) {
  const inRange = (d: string) => d >= today && d <= lastDay;

  const renderMonthCell = ({ day, isToday }: { day: Date; isToday: boolean }) => {
    const d = manilaDate(day);
    const list = facts.byDay.get(d) ?? [];
    const closed = isClosedDay(rules, d);
    return (
      <span className="flex size-full min-w-0 flex-col gap-1 p-1.5">
        <span className="flex min-w-0 items-center justify-between gap-1">
          <span
            className={cn(
              'text-sm font-semibold tabular-nums',
              isToday && 'text-primary',
              (closed || !inRange(d)) && 'text-muted-foreground',
            )}
          >
            {manilaParts(day).day}
          </span>
          {closed && !compact ? (
            <span className="truncate text-xs text-muted-foreground">{W.closed}</span>
          ) : null}
        </span>
        {list.length === 0 ? null : compact ? (
          <span className="mt-auto self-start rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground tabular-nums">
            {list.length}
          </span>
        ) : (
          <span className="mt-auto flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold tabular-nums">
              {W.dayCount(list.length)}
            </span>
            <span className="truncate text-xs text-muted-foreground tabular-nums">
              {formatPeso(sumOf(list))}
            </span>
          </span>
        )}
      </span>
    );
  };

  return (
    <div
      data-slot="orders-calendar"
      className={cn(
        'flex flex-col rounded-xl border bg-card p-2 text-card-foreground shadow-xs',
        compact ? 'h-104' : 'h-144',
      )}
    >
      <EventCalendar<BoardOrder>
        className="flex-1"
        events={NO_EVENTS}
        view="month"
        defaultView="month"
        views={VIEWS}
        date={dayAsDate(date)}
        onDateChange={() => undefined}
        timeZone="Asia/Manila"
        i18n={I18N}
        interactions={{ drag: false, resize: false, selectSlot: false }}
        onSlotClick={(slot) => {
          const d = manilaDate(slot.date);
          if (slot.view === 'month' && inRange(d)) onPickDay(d);
        }}
        renderDayHeader={() => null}
        renderMonthCell={renderMonthCell}
        dayClassName={(day) => {
          const d = manilaDate(day);
          if (!inRange(d)) return 'opacity-50';
          return isClosedDay(rules, d) ? 'bg-muted/60' : undefined;
        }}
      >
        <EventCalendarContent />
      </EventCalendar>
    </div>
  );
}
