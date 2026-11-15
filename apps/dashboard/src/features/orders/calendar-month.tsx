import { BanIcon, ChevronRightIcon } from 'lucide-react';
import {
  addDays,
  formatPeso,
  ordersWords,
  weekdayOf,
  type BoardOrder,
  type ShopKind,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { cn } from 'cn';
import { dayChipLabel, dayLong } from '@/app/orders/calendar-days';
import {
  closedWords,
  dayCapacity,
  dayLabel,
  daySummary,
  isClosedDay,
  isFullDay,
  monthStart,
  sumOf,
  timeGroups,
  WEEK_DAYS,
  type DayFacts,
  type ScheduleRules,
} from './calendar-facts.js';
import { CalendarOrderRow, NowLine, TimeLabel, WhatToMakeButton } from './calendar-order.js';

const W = ordersWords.bookings;

type Load = 0 | 1 | 2 | 3;

// How busy a day looks: no tint, then three steps of the brand colour (the number says the rest).
const LOAD_LOOK: Record<Load, string> = {
  0: 'bg-card aria-pressed:bg-card',
  1: 'bg-primary/15 aria-pressed:bg-primary/15',
  2: 'bg-primary/30 aria-pressed:bg-primary/30',
  3: 'bg-primary/50 aria-pressed:bg-primary/50',
};

/** A day's share of what it can take, or of the busiest day this month when the shop sets no limit. */
function loadOf(count: number, capacity: number | null, busiest: number): Load {
  if (count === 0) return 0;
  const share = capacity ? count / capacity : count / Math.max(busiest, 1);
  if (share >= 2 / 3) return 3;
  if (share >= 1 / 3) return 2;
  return 1;
}

/** The weeks on screen, Sunday first: from this week (or the month's first) to the month's last. */
function monthWeeks(date: string, today: string): (string | null)[][] {
  const first = monthStart(date, 0);
  const last = addDays(monthStart(date, 1), -1);
  const from = today > first ? today : first;
  let day = addDays(from, -weekdayOf(from));
  const weeks: (string | null)[][] = [];
  while (day <= last) {
    const week: (string | null)[] = [];
    for (let i = 0; i < WEEK_DAYS; i += 1) {
      week.push(day >= first && day <= last ? day : null);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/**
 * The month (T93, replaces T86's Event Calendar month): tiles from this week on, each with its order count
 * on a solid chip and a tint that darkens as the day fills. Tapping a day picks it and lists its orders
 * beside the month (laptop) or under it (phone), so the owner stays on Month.
 */
export function MonthView({
  kind,
  date,
  facts,
  rules,
  today,
  now,
  lastDay,
  compact,
  onPickDay,
  onOpenDay,
  onOpen,
  onWhatToMake,
}: {
  kind: ShopKind;
  // The picked day; its month is on screen.
  date: string;
  facts: DayFacts;
  rules: ScheduleRules;
  today: string;
  now: Date;
  lastDay: string;
  compact: boolean;
  onPickDay: (date: string) => void;
  onOpenDay: (date: string) => void;
  onOpen: (order: BoardOrder) => void;
  onWhatToMake: (date: string) => void;
}) {
  const weeks = monthWeeks(date, today);
  const shown = weeks.flat().filter((d): d is string => d !== null && d >= today && d <= lastDay);
  const counts = shown.map((d) => facts.byDay.get(d)?.length ?? 0);
  const busiest = Math.max(0, ...counts);
  const busiestDay = busiest > 0 ? shown[counts.indexOf(busiest)] : undefined;
  const booked = shown.flatMap((d) => facts.byDay.get(d) ?? []);

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-5 lg:items-start lg:gap-4">
      <div className="flex min-w-0 flex-col gap-3 lg:col-span-3">
        <dl data-slot="month-summary" className="grid grid-cols-3 gap-2">
          <MonthStat label={W.monthOrders} value={W.dayCount(booked.length)} />
          <MonthStat label={W.monthPesos} value={formatPeso(sumOf(booked))} />
          <MonthStat
            label={W.monthBusiest}
            value={busiestDay ? dayLabel(busiestDay) : W.monthNone}
          />
        </dl>

        <div
          data-slot="orders-calendar"
          className="flex flex-col gap-1 rounded-xl border bg-card p-2 text-card-foreground shadow-xs"
        >
          <div aria-hidden="true" className="grid grid-cols-7 gap-1">
            {W.weekdayShort.map((name) => (
              <span
                key={name}
                className="py-1 text-center text-xs font-semibold text-muted-foreground"
              >
                {compact ? name.slice(0, 1) : name}
              </span>
            ))}
          </div>
          <ToggleGroup
            value={[date]}
            onValueChange={(value) => {
              const next = value[0];
              if (typeof next === 'string') onPickDay(next);
            }}
            aria-label={W.monthDays}
            spacing={1}
            className="grid w-full grid-cols-7 items-stretch gap-1"
          >
            {weeks
              .flat()
              .map((d, i) =>
                d === null ? (
                  <span key={`gap-${i}`} aria-hidden="true" />
                ) : (
                  <DayTile
                    key={d}
                    day={d}
                    facts={facts}
                    rules={rules}
                    today={today}
                    lastDay={lastDay}
                    busiest={busiest}
                    compact={compact}
                  />
                ),
              )}
          </ToggleGroup>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="size-3 rounded-sm bg-primary/15" />
              <span aria-hidden="true" className="size-3 rounded-sm bg-primary/30" />
              <span aria-hidden="true" className="size-3 rounded-sm bg-primary/50" />
              {W.busier}
            </span>
            <span className="flex items-center gap-1">
              <BanIcon aria-hidden="true" className="size-3" />
              {W.closed}
            </span>
          </div>
        </div>
      </div>

      <MonthDayList
        kind={kind}
        day={date}
        facts={facts}
        rules={rules}
        today={today}
        now={now}
        onOpenDay={onOpenDay}
        onOpen={onOpen}
        onWhatToMake={onWhatToMake}
        className="lg:col-span-2"
      />
    </div>
  );
}

function MonthStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border bg-card px-3 py-2 shadow-xs">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-bold tabular-nums md:text-base">{value}</dd>
    </div>
  );
}

function DayTile({
  day,
  facts,
  rules,
  today,
  lastDay,
  busiest,
  compact,
}: {
  day: string;
  facts: DayFacts;
  rules: ScheduleRules;
  today: string;
  lastDay: string;
  busiest: number;
  compact: boolean;
}) {
  const list = facts.byDay.get(day) ?? [];
  const closed = isClosedDay(rules, day);
  const full = isFullDay(rules, facts, day);
  const isToday = day === today;
  const out = day < today || day > lastDay;
  const load: Load = full ? 3 : loadOf(list.length, dayCapacity(rules, day), busiest);
  const word = closed ? W.closed : full ? W.full : null;
  return (
    <ToggleGroupItem
      value={day}
      disabled={out}
      aria-label={W.dayTileAria(dayLong(day), daySummary(rules, facts, day), isToday)}
      className={cn(
        'relative flex h-auto min-h-14 min-w-0 flex-col items-stretch justify-between gap-1 overflow-hidden rounded-lg border border-border/60 p-1 text-left whitespace-normal hover:bg-muted aria-pressed:ring-2 aria-pressed:ring-primary md:min-h-20 md:p-1.5',
        closed ? 'bg-muted/60 aria-pressed:bg-muted/60' : LOAD_LOOK[load],
      )}
    >
      <span className="flex min-w-0 items-start justify-between gap-1">
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
            isToday && 'bg-primary font-bold text-primary-foreground',
            closed && !isToday && 'text-muted-foreground',
          )}
        >
          {Number(day.slice(8))}
        </span>
        {closed ? (
          <BanIcon aria-hidden="true" className="mt-1 size-3 shrink-0 text-muted-foreground" />
        ) : null}
      </span>
      {list.length > 0 ? (
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          <span className="rounded-full bg-foreground px-1.5 text-xs font-bold text-background tabular-nums">
            {list.length}
          </span>
          {compact ? null : (
            <span className="max-w-full truncate text-xs font-medium tabular-nums">
              {full ? W.full : formatPeso(sumOf(list))}
            </span>
          )}
        </span>
      ) : word && !compact ? (
        <span className="truncate text-xs text-muted-foreground">{word}</span>
      ) : null}
    </ToggleGroupItem>
  );
}

/** The picked day's orders under their times, with What to make and a way into the Day view. */
function MonthDayList({
  kind,
  day,
  facts,
  rules,
  today,
  now,
  onOpenDay,
  onOpen,
  onWhatToMake,
  className,
}: {
  kind: ShopKind;
  day: string;
  facts: DayFacts;
  rules: ScheduleRules;
  today: string;
  now: Date;
  onOpenDay: (date: string) => void;
  onOpen: (order: BoardOrder) => void;
  onWhatToMake: (date: string) => void;
  className?: string | undefined;
}) {
  const list = facts.byDay.get(day) ?? [];
  const long = dayLong(day);
  const isToday = day === today;
  const groups = timeGroups(list, rules, facts);
  return (
    <section
      data-slot="month-day-list"
      aria-label={W.orderList(long)}
      aria-live="polite"
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className={cn('truncate text-base font-bold', isToday && 'text-primary')}>
            {isToday ? `${dayChipLabel(day, today)} · ${long}` : long}
          </h3>
          <p className="text-sm text-muted-foreground tabular-nums">
            {daySummary(rules, facts, day)}
          </p>
        </div>
        {list.length > 0 ? (
          <WhatToMakeButton compact onClick={() => onWhatToMake(day)} className="shrink-0" />
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenDay(day)}
          className="h-11 shrink-0 gap-1 rounded-full font-semibold md:h-8"
        >
          {W.openDayButton}
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
      {isToday && list.length > 0 ? <NowLine now={now} /> : null}
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          {isClosedDay(rules, day) ? closedWords(rules, day) : W.noOrdersDay(dayLabel(day))}
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.minutes} className="flex flex-col gap-1.5">
            <TimeLabel label={group.label} count={group.count} full={group.full} />
            {group.orders.map((o) => (
              <CalendarOrderRow key={o.id} order={o} shopKind={kind} now={now} onOpen={onOpen} />
            ))}
          </div>
        ))
      )}
    </section>
  );
}
