'use client';

import { manilaDate, manilaToDate, words, type ScheduleDay } from '@smartapp/core';
import { Calendar } from '@smartapp/ui/components/calendar';

export interface MoreDatesCalendarProps {
  days: readonly ScheduleDay[];
  selected: string | null;
  onPick: (date: string) => void;
}

/**
 * "More dates" (O6): the shadcn Calendar over the shop's whole booking window, closed, full and
 * too-soon days disabled. Loaded with next/dynamic only when opened, so react-day-picker and date-fns
 * stay out of every page's first JavaScript.
 */
export default function MoreDatesCalendar({ days, selected, onPick }: MoreDatesCalendarProps) {
  const states = new Map(days.map((d) => [d.date, d.state]));
  const first = days[0]?.date;
  const last = days.at(-1)?.date;
  const selectedDate = selected ? manilaToDate(selected, '12:00') : undefined;
  const fromDate = first ? manilaToDate(first, '12:00') : undefined;
  const toDate = last ? manilaToDate(last, '12:00') : undefined;
  const month = selectedDate ?? fromDate;

  return (
    <div className="flex flex-col gap-2">
      <Calendar
        mode="single"
        selected={selectedDate}
        {...(month ? { defaultMonth: month } : {})}
        {...(fromDate ? { startMonth: fromDate } : {})}
        {...(toDate ? { endMonth: toDate } : {})}
        onSelect={(d) => {
          if (d) onPick(manilaDate(d));
        }}
        disabled={(d) => states.get(manilaDate(d)) !== 'open'}
      />
      <p className="px-3 pb-2 text-xs text-muted-foreground">{words.location.moreDatesLegend}</p>
    </div>
  );
}
