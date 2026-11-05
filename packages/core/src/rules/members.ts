// Members rules (decisions T57 to T59): groups, impact of a card change, the manual-change limit, the
// double-stamp check, undo, member codes and "usually buys". SQL functions copy these in phase 4.
import type { LedgerKind, MemberSegment, StampCardStatus } from '../schemas/enums.js';
import { manilaDate } from './time.js';

export const MANUAL_CHANGES_PER_DAY = 3;
// Undo shows for 10 s; the server accepts it for 15 s so a slow phone still makes it (like Recall, T51).
export const UNDO_SECONDS = 10;
export const UNDO_GRACE_SECONDS = 15;
// A second counter stamp for the same member within 2 minutes asks first (D2).
export const RECENT_STAMP_SECONDS = 120;
export const QUIET_DAYS = 30;
export const NEW_DAYS = 30;
export const REGULAR_ORDERS = 3;
export const USUALLY_BUYS_DAYS = 90;

const DAY_MS = 86_400_000;

/** 1 or 2 stamps left; on small cards (5 or fewer) only 1 left, so a 5-stamp card isn't all "almost". */
export function isAlmost(balance: number, goal: number): boolean {
  const left = goal - balance;
  if (left <= 0) return false;
  return goal <= 5 ? left === 1 : left <= 2;
}

export interface SegmentInput {
  balance: number;
  goal: number;
  cardStatus: StampCardStatus;
  completedOrders: number;
  lastOrderAt: string | null;
  joinedAt: string;
}

/** The groups one member is in (rule M11). Ready and Almost need the card to be on or paused. */
export function memberSegments(m: SegmentInput, now: string | Date): MemberSegment[] {
  const t = new Date(now).getTime();
  const out: MemberSegment[] = [];
  if (m.cardStatus !== 'off') {
    if (m.balance >= m.goal) out.push('ready');
    else if (isAlmost(m.balance, m.goal)) out.push('almost');
  }
  if (m.completedOrders >= REGULAR_ORDERS) out.push('regulars');
  const lastSeen = new Date(m.lastOrderAt ?? m.joinedAt).getTime();
  if (t - lastSeen > QUIET_DAYS * DAY_MS) out.push('quiet');
  if (t - new Date(m.joinedAt).getTime() <= NEW_DAYS * DAY_MS) out.push('new');
  return out;
}

/** What changing the goal does to members' balances, both ways (rule M9). */
export function stampImpact(
  balances: readonly number[],
  oldGoal: number,
  newGoal: number,
): { readyNow: number; loseReady: number } {
  let readyNow = 0;
  let loseReady = 0;
  for (const b of balances) {
    if (b >= newGoal && b < oldGoal) readyNow += 1;
    if (b >= oldGoal && b < newGoal) loseReady += 1;
  }
  return { readyNow, loseReady };
}

export interface CounterEntry {
  kind: LedgerKind;
  at: string;
  byOwner: boolean;
  undone: boolean;
  reasonCategory?: string | null | undefined;
}

/** Manual changes the owner made today (Manila day). An undone stamp and its undo line count as none. */
export function manualChangesToday(entries: readonly CounterEntry[], now: string | Date): number {
  const today = manilaDate(now);
  return entries.filter(
    (e) =>
      e.byOwner &&
      !e.undone &&
      (e.kind === 'given' || e.kind === 'removed') &&
      manilaDate(e.at) === today,
  ).length;
}

export function changesLeftToday(entries: readonly CounterEntry[], now: string | Date): number {
  return Math.max(0, MANUAL_CHANGES_PER_DAY - manualChangesToday(entries, now));
}

/** The time of a counter stamp in the last 2 minutes that still counts, or null (D2). */
export function recentCounterStamp(
  entries: readonly CounterEntry[],
  now: string | Date,
): string | null {
  const t = new Date(now).getTime();
  let latest: string | null = null;
  for (const e of entries) {
    if (!e.byOwner || e.undone || e.kind !== 'given' || e.reasonCategory !== 'counter_purchase')
      continue;
    const age = t - new Date(e.at).getTime();
    if (age < 0 || age >= RECENT_STAMP_SECONDS * 1000) continue;
    if (latest === null || e.at > latest) latest = e.at;
  }
  return latest;
}

/** True while a counter change can still be undone on the server (10 s shown, 15 s accepted). */
export function canUndo(at: string, now: string | Date): boolean {
  const age = new Date(now).getTime() - new Date(at).getTime();
  return age >= 0 && age <= UNDO_GRACE_SECONDS * 1000;
}

/** "KS-4100", "ks 4100" and "ks4100" all become "KS4100"; "4100" stays "4100". */
export function normaliseMemberCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * A typed code matches only exactly (D7): the whole code, or its 4 or more digits on their own. There is
 * no "closest match", so a wrong digit never opens someone else's card.
 */
export function memberCodeMatches(code: string, typed: string): boolean {
  const want = normaliseMemberCode(typed);
  if (want.length < 4) return false;
  const have = normaliseMemberCode(code);
  if (have === want) return true;
  const digits = have.replace(/^[A-Z]+/, '');
  return /^\d+$/.test(want) && digits === want;
}

/** The item a person bought most (by quantity), ties broken by name; null when there is nothing. */
export function usuallyBuys(lines: readonly { name: string; qty: number }[]): string | null {
  const totals = new Map<string, number>();
  for (const l of lines) totals.set(l.name, (totals.get(l.name) ?? 0) + l.qty);
  let best: string | null = null;
  let bestQty = 0;
  for (const [name, qty] of [...totals.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (qty > bestQty) {
      best = name;
      bestQty = qty;
    }
  }
  return best;
}
