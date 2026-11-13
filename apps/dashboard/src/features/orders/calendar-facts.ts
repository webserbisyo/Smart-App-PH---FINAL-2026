import {
  addDays,
  formatClock,
  formatManila,
  formatPeso,
  intervalsForDate,
  manilaDate,
  manilaParts,
  manilaToDate,
  ordersWords,
  weekdayOf,
  type BoardOrder,
  type Storefront,
} from '@smartapp/core';
import { dayAsDate, daysFrom } from '@/app/orders/calendar-days';
import type { CalendarMode } from './search.js';

// Facts the Calendar's views share (T86): which day and time each order sits on, when the shop is open,
// and which times are full. Everything is Manila time; a day is "YYYY-MM-DD".

const W = ordersWords.bookings;

/** The owner can look at, and move an order to, any day up to this far ahead (T86). */
export const RANGE_DAYS = 60;
export const WEEK_DAYS = 7;

export const PERIODS = ['morning', 'afternoon', 'evening'] as const;

export type ScheduleRules = Pick<
  Storefront,
  'hours' | 'closures' | 'slotMinutes' | 'ordersPerSlot' | 'daysAhead'
>;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Minutes from Manila midnight. */
export function clockOf(at: string | Date): number {
  const p = manilaParts(at);
  return p.hour * 60 + p.minute;
}

function minutesOn(at: Date, date: string): number {
  return manilaDate(at) === date ? clockOf(at) : 24 * 60;
}

/** A clock in minutes on a Manila day, as a moment. */
export function momentOn(date: string, minutes: number): Date {
  return manilaToDate(date, `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
}

/** The parts of a day the shop is open, in minutes from midnight. */
export function openMinutes(rules: ScheduleRules, date: string): [number, number][] {
  return intervalsForDate(rules, date).map((i) => [
    minutesOn(i.start, date),
    minutesOn(i.end, date),
  ]);
}

export function isClosedDay(rules: ScheduleRules, date: string): boolean {
  return intervalsForDate(rules, date).length === 0;
}

export function isOpenAt(rules: ScheduleRules, at: Date): boolean {
  const date = manilaDate(at);
  const min = clockOf(at);
  return openMinutes(rules, date).some(([from, to]) => min >= from && min < to);
}

/** "Closed on Mondays" for a weekly day off, "Closed on Sat 14 Nov" for a one-day closure. */
export function closedWords(rules: ScheduleRules, date: string): string {
  const weekday = weekdayOf(date);
  const weekly = !rules.hours.some((h) => h.day === weekday);
  return weekly ? (W.closedOn[weekday] ?? W.closed) : W.closedThatDay(dayLabel(date));
}

function slotStart(minutes: number, slotMinutes: number): number {
  return Math.floor(minutes / slotMinutes) * slotMinutes;
}

/** The booking time an order counts against: "2026-11-14|600". */
export function slotKey(at: string | Date, slotMinutes: number): string {
  return `${manilaDate(at)}|${slotStart(clockOf(at), slotMinutes)}`;
}

export interface DayFacts {
  byDay: Map<string, BoardOrder[]>;
  // Orders per booking time ("2026-11-14|600").
  perSlot: Map<string, BoardOrder[]>;
}

export const byTime = (a: BoardOrder, b: BoardOrder) =>
  clockOf(a.dueAt) - clockOf(b.dueAt) || a.orderNo - b.orderNo;

export function dayFacts(orders: readonly BoardOrder[], slotMinutes: number): DayFacts {
  const byDay = new Map<string, BoardOrder[]>();
  const perSlot = new Map<string, BoardOrder[]>();
  const sorted = [...orders].sort(
    (a, b) => a.dueAt.localeCompare(b.dueAt) || a.orderNo - b.orderNo,
  );
  for (const o of sorted) {
    const day = manilaDate(o.dueAt);
    byDay.set(day, [...(byDay.get(day) ?? []), o]);
    const key = slotKey(o.dueAt, slotMinutes);
    perSlot.set(key, [...(perSlot.get(key) ?? []), o]);
  }
  return { byDay, perSlot };
}

export function sumOf(orders: readonly BoardOrder[]): number {
  return orders.reduce((sum, o) => sum + o.total, 0);
}

/** "3 orders · ₱1,240". */
export function dayTotal(orders: readonly BoardOrder[]): string {
  return W.dayTotal(orders.length, formatPeso(sumOf(orders)));
}

/** "Closed", "No orders" or "3 orders · ₱1,240" under a day's name. */
export function daySummary(rules: ScheduleRules, facts: DayFacts, date: string): string {
  const list = facts.byDay.get(date) ?? [];
  if (list.length > 0) return dayTotal(list);
  return isClosedDay(rules, date) ? W.closed : W.noOrders;
}

/** Whether the time an order would land on still has room (its own place doesn't count). */
export function hasRoom(rules: ScheduleRules, facts: DayFacts, at: Date, orderId: string): boolean {
  if (rules.ordersPerSlot === null) return true;
  const taken = (facts.perSlot.get(slotKey(at, rules.slotMinutes)) ?? []).filter(
    (o) => o.id !== orderId,
  );
  return taken.length < rules.ordersPerSlot;
}

/** Every booking time of the day is taken (only for shops with a per-time limit). */
export function isFullDay(rules: ScheduleRules, facts: DayFacts, date: string): boolean {
  const limit = rules.ordersPerSlot;
  if (limit === null) return false;
  const open = openMinutes(rules, date);
  if (open.length === 0) return false;
  for (const [from, to] of open) {
    for (let m = slotStart(from, rules.slotMinutes); m < to; m += rules.slotMinutes) {
      if (m < from) continue;
      if ((facts.perSlot.get(`${date}|${m}`) ?? []).length < limit) return false;
    }
  }
  return true;
}

export interface TimeGroup {
  // Minutes from midnight, the label's time.
  minutes: number;
  label: string;
  orders: BoardOrder[];
  // "2 of 3" or "Full · 3 of 3" for shops with a per-time limit, else "2 orders" from two up.
  count: string | null;
  full: boolean;
}

/** A day's orders stacked under their time (T86): one group per clock time, earliest first. */
export function timeGroups(
  orders: readonly BoardOrder[],
  rules: ScheduleRules,
  facts: DayFacts,
): TimeGroup[] {
  const groups = new Map<number, BoardOrder[]>();
  for (const o of [...orders].sort(byTime)) {
    const minutes = clockOf(o.dueAt);
    groups.set(minutes, [...(groups.get(minutes) ?? []), o]);
  }
  const limit = rules.ordersPerSlot;
  return [...groups.entries()].map(([minutes, list]) => {
    const first = list[0];
    const taken = first
      ? (facts.perSlot.get(slotKey(first.dueAt, rules.slotMinutes)) ?? list).length
      : list.length;
    const full = limit !== null && taken >= limit;
    return {
      minutes,
      label: first ? formatClock(first.dueAt) : '',
      orders: list,
      count:
        limit !== null
          ? full
            ? W.slotFull(taken, limit)
            : W.slotOf(taken, limit)
          : list.length > 1
            ? W.dayCount(list.length)
            : null,
      full,
    };
  });
}

// ---------------------------------------------------------------- Moving around

/** The 7-day page a day falls on, counted from today: today to day 6, day 7 to day 13, and so on. */
export function weekStartOf(date: string, today: string): string {
  const n = Math.max(0, daysFrom(today, date));
  return addDays(today, Math.floor(n / WEEK_DAYS) * WEEK_DAYS);
}

export function weekDays(start: string, lastDay: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < WEEK_DAYS; i += 1) {
    const d = addDays(start, i);
    if (d > lastDay) break;
    out.push(d);
  }
  return out;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

/** The first day of the month `step` months from `date`'s month. */
export function monthStart(date: string, step: number): string {
  const [y = 0, m = 1] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + step, 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-01`;
}

export function clampDay(date: string, first: string, last: string): string {
  if (date < first) return first;
  if (date > last) return last;
  return date;
}

/** "Sat 14 Nov". */
export function dayLabel(date: string): string {
  return formatManila(dayAsDate(date), 'date');
}

/** What the top bar says is on screen: "13 – 19 Nov", "Sat 14 Nov" or "November 2026". */
export function rangeLabel(view: CalendarMode, date: string, days: readonly string[]): string {
  if (view === 'day') return dayLabel(date);
  if (view === 'month') {
    const p = manilaParts(dayAsDate(date));
    return W.monthLabel(W.monthNames[p.month - 1] ?? '', p.year);
  }
  const first = days[0] ?? date;
  const last = days.at(-1) ?? date;
  const short = (d: string) => {
    const p = manilaParts(dayAsDate(d));
    return `${p.day} ${(W.monthNames[p.month - 1] ?? '').slice(0, 3)}`;
  };
  const from =
    monthKey(first) === monthKey(last) ? String(manilaParts(dayAsDate(first)).day) : short(first);
  return W.range(from, short(last));
}
