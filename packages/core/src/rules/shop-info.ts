// The Shop info sheet: hours grouped into runs of days, closures as lines, default member avatars.
import type { Weekday } from '../schemas/enums.js';
import type { Closure, OpeningRange } from '../schemas/storefront.js';
import { words } from '../words.js';
import { formatClock, formatManila, manilaToDate, weekdayName, weekdayOf } from './time.js';

// Monday first, the way shops write their hours.
const WEEK: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export interface HoursGroup {
  days: Weekday[];
  // "Mon to Thu", "Fri", "Sat, Sun"
  label: string;
  // "11 AM to 10 PM", "6 AM to 12 NN, 3 PM to 8 PM", "Closed"
  hours: string;
}

function rangesText(ranges: readonly OpeningRange[]): string {
  if (ranges.length === 0) return words.shop.closedNoOpening;
  return [...ranges]
    .sort((a, b) => a.open.localeCompare(b.open))
    .map((r) =>
      words.storefrontShell.home.hoursRange(
        formatClock(manilaToDate('2026-01-05', r.open)),
        formatClock(manilaToDate('2026-01-05', r.close)),
      ),
    )
    .join(', ');
}

function daysLabel(days: readonly Weekday[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  if (first === undefined || last === undefined) return '';
  if (days.length === 1) return weekdayName(first);
  if (days.length === 2)
    return words.storefrontShell.info.dayPair(weekdayName(first), weekdayName(last));
  return words.storefrontShell.info.dayRun(weekdayName(first), weekdayName(last));
}

/** Mon to Sun, neighbouring days with the same hours joined: "Mon to Thu 11 AM to 10 PM". */
export function groupedHours(hours: readonly OpeningRange[]): HoursGroup[] {
  const groups: { days: Weekday[]; hours: string }[] = [];
  for (const day of WEEK) {
    const text = rangesText(hours.filter((h) => h.day === day));
    const previous = groups[groups.length - 1];
    if (previous && previous.hours === text) previous.days.push(day);
    else groups.push({ days: [day], hours: text });
  }
  return groups.map((g) => ({ ...g, label: daysLabel(g.days) }));
}

/** Today's hours on a Manila date: "11 AM to 10 PM", or "Closed" (closures count). */
export function todayHoursText(
  sf: { hours: readonly OpeningRange[]; closures: readonly Closure[] },
  today: string,
): string {
  if (sf.closures.some((c) => c.date === today)) return words.shop.closedNoOpening;
  return rangesText(sf.hours.filter((h) => h.day === weekdayOf(today)));
}

/** "Closed Sat 1 Nov, All Saints' Day" for closures from today on, soonest first. */
export function upcomingClosures(closures: readonly Closure[], today: string): string[] {
  return closures
    .filter((c) => c.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) =>
      words.storefrontShell.home.closedOn(
        formatManila(manilaToDate(c.date, '12:00'), 'date'),
        c.reason,
      ),
    );
}

// Default faces for members without a photo (tooling/scripts/default-avatars.ts makes the files).
export const DEFAULT_AVATAR_COUNT = 24;

function hashOf(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function avatarPath(index: number): string {
  return `/avatars/default-${String(index + 1).padStart(2, '0')}.webp`;
}

/** The same face for the same person every time. */
export function defaultAvatar(key: string): string {
  return avatarPath(hashOf(key) % DEFAULT_AVATAR_COUNT);
}

/** A few different faces for a shop's members pill, the same set on every visit. */
export function membersPreviewAvatars(seed: string, count: number): string[] {
  const start = hashOf(seed) % DEFAULT_AVATAR_COUNT;
  const take = Math.min(count, DEFAULT_AVATAR_COUNT);
  // A step that is coprime with 24 spreads the picks around the set.
  return Array.from({ length: take }, (_, i) => avatarPath((start + i * 7) % DEFAULT_AVATAR_COUNT));
}
