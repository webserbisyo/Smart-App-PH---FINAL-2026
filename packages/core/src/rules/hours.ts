// Open state, next opening and pickup slots, all in Manila time. Pure functions of (storefront, now).
import type { Variant } from '../schemas/catalog.js';
import type { Availability } from '../schemas/enums.js';
import type { OpenState } from '../schemas/order.js';
import type { Storefront } from '../schemas/storefront.js';
import { words } from '../words.js';
import { addDays, formatClock, formatManila, manilaDate, manilaToDate, weekdayOf } from './time.js';

export const SLOT_STEP_MINUTES = 15;
const LOOKAHEAD_DAYS = 8;
const MS_MINUTE = 60_000;

type HoursInput = Pick<
  Storefront,
  'hours' | 'closures' | 'pause' | 'prepMinutes' | 'takeOrdersWhileClosed'
>;

interface Interval {
  start: Date;
  end: Date;
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Opening intervals from the Manila day of `now` for the next 8 days, closures skipped, touching ranges merged. */
export function openingIntervals(sf: HoursInput, now: string | Date): Interval[] {
  const closed = new Set(sf.closures.map((c) => c.date));
  const today = manilaDate(now);
  const raw: Interval[] = [];
  for (let i = -1; i < LOOKAHEAD_DAYS; i += 1) {
    const date = addDays(today, i);
    if (closed.has(date)) continue;
    const weekday = weekdayOf(date);
    for (const range of sf.hours) {
      if (range.day !== weekday) continue;
      raw.push({ start: manilaToDate(date, range.open), end: manilaToDate(date, range.close) });
    }
  }
  raw.sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Interval[] = [];
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

export function nextOpening(sf: HoursInput, now: string | Date): string | null {
  const t = toDate(now).getTime();
  const next = openingIntervals(sf, now).find((i) => i.start.getTime() > t);
  return next ? next.start.toISOString() : null;
}

export function openState(sf: HoursInput, now: string | Date): OpenState {
  const t = toDate(now).getTime();
  const intervals = openingIntervals(sf, now);
  const current = intervals.find((i) => i.start.getTime() <= t && t < i.end.getTime());
  const upcoming = intervals.find((i) => i.start.getTime() > t);
  if (sf.pause.paused) {
    return { state: 'closed', closesAt: null, nextOpening: null, busyUntil: null, paused: true };
  }
  if (current) {
    const busyUntil = sf.pause.busyUntil;
    if (busyUntil && new Date(busyUntil).getTime() > t) {
      return {
        state: 'busy',
        closesAt: current.end.toISOString(),
        nextOpening: null,
        busyUntil,
        paused: false,
      };
    }
    return {
      state: 'open',
      closesAt: current.end.toISOString(),
      nextOpening: null,
      busyUntil: null,
      paused: false,
    };
  }
  return {
    state: 'closed',
    closesAt: null,
    nextOpening: upcoming ? upcoming.start.toISOString() : null,
    busyUntil: null,
    paused: false,
  };
}

function ceilToStep(t: number): number {
  const step = SLOT_STEP_MINUTES * MS_MINUTE;
  return Math.ceil(t / step) * step;
}

function slotsIn(interval: Interval, from: number, prepMinutes: number): string[] {
  const first = ceilToStep(Math.max(from, interval.start.getTime() + prepMinutes * MS_MINUTE));
  const out: string[] = [];
  for (let s = first; s < interval.end.getTime(); s += SLOT_STEP_MINUTES * MS_MINUTE) {
    out.push(new Date(s).toISOString());
  }
  return out;
}

/**
 * Pickup (and delivery) times: 15-minute steps from the prep time out, today or tomorrow (Manila), inside hours,
 * closures skipped. Busy: only after the pause. Closed: the next opening's slots only, and only when the shop
 * takes orders while closed (N1). Paused: none.
 */
export function pickupSlots(sf: HoursInput, now: string | Date): string[] {
  const state = openState(sf, now);
  if (state.paused) return [];
  const t = toDate(now).getTime();
  const lastDay = addDays(manilaDate(now), 1);
  const inWindow = (iso: string) => manilaDate(iso) <= lastDay;
  const intervals = openingIntervals(sf, now).filter((i) => i.end.getTime() > t);

  if (state.state === 'closed') {
    if (!sf.takeOrdersWhileClosed) return [];
    const next = intervals.find((i) => i.start.getTime() > t);
    if (!next) return [];
    return slotsIn(next, t, sf.prepMinutes).filter(inWindow);
  }

  const from = state.state === 'busy' && state.busyUntil ? new Date(state.busyUntil).getTime() : t;
  const earliest = from + sf.prepMinutes * MS_MINUTE;
  // Each interval also needs its own prep time after it opens (slotsIn takes the later of the two).
  return intervals.flatMap((i) => slotsIn(i, earliest, sf.prepMinutes)).filter(inWindow);
}

/** "Ready in about 20 min" time for an ASAP order, or null when the shop can't take one now. */
export function readyEstimate(sf: HoursInput, now: string | Date): string | null {
  const state = openState(sf, now);
  if (state.state !== 'open') return null;
  return new Date(toDate(now).getTime() + sf.prepMinutes * MS_MINUTE).toISOString();
}

/** Sold out today turns back on by itself at `soldOutUntil` (the next opening). */
export function isSoldOutToday(
  variant: Pick<Variant, 'availability' | 'soldOutUntil'>,
  now: string | Date,
): boolean {
  if (variant.availability !== 'sold_out_today') return false;
  if (!variant.soldOutUntil) return true;
  return toDate(now).getTime() < new Date(variant.soldOutUntil).getTime();
}

export function variantAvailability(
  variant: Pick<Variant, 'availability' | 'soldOutUntil'>,
  now: string | Date,
): Availability {
  if (variant.availability === 'sold_out') return 'sold_out';
  return isSoldOutToday(variant, now) ? 'sold_out_today' : 'available';
}

/** "Open until 9 PM", "Closed · Opens 5 AM", "Closed · Opens tomorrow 5 AM", "Busy · back 3:40 PM". */
export function openStateText(state: OpenState, now: string | Date): string {
  if (state.paused) return words.shop.notTakingOrders;
  if (state.state === 'busy' && state.busyUntil)
    return words.shop.busyBack(formatClock(state.busyUntil));
  if (state.state === 'open' && state.closesAt)
    return words.shop.openUntil(formatClock(state.closesAt));
  if (!state.nextOpening) return words.shop.closedNoOpening;
  return words.shop.closedOpens(openingWhen(state.nextOpening, now));
}

/** "5 AM" today, "tomorrow 5 AM", "Tue 10 AM" later in the week. */
export function openingWhen(at: string, now: string | Date): string {
  const today = manilaDate(now);
  const day = manilaDate(at);
  if (day === today) return formatClock(at);
  if (day === addDays(today, 1)) return words.shop.tomorrowAt(formatClock(at));
  return `${formatManila(at, 'day')} ${formatClock(at)}`;
}
