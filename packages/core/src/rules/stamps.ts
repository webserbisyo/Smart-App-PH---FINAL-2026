// Stamp card rules (N5, N27, S20 to S26, S34).
import type { Reward, StampRule } from '../schemas/loyalty.js';
import type { RewardState, StampCardStatus, StampPeriod } from '../schemas/enums.js';
import { addDays, manilaDate, manilaToDate, weekdayOf } from './time.js';

export interface StampProgress {
  filled: number;
  needed: number;
  left: number;
  ready: boolean;
  fraction: number;
}

export function stampProgress(balance: number, needed: number): StampProgress {
  const filled = Math.max(0, Math.min(balance, needed));
  return {
    filled,
    needed,
    left: Math.max(0, needed - balance),
    ready: balance >= needed,
    fraction: needed > 0 ? filled / needed : 0,
  };
}

export type EarnCheck = { earns: true } | { earns: false; reason: 'below_min' | 'cap_reached' };

/** One stamp per completed paid order over the minimum, up to the cap per period (default 1 per day). */
export function earnsStamp(
  rule: Pick<StampRule, 'minOrderTotal' | 'maxEarned'>,
  subtotal: number,
  earnedInPeriod: number,
): EarnCheck {
  if (subtotal < rule.minOrderTotal) return { earns: false, reason: 'below_min' };
  if (rule.maxEarned !== null && earnedInPeriod >= rule.maxEarned)
    return { earns: false, reason: 'cap_reached' };
  return { earns: true };
}

/** Start of the current Manila day, week (Monday) or month, as ISO UTC. */
export function periodStart(period: StampPeriod, now: string | Date): string {
  const today = manilaDate(now);
  if (period === 'day') return manilaToDate(today, '00:00').toISOString();
  if (period === 'week') {
    const back = (weekdayOf(today) + 6) % 7;
    return manilaToDate(addDays(today, -back), '00:00').toISOString();
  }
  return manilaToDate(`${today.slice(0, 8)}01`, '00:00').toISOString();
}

export interface RewardStateInput {
  card: { status: StampCardStatus; rule: Pick<StampRule, 'stampsNeeded'>; reward: Reward };
  member: { balance: number; pendingStamps: number } | null;
  // For a free-item reward: whether that item can be ordered right now.
  freeItemAvailable?: boolean | undefined;
}

/**
 * What the reward card shows. A ready reward stays usable while the card is paused; a limited prize at 0 is
 * all claimed (stamps stay safe); a free item that is sold out today is kept for next time.
 */
export function rewardState({
  card,
  member,
  freeItemAvailable = true,
}: RewardStateInput): RewardState {
  const balance = member?.balance ?? 0;
  const pending = member?.pendingStamps ?? 0;
  const needed = card.rule.stampsNeeded;
  const ready = balance >= needed;
  if (ready) {
    if (card.reward.quantityLeft === 0) return 'all_claimed';
    if (card.reward.kind === 'free_item' && !freeItemAvailable) return 'free_item_sold_out';
    return 'ready';
  }
  if (card.status === 'paused') return 'paused';
  if (balance + pending >= needed) return 'pending';
  return 'not_ready';
}

export type QuantityLabel =
  | { kind: 'only'; total: number }
  | { kind: 'left'; left: number }
  | { kind: 'all_claimed'; total: number };

/** "Only 100 pieces", then "23 left" at 20% or less, then "All 100 claimed". Null for an unlimited reward. */
export function quantityLabel(
  reward: Pick<Reward, 'quantityTotal' | 'quantityLeft'>,
): QuantityLabel | null {
  const total = reward.quantityTotal;
  const left = reward.quantityLeft;
  if (total === null || left === null) return null;
  if (left <= 0) return { kind: 'all_claimed', total };
  if (left <= total * 0.2) return { kind: 'left', left };
  return { kind: 'only', total };
}
