import { CoffeeIcon } from 'lucide-react';
import { formatClock, ordersWords, type BoardOrder, type ShopKind } from '@smartapp/core';
import { DayChips, type SlotChip } from '@smartapp/ui/compositions/slot-chips';
import { dayChipLabel, dayLong } from '@/app/orders/calendar-days';
import {
  clockOf,
  dayTotal,
  isClosedDay,
  isFullDay,
  momentOn,
  openMinutes,
  timeGroups,
  type DayFacts,
  type ScheduleRules,
  type TimeGroup,
} from './calendar-facts.js';
import {
  CalendarOrderRow,
  CopyListButton,
  MakeList,
  NowLine,
  TimeLabel,
} from './calendar-order.js';

const W = ordersWords.bookings;
const PRESSED = 'aria-pressed:bg-primary aria-pressed:text-primary-foreground';
// A stretch with no orders is worth a line from this long.
const FREE_MINUTES = 60;

interface FreeGap {
  from: number;
  to: number;
}

/** Open stretches with no orders, from now on for today: "Free from 11 AM to 2 PM". */
function freeGaps(
  groups: readonly TimeGroup[],
  rules: ScheduleRules,
  date: string,
  fromMinutes: number,
): FreeGap[] {
  const gaps: FreeGap[] = [];
  for (const [open, close] of openMinutes(rules, date)) {
    let cursor = Math.max(open, fromMinutes);
    for (const g of groups) {
      if (g.minutes < open || g.minutes >= close) continue;
      if (g.minutes - cursor >= FREE_MINUTES) gaps.push({ from: cursor, to: g.minutes });
      cursor = Math.max(cursor, g.minutes + rules.slotMinutes);
    }
    if (close - cursor >= FREE_MINUTES) gaps.push({ from: cursor, to: close });
  }
  return gaps;
}

/**
 * One day (T86): the 7 days as a strip with their counts, then the day's orders under their times with
 * the free stretches between them, and What to make beside it (under it on a phone).
 */
export function DayView({
  kind,
  date,
  days,
  facts,
  rules,
  today,
  now,
  onOpen,
  onPickDay,
}: {
  kind: ShopKind;
  date: string;
  days: readonly string[];
  facts: DayFacts;
  rules: ScheduleRules;
  today: string;
  now: Date;
  onOpen: (order: BoardOrder) => void;
  onPickDay: (date: string) => void;
}) {
  const list = facts.byDay.get(date) ?? [];
  const closed = isClosedDay(rules, date);
  const long = dayLong(date);
  const isToday = date === today;
  const groups = timeGroups(list, rules, facts);
  const gaps = list.length > 0 ? freeGaps(groups, rules, date, isToday ? clockOf(now) : 0) : [];
  const clock = (minutes: number) => formatClock(momentOn(date, minutes));

  const chips: SlotChip[] = days.map((d) => {
    const count = (facts.byDay.get(d) ?? []).length;
    const word = isClosedDay(rules, d)
      ? W.closed
      : isFullDay(rules, facts, d)
        ? W.full
        : count > 0
          ? W.dayCount(count)
          : W.noOrders;
    return {
      value: d,
      label: dayChipLabel(d, today),
      detail: word,
      tone: word === W.full ? 'danger' : count > 0 ? 'primary' : 'muted',
      ariaLabel: `${dayLong(d)}, ${word}`,
    };
  });

  // Times and free stretches in one run, earliest first.
  const rows = [
    ...groups.map((group) => ({ at: group.minutes, group, gap: null })),
    ...gaps.map((gap) => ({ at: gap.from, group: null, gap })),
  ].sort((a, b) => a.at - b.at);

  return (
    <div className="flex flex-col gap-4">
      <DayChips
        label={W.dayStrip}
        value={date}
        onValueChange={onPickDay}
        pressedClassName={PRESSED}
        chips={chips}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <section
          data-slot="calendar-day"
          aria-label={W.orderList(long)}
          className="flex min-w-0 flex-col gap-3 lg:col-span-2"
        >
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold">{long}</h3>
            <p className="text-sm text-muted-foreground tabular-nums">
              {closed && list.length === 0 ? W.closed : dayTotal(list)}
            </p>
          </div>
          {isToday ? <NowLine now={now} /> : null}
          {list.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {closed ? W.closedDay(long) : W.noOrdersDay(long)}
            </p>
          ) : (
            rows.map((row) =>
              row.group ? (
                <div key={`t${row.at}`} className="flex flex-col gap-2">
                  <TimeLabel
                    label={row.group.label}
                    count={row.group.count}
                    full={row.group.full}
                    className="text-sm"
                  />
                  {row.group.orders.map((o) => (
                    <CalendarOrderRow
                      key={o.id}
                      order={o}
                      shopKind={kind}
                      now={now}
                      onOpen={onOpen}
                    />
                  ))}
                </div>
              ) : (
                <p
                  key={`f${row.at}`}
                  data-slot="calendar-free"
                  className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground tabular-nums"
                >
                  <CoffeeIcon aria-hidden="true" className="size-4 shrink-0" />
                  {W.free(clock(row.gap.from), clock(row.gap.to))}
                </p>
              ),
            )
          )}
        </section>
        {list.length > 0 ? (
          <aside
            data-slot="calendar-make"
            aria-label={W.whatToMakeTitle(long)}
            className="flex h-fit min-w-0 flex-col gap-3 rounded-2xl border bg-card p-3 text-card-foreground shadow-xs"
          >
            <div className="min-w-0">
              <h3 className="text-base font-bold">{W.whatToMake}</h3>
              <p className="text-sm text-muted-foreground">{W.whatToMakeDesc(list.length)}</p>
            </div>
            <MakeList orders={list} />
            <CopyListButton day={long} orders={list} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
