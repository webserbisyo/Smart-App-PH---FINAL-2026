import { formatManila, manilaDate, membersWords } from '@smartapp/core';

const DAY_MS = 86_400_000;

/** Whole Manila days from `at` to now (0 = today). */
export function daysSince(at: string, now: Date): number {
  return Math.round(
    (new Date(`${manilaDate(now)}T00:00:00Z`).getTime() -
      new Date(`${manilaDate(at)}T00:00:00Z`).getTime()) /
      DAY_MS,
  );
}

/** "Today", "Yesterday", "3 days ago", then the date: how the counter talks about the last visit. */
export function lastInLabel(at: string | null, now: Date): string {
  if (!at) return membersWords.when.never;
  const days = daysSince(at, now);
  if (days <= 0) return membersWords.when.today;
  if (days === 1) return membersWords.when.yesterday;
  if (days < 7) return membersWords.when.daysAgo(days);
  return formatManila(at, 'date');
}

/** "less than a minute" or "1 minute" for the double-stamp question (D2). */
export function agoLabel(at: string, now: Date): string {
  return now.getTime() - new Date(at).getTime() < 60_000
    ? membersWords.recent.lessThanMinute
    : membersWords.recent.oneMinute;
}
