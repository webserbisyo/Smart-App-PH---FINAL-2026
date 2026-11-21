// Push News rules (decision T106): quiet hours, the weekly and daily limits, and where a tap opens. Shared
// by the dashboard, the mock and (later) NestJS, so the three always agree.
import {
  NEWS_DAY_LIMIT,
  NEWS_QUIET_FROM,
  NEWS_QUIET_UNTIL,
  NEWS_WEEK_LIMIT,
  type NewsLink,
  type NewsStatus,
} from '../schemas/news.js';
import { addDays, clockMinutes, manilaDate, manilaParts, manilaToDate } from './time.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// Statuses that use up one of the week's news.
const COUNTING: readonly NewsStatus[] = ['scheduled', 'sending', 'sent', 'waiting'];

export function newsCounts(status: NewsStatus): boolean {
  return COUNTING.includes(status);
}

/** True from 9 PM to 8 AM Manila time. */
export function isQuietTime(at: Date): boolean {
  const { hour, minute } = manilaParts(at);
  const m = hour * 60 + minute;
  return m >= clockMinutes(NEWS_QUIET_FROM) || m < clockMinutes(NEWS_QUIET_UNTIL);
}

/** The time itself, or 8 AM Manila when it falls in quiet hours. */
export function outOfQuiet(at: Date): Date {
  if (!isQuietTime(at)) return at;
  const { hour } = manilaParts(at);
  const day = manilaDate(at);
  const target = hour < 12 ? day : addDays(day, 1);
  return manilaToDate(target, NEWS_QUIET_UNTIL);
}

export interface NewsSlot {
  status: NewsStatus;
  // When it went or will go.
  at: string | null;
}

/** How many of the week's news are used for a send at `at` (the 7 days up to and after it). */
export function newsWeekUsed(slots: readonly NewsSlot[], at: Date): number {
  const t = at.getTime();
  return slots.filter(
    (s) => newsCounts(s.status) && s.at && Math.abs(new Date(s.at).getTime() - t) < 7 * DAY_MS,
  ).length;
}

/** A news already goes out on that Manila day. */
export function newsDayUsed(slots: readonly NewsSlot[], at: Date): boolean {
  const day = manilaDate(at);
  return (
    slots.filter((s) => newsCounts(s.status) && s.at && manilaDate(s.at) === day).length >=
    NEWS_DAY_LIMIT
  );
}

/** Can one more news go at `at`? Checks the week, the day and quiet hours. */
export function newsSendBlock(
  slots: readonly NewsSlot[],
  at: Date,
): 'week' | 'day' | 'quiet' | null {
  if (isQuietTime(at)) return 'quiet';
  if (newsWeekUsed(slots, at) >= NEWS_WEEK_LIMIT) return 'week';
  if (newsDayUsed(slots, at)) return 'day';
  return null;
}

/** When the next news can go: 7 days after the oldest one inside the window, at 8 AM or later. */
export function newsNextFree(slots: readonly NewsSlot[], now: Date): Date | null {
  const t = now.getTime();
  const inWindow = slots
    .filter(
      (s) => newsCounts(s.status) && s.at && Math.abs(new Date(s.at).getTime() - t) < 7 * DAY_MS,
    )
    .map((s) => new Date(s.at ?? 0).getTime())
    .sort((a, b) => a - b);
  if (inWindow.length < NEWS_WEEK_LIMIT) return null;
  const first = inWindow[0] ?? t;
  return outOfQuiet(new Date(Math.max(first + 7 * DAY_MS, t)));
}

/** The shop path a tap opens, marked so the page shows "From news · Stop news". */
export function newsPath(slug: string, link: NewsLink): string {
  if (link.kind === 'item' && link.itemId)
    return `/${slug}/menu?item=${encodeURIComponent(link.itemId)}&from=news`;
  if (link.kind === 'rewards') return `/${slug}/rewards?from=news`;
  return `/${slug}?from=news`;
}
