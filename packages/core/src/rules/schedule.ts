import type { ScheduleDayState } from '../schemas/enums.js';
import type {
  Schedule,
  ScheduleDay,
  ScheduleNoticeItem,
  ScheduleSlot,
} from '../schemas/schedule.js';
import type { Storefront } from '../schemas/storefront.js';
import { addDays, manilaDate, manilaToDate, weekdayOf } from './time.js';
import { openState } from './hours.js';

const MS_MINUTE = 60_000;

export interface ScheduleLineInput {
  itemId: string;
  qty: number;
}

export interface ScheduleItemInput {
  id: string;
  name: string;
  noticeDays?: number;
  dailyLimit?: number | null;
}

export interface ScheduleBookingsInput {
  slotCounts: Record<string, number>;
  itemCounts: Record<string, Record<string, number>>;
}

type StorefrontScheduleInput = Pick<
  Storefront,
  | 'hours'
  | 'closures'
  | 'pause'
  | 'prepMinutes'
  | 'takeOrdersWhileClosed'
  | 'daysAhead'
  | 'slotMinutes'
  | 'ordersPerSlot'
>;

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function ceilToStep(timeMs: number, stepMs: number): number {
  return Math.ceil(timeMs / stepMs) * stepMs;
}

/** Opening intervals for a specific Manila date (YYYY-MM-DD), respecting closures and weekday hours. */
export function intervalsForDate(
  sf: Pick<Storefront, 'hours' | 'closures'>,
  date: string,
): { start: Date; end: Date }[] {
  const closed = new Set(sf.closures.map((c) => c.date));
  if (closed.has(date)) return [];
  const weekday = weekdayOf(date);
  const raw: { start: Date; end: Date }[] = [];
  for (const range of sf.hours) {
    if (range.day === weekday) {
      raw.push({ start: manilaToDate(date, range.open), end: manilaToDate(date, range.close) });
    }
  }
  raw.sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: { start: Date; end: Date }[] = [];
  for (const interval of raw) {
    const last = merged[merged.length - 1];
    if (last && interval.start.getTime() <= last.end.getTime()) {
      if (interval.end > last.end) last.end = interval.end;
    } else {
      merged.push({ start: new Date(interval.start), end: new Date(interval.end) });
    }
  }
  return merged;
}

/**
 * Pure rule calculating available schedule days and time slots for advance orders.
 * Handles prep time, item notice requirements, daily capacity limits, and shop hours.
 */
export function scheduleDays(
  storefront: StorefrontScheduleInput,
  lines: readonly ScheduleLineInput[],
  items: readonly ScheduleItemInput[] | Record<string, ScheduleItemInput>,
  bookings: ScheduleBookingsInput,
  now: string | Date,
): Schedule {
  if (storefront.pause.paused) {
    return {
      days: [],
      earliest: null,
      noticeItem: null,
    };
  }

  const itemsMap = new Map<string, ScheduleItemInput>();
  if (Array.isArray(items)) {
    for (const it of items) itemsMap.set(it.id, it);
  } else {
    for (const [id, it] of Object.entries(items)) itemsMap.set(id, it);
  }

  const nowDate = toDate(now);
  const nowMs = nowDate.getTime();
  const today = manilaDate(now);

  // Check notice requirements from basket lines
  let maxNoticeDays = 0;
  let noticeItem: ScheduleNoticeItem | null = null;
  for (const line of lines) {
    const it = itemsMap.get(line.itemId);
    const notice = it?.noticeDays ?? 0;
    if (notice > maxNoticeDays) {
      maxNoticeDays = notice;
      noticeItem = {
        name: it?.name ?? 'Item',
        noticeDays: notice,
      };
    }
  }

  let earliestMoment: Date;
  if (maxNoticeDays > 0) {
    const earliestDate = addDays(today, maxNoticeDays);
    earliestMoment = manilaToDate(earliestDate, '00:00');
  } else {
    earliestMoment = new Date(nowMs + storefront.prepMinutes * MS_MINUTE);
  }

  // Busy: slots only after the pause, plus prep time (same as pickupSlots).
  if (storefront.pause.busyUntil) {
    const busyUntilMs = new Date(storefront.pause.busyUntil).getTime();
    const afterBusy = busyUntilMs + storefront.prepMinutes * MS_MINUTE;
    if (busyUntilMs > nowMs && afterBusy > earliestMoment.getTime()) {
      earliestMoment = new Date(afterBusy);
    }
  }

  const state = openState(storefront, now);
  // Closed and not taking orders while closed: nothing to book until it opens (same as pickupSlots, N1).
  if (state.state === 'closed' && !storefront.takeOrdersWhileClosed) {
    return { days: [], earliest: null, noticeItem };
  }
  const closedDates = new Set(storefront.closures.map((c) => c.date));
  const stepMs = (storefront.slotMinutes ?? 30) * MS_MINUTE;
  const daysAhead = storefront.daysAhead ?? 3;

  const days: ScheduleDay[] = [];

  for (let i = 0; i <= daysAhead; i++) {
    const date = addDays(today, i);

    // Closures
    if (closedDates.has(date)) {
      days.push({ date, state: 'closed', slots: [] });
      continue;
    }

    const intervals = intervalsForDate(storefront, date);

    // Closed weekday
    if (intervals.length === 0) {
      days.push({ date, state: 'closed', slots: [] });
      continue;
    }

    // Days before earliest notice requirement
    const earliestDateStr = manilaDate(earliestMoment);
    if (date < earliestDateStr) {
      days.push({ date, state: 'too_soon', slots: [] });
      continue;
    }

    // Generate slots inside intervals
    const slots: ScheduleSlot[] = [];
    for (const interval of intervals) {
      const minStart = Math.max(
        earliestMoment.getTime(),
        interval.start.getTime() + storefront.prepMinutes * MS_MINUTE,
      );
      const firstSlotMs = ceilToStep(minStart, stepMs);

      for (let s = firstSlotMs; s < interval.end.getTime(); s += stepMs) {
        const slotIso = new Date(s).toISOString();
        let slotState: 'open' | 'full' = 'open';
        let left: number | null = null;
        if (storefront.ordersPerSlot !== null && storefront.ordersPerSlot !== undefined) {
          const bookedOrders = bookings.slotCounts[slotIso] ?? 0;
          left = Math.max(0, storefront.ordersPerSlot - bookedOrders);
          if (left === 0) {
            slotState = 'full';
          }
        }
        slots.push({ at: slotIso, state: slotState, left });
      }
    }

    // Check basket daily item limits for this day
    let dailyLimitExceeded = false;
    for (const line of lines) {
      const it = itemsMap.get(line.itemId);
      if (it?.dailyLimit !== null && it?.dailyLimit !== undefined) {
        const currentBooked = bookings.itemCounts[date]?.[line.itemId] ?? 0;
        if (currentBooked + line.qty > it.dailyLimit) {
          dailyLimitExceeded = true;
          break;
        }
      }
    }

    let dayState: ScheduleDayState;
    if (slots.length === 0) {
      // If intervals existed but all slots are already past, mark closed
      dayState = 'closed';
    } else if (dailyLimitExceeded || slots.every((s) => s.state === 'full')) {
      dayState = 'full';
      // Mark all slots full if daily limit exceeded
      for (const slot of slots) {
        slot.state = 'full';
        slot.left = 0;
      }
    } else {
      dayState = 'open';
    }

    days.push({ date, state: dayState, slots });
  }

  // Earliest open slot
  let earliest: string | null = null;
  for (const day of days) {
    if (day.state === 'open') {
      const openSlot = day.slots.find((s) => s.state === 'open');
      if (openSlot) {
        earliest = openSlot.at;
        break;
      }
    }
  }

  return {
    days,
    earliest,
    noticeItem,
  };
}

/** The owner can move an order to any open day this far ahead; `daysAhead` only limits customers (T86). */
export const OWNER_MOVE_DAYS = 60;

/**
 * The days and times an owner can move an order to (T86): the next 60 days whatever the customers'
 * booking window is, also while the shop is closed, busy or paused. Closed days, full times and items
 * that need notice still count. Each day and time says how many orders are already on it.
 */
export function ownerScheduleDays(
  storefront: StorefrontScheduleInput,
  lines: readonly ScheduleLineInput[],
  items: readonly ScheduleItemInput[] | Record<string, ScheduleItemInput>,
  bookings: ScheduleBookingsInput,
  now: string | Date,
): Schedule {
  const schedule = scheduleDays(
    {
      ...storefront,
      daysAhead: OWNER_MOVE_DAYS,
      takeOrdersWhileClosed: true,
      pause: { ...storefront.pause, busyUntil: null, paused: false },
    },
    lines,
    items,
    bookings,
    now,
  );
  const perDay = new Map<string, number>();
  for (const [at, count] of Object.entries(bookings.slotCounts)) {
    const date = manilaDate(at);
    perDay.set(date, (perDay.get(date) ?? 0) + count);
  }
  return {
    ...schedule,
    days: schedule.days.map((day) => ({
      ...day,
      booked: perDay.get(day.date) ?? 0,
      slots: day.slots.map((slot) => ({ ...slot, booked: bookings.slotCounts[slot.at] ?? 0 })),
    })),
  };
}
