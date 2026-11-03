// The When picker's rules (O6), pure so they are tested without a browser: whether ASAP is offered, which
// day and time are picked, how the times group, and the lines the picker shows.
import {
  addDays,
  formatClock,
  formatManila,
  manilaDate,
  manilaParts,
  readyEstimate,
  slotLabel,
  words,
  type Schedule,
  type ScheduleDay,
  type ScheduleSlot,
  type Storefront,
} from '@smartapp/core';

export type WhenMode = 'asap' | 'schedule';
export type BookableType = 'pickup' | 'delivery';

/** At most this many day chips; a longer booking window adds "More dates". */
export const DAY_CHIPS = 14;

type AsapInput = Parameters<typeof readyEstimate>[0];

/**
 * ASAP is offered only when the shop can start now (open, not paused, not busy past its prep time) and
 * nothing in the basket needs notice. `reason` is the line under the cards when it isn't.
 */
export function asapChoice(
  sf: AsapInput,
  schedule: Pick<Schedule, 'noticeItem'> | undefined,
  now: string | Date,
): { available: boolean; reason: 'notice' | 'closed' | null } {
  if (schedule?.noticeItem) return { available: false, reason: 'notice' };
  if (readyEstimate(sf, now) === null) return { available: false, reason: 'closed' };
  return { available: true, reason: null };
}

function openSlotIn(day: ScheduleDay | undefined, at: string | null): ScheduleSlot | undefined {
  if (!day || day.state !== 'open' || !at) return undefined;
  return day.slots.find((s) => s.at === at && s.state === 'open');
}

/** The first day a customer can book, or null when none is open. */
export function firstOpenDay(schedule: Pick<Schedule, 'days'>): string | null {
  return schedule.days.find((d) => d.state === 'open')?.date ?? null;
}

export interface ResolvedPick {
  day: string | null;
  at: string | null;
  /** The saved time was taken or closed since, so another one was picked. */
  moved: boolean;
}

/**
 * Keeps a saved time while it is still open; otherwise picks the next open time (never silently keeps an
 * invalid one). With no saved time it opens on the first open day without picking a time.
 */
export function resolvePick(schedule: Pick<Schedule, 'days'>, at: string | null): ResolvedPick {
  if (at) {
    const day = schedule.days.find((d) => d.date === manilaDate(at));
    if (openSlotIn(day, at)) return { day: manilaDate(at), at, moved: false };
    const later = nextOpenSlot(schedule, at);
    if (later) return { day: manilaDate(later), at: later, moved: true };
    return { day: firstOpenDay(schedule), at: null, moved: true };
  }
  return { day: firstOpenDay(schedule), at: null, moved: false };
}

/** The first open time at or after `from`, across the days. */
export function nextOpenSlot(schedule: Pick<Schedule, 'days'>, from: string): string | null {
  const fromMs = new Date(from).getTime();
  for (const day of schedule.days) {
    if (day.state !== 'open') continue;
    const slot = day.slots.find((s) => s.state === 'open' && new Date(s.at).getTime() >= fromMs);
    if (slot) return slot.at;
  }
  for (const day of schedule.days) {
    if (day.state !== 'open') continue;
    const slot = day.slots.find((s) => s.state === 'open');
    if (slot) return slot.at;
  }
  return null;
}

export type Period = 'morning' | 'afternoon' | 'evening';
export const PERIODS = ['morning', 'afternoon', 'evening'] as const;

/** Morning before 12, Afternoon 12 to 5, Evening from 5 (Manila time). */
export function periodOf(at: string): Period {
  const { hour } = manilaParts(at);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function slotPeriods(
  slots: readonly ScheduleSlot[],
): { period: Period; slots: ScheduleSlot[] }[] {
  return PERIODS.map((period) => ({
    period,
    slots: slots.filter((s) => periodOf(s.at) === period),
  })).filter((g) => g.slots.length > 0);
}

/** "Today", "Tomorrow", then "Wed 5". */
export function dayChipLabel(date: string, now: string | Date): string {
  const today = manilaDate(now);
  if (date === today) return words.location.dayToday;
  if (date === addDays(today, 1)) return words.location.dayTomorrow;
  const [day] = formatManila(`${date}T12:00:00+08:00`, 'date').split(' ');
  const n = Number(date.slice(8, 10));
  return `${day ?? ''} ${n}`;
}

/** "Pickup Sat 8 Nov, 3 PM", the same words the receipt uses. */
export function whenSummary(type: BookableType, at: string, now: string | Date): string {
  return words.location.summary(type, slotLabel(at, now));
}

/** The line when nothing can be booked: fully booked until a date, or not taking bookings. */
export function noDaysLine(schedule: Pick<Schedule, 'days'>): string {
  const last = schedule.days.at(-1);
  if (!last) return words.location.notBooking;
  return words.location.fullyBookedUntil(
    formatManila(`${addDays(last.date, 1)}T12:00:00+08:00`, 'date'),
  );
}

/** The notice line under the day strip ("Ube Cake needs 2 days' notice. Earliest pickup: Thu 6 Nov."). */
export function noticeLine(
  schedule: Pick<Schedule, 'noticeItem' | 'earliest'>,
  type: BookableType,
): string | null {
  const item = schedule.noticeItem;
  if (!item) return null;
  const earliest = schedule.earliest ? formatManila(schedule.earliest, 'date') : null;
  return earliest ? words.location.notice(item.name, item.noticeDays, type, earliest) : null;
}

/** The ASAP card's detail: ready time for pickup, arrival for delivery. */
export function asapDetail(
  sf: Pick<Storefront, 'prepMinutes'>,
  type: BookableType,
  now: string | Date,
): string {
  if (type === 'pickup') return words.shop.readyIn(sf.prepMinutes);
  const at = new Date(new Date(now).getTime() + sf.prepMinutes * 60_000).toISOString();
  return words.location.asapDelivery(formatClock(at));
}
