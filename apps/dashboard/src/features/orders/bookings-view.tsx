import * as React from 'react';
import {
  CalendarDaysIcon,
  CalendarRangeIcon,
  CalendarSearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoveIcon,
  SquareIcon,
} from 'lucide-react';
import { addDays, errorWords, ordersWords, type BoardOrder, type ShopKind } from '@smartapp/core';
import { errorCodeOf, useScheduledOrders } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Calendar } from '@smartapp/ui/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@smartapp/ui/components/popover';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { cn } from 'cn';
import { dateFromKey, keyFromDate } from '@/app/day-key';
import { CustomerLegend } from '@/app/orders/customer-kind';
import { PageEmpty, PageError } from '@/app/page-state';
import { DayView } from './calendar-day.js';
import {
  RANGE_DAYS,
  WEEK_DAYS,
  clampDay,
  dayFacts,
  monthKey,
  monthStart,
  rangeLabel,
  weekDays,
  weekStartOf,
  type ScheduleRules,
} from './calendar-facts.js';
import { MonthView } from './calendar-month.js';
import { WhatToMakeDialog } from './calendar-order.js';
import { WeekBoard, WeekList } from './calendar-week.js';
import { CALENDAR_VIEWS, type CalendarMode } from './search.js';

const W = ordersWords.bookings;
const VIEW_ICON = { week: CalendarRangeIcon, day: SquareIcon, month: CalendarDaysIcon } as const;

export interface CalendarPlace {
  view?: CalendarMode | undefined;
  date?: string | undefined;
}

/**
 * The Calendar (T86, replaces T85's hour grid): orders for the next 60 days as a week board, one day or a
 * month, with the same switch on every screen. A laptop opens on Week and drags a card to another day; a
 * phone opens on Day, shows Week as one list, and changes times from the order's panel.
 */
export default function BookingsView({
  slug,
  kind,
  today,
  now,
  rules,
  online,
  matches,
  view: viewParam,
  date: dateParam,
  onNavigate,
  onOpen,
  onChangeTime,
}: {
  slug: string;
  kind: ShopKind;
  today: string;
  now: Date;
  rules: ScheduleRules;
  online: boolean;
  matches: (o: BoardOrder) => boolean;
  // Where the calendar is, from the address; undefined opens on this screen's own view, on today.
  view: CalendarMode | undefined;
  date: string | undefined;
  // `replace` for small steps (arrows, the strip), so Back returns to the view before.
  onNavigate: (place: CalendarPlace, options?: { replace?: boolean }) => void;
  onOpen: (order: BoardOrder) => void;
  onChangeTime: (order: BoardOrder, date: string) => void;
}) {
  const formFactor = useFormFactor();
  const isPhone = formFactor === 'phone';
  const lastDay = addDays(today, RANGE_DAYS);
  const query = useScheduledOrders(slug, today, lastDay);
  const orders = React.useMemo(
    () => (query.data?.orders ?? []).filter((o) => o.dueAt >= now.toISOString() && matches(o)),
    [query.data, now, matches],
  );
  const facts = React.useMemo(
    () => dayFacts(orders, rules.slotMinutes),
    [orders, rules.slotMinutes],
  );
  const [whatDay, setWhatDay] = React.useState<string | null>(null);

  const view: CalendarMode = viewParam ?? (isPhone ? 'day' : 'week');
  const date = clampDay(dateParam ?? today, today, lastDay);
  const start = weekStartOf(date, today);
  // The React Compiler keeps one list per page of days, so a dropped card stays put until the server answers.
  const days = weekDays(start, lastDay);

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

  const step = (dir: -1 | 1): string => {
    if (view === 'day') return addDays(date, dir);
    if (view === 'month') return dir === 1 ? monthStart(date, 1) : monthStart(date, -1);
    return addDays(start, dir * WEEK_DAYS);
  };
  const canEarlier =
    view === 'day'
      ? date > today
      : view === 'month'
        ? monthKey(date) > monthKey(today)
        : start > today;
  const canLater =
    view === 'day'
      ? date < lastDay
      : view === 'month'
        ? monthKey(date) < monthKey(lastDay)
        : addDays(start, WEEK_DAYS) <= lastDay;
  const go = (next: string) =>
    onNavigate({ date: clampDay(next, today, lastDay) }, { replace: true });
  const openDay = (d: string) => onNavigate({ view: 'day', date: d });

  return (
    <div className="flex flex-col gap-3">
      <CalendarBar
        view={view}
        label={rangeLabel(view, date, days)}
        date={date}
        today={today}
        lastDay={lastDay}
        isPhone={isPhone}
        canEarlier={canEarlier}
        canLater={canLater}
        onViewChange={(next) => onNavigate({ view: next })}
        onEarlier={() => go(step(-1))}
        onLater={() => go(step(1))}
        onToday={() => go(today)}
        onPickDate={go}
      />

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MoveIcon aria-hidden="true" className="size-4 shrink-0" />
          {view === 'month'
            ? W.hintMonth
            : isPhone
              ? W.hintPhone
              : view === 'day'
                ? W.hintDay
                : formFactor === 'tablet'
                  ? W.hintTablet
                  : W.hint}
        </p>
        <CustomerLegend />
      </div>

      {view === 'month' ? (
        <MonthView
          date={date}
          facts={facts}
          rules={rules}
          today={today}
          lastDay={lastDay}
          compact={isPhone}
          onPickDay={openDay}
        />
      ) : view === 'day' ? (
        <DayView
          kind={kind}
          date={date}
          days={days}
          facts={facts}
          rules={rules}
          today={today}
          now={now}
          onOpen={onOpen}
          onPickDay={go}
        />
      ) : isPhone ? (
        <WeekList
          kind={kind}
          days={days}
          facts={facts}
          rules={rules}
          today={today}
          now={now}
          onOpen={onOpen}
          onOpenDay={openDay}
          onWhatToMake={setWhatDay}
        />
      ) : (
        <WeekBoard
          slug={slug}
          kind={kind}
          days={days}
          facts={facts}
          rules={rules}
          today={today}
          now={now}
          online={online}
          picked={dateParam && dateParam !== start ? date : undefined}
          onOpen={onOpen}
          onOpenDay={openDay}
          onChangeTime={onChangeTime}
          onWhatToMake={setWhatDay}
        />
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

// ---------------------------------------------------------------- The top bar

/**
 * One bar above every view (T86): Today, arrows that stop at today and at day 60, what is on screen,
 * Go to date, and the Week / Day / Month switch in plain sight.
 */
function CalendarBar({
  view,
  label,
  date,
  today,
  lastDay,
  isPhone,
  canEarlier,
  canLater,
  onViewChange,
  onEarlier,
  onLater,
  onToday,
  onPickDate,
}: {
  view: CalendarMode;
  label: string;
  date: string;
  today: string;
  lastDay: string;
  isPhone: boolean;
  canEarlier: boolean;
  canLater: boolean;
  onViewChange: (view: CalendarMode) => void;
  onEarlier: () => void;
  onLater: () => void;
  onToday: () => void;
  onPickDate: (date: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  return (
    <div
      data-slot="calendar-bar"
      className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3"
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          onClick={onToday}
          disabled={date === today}
          className="h-11 shrink-0 px-3 font-semibold md:h-9"
        >
          {W.calendar.today}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={W.earlier[view]}
          disabled={!canEarlier}
          onClick={onEarlier}
          className="size-11 shrink-0 md:size-9"
        >
          <ChevronLeftIcon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={W.later[view]}
          disabled={!canLater}
          onClick={onLater}
          className="size-11 shrink-0 md:size-9"
        >
          <ChevronRightIcon aria-hidden="true" />
        </Button>
        <h2
          aria-live="polite"
          className="min-w-0 flex-1 truncate px-1 text-base font-bold tabular-nums md:text-lg"
        >
          {label}
        </h2>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                aria-label={isPhone ? W.goToDate : undefined}
                className={cn(
                  'h-11 shrink-0 gap-1.5 font-semibold md:h-9',
                  isPhone ? 'w-11 px-0' : 'px-3',
                )}
              >
                <CalendarSearchIcon aria-hidden="true" />
                {isPhone ? null : W.goToDate}
              </Button>
            }
          />
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateFromKey(date)}
              defaultMonth={dateFromKey(date)}
              startMonth={dateFromKey(today)}
              endMonth={dateFromKey(lastDay)}
              disabled={{ before: dateFromKey(today), after: dateFromKey(lastDay) }}
              onSelect={(d) => {
                if (!d) return;
                onPickDate(keyFromDate(d));
                setPickerOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <ToggleGroup
        value={[view]}
        onValueChange={(value) => {
          const next = CALENDAR_VIEWS.find((v) => v === value[0]);
          if (next) onViewChange(next);
        }}
        aria-label={W.viewLabel}
        spacing={1}
        className="grid w-full shrink-0 grid-cols-3 rounded-xl border border-border/60 bg-muted/60 p-1 md:w-auto"
      >
        {CALENDAR_VIEWS.map((v) => {
          const Icon = VIEW_ICON[v];
          return (
            <ToggleGroupItem
              key={v}
              value={v}
              className="h-10 gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs md:h-7"
            >
              <Icon aria-hidden="true" />
              {W.views[v]}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
