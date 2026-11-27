'use client';

import * as React from 'react';
import { Calendar, CalendarDayButton } from '@smartapp/ui/components/calendar';
import { cn } from 'cn';
import type { ChipTone } from './slot-chips';

// The month half of the shared slot picker (T127, from the owner's Change time). Its own file because it
// brings react-day-picker: the storefront loads it only when the shop books more than a week ahead.

export interface SlotMonthDay {
  // "2026-12-05", a Manila business day.
  date: string;
  disabled?: boolean | undefined;
  // Under the number: "Full", "3", a state word.
  detail?: React.ReactNode | undefined;
  tone?: ChipTone | undefined;
  // Crossed out (a closed day).
  struck?: boolean | undefined;
  // Where things are now (the order's own day): a dashed ring.
  current?: boolean | undefined;
  ariaLabel?: string | undefined;
}

export interface SlotMonthProps {
  days: readonly SlotMonthDay[];
  value: string | null;
  onValueChange: (date: string) => void;
  // The shop's today ("2026-11-28", Manila), so the phone's own date never marks the wrong day.
  today?: string | undefined;
  className?: string | undefined;
}

const DETAIL_TONE: Record<ChipTone, string> = {
  default: '',
  muted: '',
  warning: 'font-semibold text-warning-text',
  danger: 'font-semibold text-destructive',
  primary: 'font-semibold text-primary',
};

/** The Date a calendar shows for a day key; noon keeps it on the same date in every time zone. */
export function slotDayDate(key: string): Date {
  const [y = 1970, m = 1, d = 1] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** The day key of a date the calendar handed back (its own year, month and day). */
export function slotDayKey(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

const DaysContext = React.createContext<ReadonlyMap<string, SlotMonthDay> | null>(null);

// The calendar's own day label is replaced by the number and the day's word or count under it.
function SlotDayButton({ className, ...props }: React.ComponentProps<typeof CalendarDayButton>) {
  const days = React.useContext(DaysContext);
  const day = days?.get(slotDayKey(props.day.date));
  return (
    <CalendarDayButton
      {...props}
      {...(day?.ariaLabel ? { 'aria-label': day.ariaLabel } : {})}
      className={cn(
        'aspect-auto h-11 gap-0 tabular-nums',
        day?.struck && 'line-through',
        day?.current && 'border-2 border-dashed border-primary',
        className,
      )}
    >
      {props.day.date.getDate()}
      {day?.detail ? (
        <span className={DETAIL_TONE[day.tone ?? 'default']}>{day.detail}</span>
      ) : null}
    </CalendarDayButton>
  );
}

const COMPONENTS = { DayButton: SlotDayButton };

/**
 * A month for picking a day over a long booking window: closed, full and too-soon days can't be picked
 * and say why under their number. Opens on the picked day's month; the window's months only.
 */
export function SlotMonth({ days, value, onValueChange, today, className }: SlotMonthProps) {
  const byDate = React.useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const first = days[0]?.date;
  const last = days.at(-1)?.date;
  const [month, setMonth] = React.useState(() => slotDayDate(value ?? first ?? '1970-01-01'));
  // A day picked outside the month on screen (a strip, a saved time) brings its month into view.
  const [seenValue, setSeenValue] = React.useState(value);
  if (value !== seenValue) {
    setSeenValue(value);
    if (value) setMonth(slotDayDate(value));
  }
  if (!first || !last) return null;
  return (
    <DaysContext value={byDate}>
      <div className={cn('rounded-2xl border bg-card p-1', className)}>
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={value ? slotDayDate(value) : undefined}
          startMonth={slotDayDate(first)}
          endMonth={slotDayDate(last)}
          onSelect={(d) => {
            if (d) onValueChange(slotDayKey(d));
          }}
          // Days outside the window can't be picked either.
          disabled={(d) => {
            const day = byDate.get(slotDayKey(d));
            return !day || day.disabled === true;
          }}
          {...(today ? { today: slotDayDate(today) } : {})}
          showOutsideDays={false}
          className="w-full bg-transparent"
          classNames={{
            root: 'w-full',
            day: 'group/day relative w-full p-0 text-center select-none',
            today: 'rounded-md bg-muted text-foreground',
          }}
          components={COMPONENTS}
        />
      </div>
    </DaysContext>
  );
}
