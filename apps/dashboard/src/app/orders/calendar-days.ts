import {
  addDays,
  formatClock,
  formatManila,
  manilaDate,
  manilaParts,
  manilaToDate,
  ordersWords,
} from '@smartapp/core';

// Day words for the Calendar and Change time (T85), all in Manila time. `date` is "YYYY-MM-DD".

/** Noon on a Manila day: safe to hand to date pickers in any browser zone. */
export function dayAsDate(date: string): Date {
  return manilaToDate(date, '12:00');
}

/** Whole days from `today` to `date` (both Manila "YYYY-MM-DD"). */
export function daysFrom(today: string, date: string): number {
  return Math.round((dayAsDate(date).getTime() - dayAsDate(today).getTime()) / 86_400_000);
}

/** "Today", "Tomorrow", then "Sat 14". */
export function dayChipLabel(date: string, today: string): string {
  if (date === today) return ordersWords.when.today;
  if (date === addDays(today, 1)) return ordersWords.when.tomorrow;
  const noon = dayAsDate(date);
  return `${formatManila(noon, 'day')} ${manilaParts(noon).day}`;
}

/** "Sat 14 Nov". */
export function dayLong(date: string): string {
  return formatManila(dayAsDate(date), 'date');
}

/** "Today", "Tomorrow", "In 3 days" for an order time. */
export function whenFromToday(iso: string, today: string): string {
  const n = daysFrom(today, manilaDate(iso));
  if (n <= 0) return ordersWords.when.today;
  if (n === 1) return ordersWords.when.tomorrow;
  return ordersWords.when.inDays(n);
}

/** "Sat 14 Nov · 10:00 AM". */
export function whenLong(iso: string): string {
  return `${formatManila(iso, 'date')} · ${formatClock(iso)}`;
}

/** "Sat 14, 10:00 AM" for buttons and messages. */
export function whenShort(iso: string, today: string): string {
  return `${dayChipLabel(manilaDate(iso), today)}, ${formatClock(iso)}`;
}

/** Morning before 12, afternoon before 5 PM, then evening (Manila). */
export function periodOf(iso: string): 'morning' | 'afternoon' | 'evening' {
  const hour = manilaParts(iso).hour;
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
