// Closed dates (T129): the owner closes one day or several in a row; each day is still its own closures
// row (no migration), and the list shows days in a row with the same reason as one line.
import type { Closure } from '../schemas/storefront.js';
import { MAX_CLOSURES } from '../schemas/settings.js';
import { addDays } from './time.js';

/** Every date from `from` to `to`, both included (YYYY-MM-DD, Manila). Empty when `to` is before `from`. */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length <= MAX_CLOSURES; d = addDays(d, 1)) out.push(d);
  return out;
}

export interface ClosureGroup {
  from: string;
  to: string;
  reason: string | null;
  dates: string[];
}

/** Days in a row with the same reason become one group ("24 to 26 Dec · Christmas"), sorted by date. */
export function groupClosures(closures: readonly Closure[]): ClosureGroup[] {
  const sorted = [...closures].sort((a, b) => a.date.localeCompare(b.date));
  const groups: ClosureGroup[] = [];
  for (const c of sorted) {
    const last = groups.at(-1);
    const reason = c.reason?.trim() || null;
    if (last && last.reason === reason && addDays(last.to, 1) === c.date) {
      last.to = c.date;
      last.dates.push(c.date);
    } else {
      groups.push({ from: c.date, to: c.date, reason, dates: [c.date] });
    }
  }
  return groups;
}

export type AddClosuresProblem = 'past' | 'taken' | 'too_many';

/**
 * Adds a day or days in a row to the closed dates. Days already closed keep their own reason; it fails
 * only when nothing new is left, a day is before today, or the shop would pass its limit.
 */
export function addClosures(
  closures: readonly Closure[],
  from: string,
  to: string,
  reason: string | null,
  today: string,
): { ok: true; closures: Closure[]; added: number } | { ok: false; problem: AddClosuresProblem } {
  if (from < today) return { ok: false, problem: 'past' };
  const taken = new Set(closures.map((c) => c.date));
  const fresh = datesBetween(from, to).filter((d) => !taken.has(d));
  if (fresh.length === 0) return { ok: false, problem: 'taken' };
  const upcoming = closures.filter((c) => c.date >= today).length;
  if (upcoming + fresh.length > MAX_CLOSURES) return { ok: false, problem: 'too_many' };
  const clean = reason?.trim() || null;
  const next = [...closures, ...fresh.map((date) => ({ date, reason: clean }))].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return { ok: true, closures: next, added: fresh.length };
}
