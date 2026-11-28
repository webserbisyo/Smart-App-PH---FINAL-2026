// Parts of the day for the shared slot picker (T127): the customer's When picker, the owner's Change time
// and New order. Its own module, so only the pickers carry it.
import type { ScheduleSlot } from '../schemas/schedule.js';
import { manilaParts } from './time.js';

export const DAY_PERIODS = ['morning', 'afternoon', 'evening'] as const;
export type DayPeriod = (typeof DAY_PERIODS)[number];

/** Morning before 12, Afternoon 12 to 5, Evening from 5 (Manila time). */
export function dayPeriodOf(at: string): DayPeriod {
  const { hour } = manilaParts(at);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/** A day's times by part of the day, leaving out parts with no times. */
export function slotsByPeriod<S extends Pick<ScheduleSlot, 'at'>>(
  slots: readonly S[],
): { period: DayPeriod; slots: S[] }[] {
  return DAY_PERIODS.map((period) => ({
    period,
    slots: slots.filter((s) => dayPeriodOf(s.at) === period),
  })).filter((g) => g.slots.length > 0);
}

/**
 * The part of the day a picker opens on: the picked time's part, else the first part with an open time,
 * else the first part with any time.
 */
export function openingPeriod(
  slots: readonly Pick<ScheduleSlot, 'at' | 'state'>[],
  picked: string | null,
): DayPeriod | null {
  if (picked && slots.some((s) => s.at === picked)) return dayPeriodOf(picked);
  const open = slots.find((s) => s.state === 'open');
  if (open) return dayPeriodOf(open.at);
  const first = slots[0];
  return first ? dayPeriodOf(first.at) : null;
}
