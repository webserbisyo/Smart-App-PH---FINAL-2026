'use client';

import {
  formatClock,
  manilaParts,
  manilaToDate,
  words,
  type Closure,
  type OpeningRange,
  type Weekday,
} from '@smartapp/core';
import { useNow } from '@smartapp/data';
import { Table, TableBody, TableCell, TableRow } from '@smartapp/ui/components/table';

export interface HoursTableProps {
  hours: readonly OpeningRange[];
  closures?: readonly Closure[] | undefined;
  now?: string | Date | undefined;
}

const WEEKDAY_NAMES: Record<Weekday, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  0: 'Sunday',
};

// Monday to Sunday standard display order
const DISPLAY_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export function HoursTable({ hours, closures = [], now: nowProp }: HoursTableProps) {
  const currentNow = useNow();
  const now = nowProp ?? currentNow;
  const currentWeekday = now ? manilaParts(now).weekday : -1;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold tracking-tight">{words.storefrontShell.home.hours}</h2>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableBody>
            {DISPLAY_WEEKDAYS.map((day) => {
              const dayRanges = hours.filter((h) => h.day === day);
              const isToday = day === currentWeekday;
              const hoursText =
                dayRanges.length > 0
                  ? dayRanges
                      .map(
                        (r) =>
                          `${formatClock(manilaToDate('2026-01-01', r.open))} – ${formatClock(manilaToDate('2026-01-01', r.close))}`,
                      )
                      .join(', ')
                  : words.storefrontShell.home.closedToday;

              return (
                <TableRow
                  key={day}
                  className={`*:border-border hover:bg-transparent [&>:not(:last-child)]:border-r ${
                    isToday ? 'bg-muted/50 font-semibold' : ''
                  }`}
                >
                  <TableCell className="w-32 bg-muted/30 py-2.5 text-sm font-medium">
                    <span className="flex items-center gap-1.5">
                      {WEEKDAY_NAMES[day]}
                      {isToday ? (
                        <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                          {words.storefrontShell.home.todayHours}
                        </span>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 text-sm text-foreground">{hoursText}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {closures.length > 0 ? (
        <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">{words.storefrontShell.home.closures}:</p>
          {closures.map((c) => {
            const [, m, d] = c.date.split('-');
            const months = [
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
            ];
            const monthName = months[Number(m) - 1] ?? m;
            const formattedDate = `${monthName} ${Number(d)}`;

            return (
              <p key={c.date} className="text-foreground/90">
                • {words.storefrontShell.home.closedOn(formattedDate, c.reason)}
              </p>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
