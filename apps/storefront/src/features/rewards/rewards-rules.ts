// Join and Rewards (T12): the rule line, the daily cap, the history lines and the masked email.
import {
  formatPeso,
  periodStart,
  words,
  type LedgerEntry,
  type PublicStampCard,
  type StampRule,
} from '@smartapp/core';
import { formatOrderNumber } from '../receipt/receipt-rules';

/** "1 stamp per order of ₱250 or more · up to 1 a day". */
export function ruleLine(rule: StampRule): string {
  const W = words.rewards;
  const cap = rule.maxEarned !== null && rule.period ? W.cap(rule.maxEarned, rule.period) : null;
  return rule.minOrderTotal > 0 ? W.rule(formatPeso(rule.minOrderTotal), cap) : W.ruleNoMin(cap);
}

/** True when the member already earned the most stamps the rule allows in this day, week or month. */
export function capReached(
  rule: Pick<StampRule, 'maxEarned' | 'period'>,
  history: readonly LedgerEntry[],
  now: string | null,
): boolean {
  if (rule.maxEarned === null || rule.period === null || !now) return false;
  const since = periodStart(rule.period, now);
  const earned = history.filter((e) => e.kind === 'earned' && e.at >= since).length;
  return earned >= rule.maxEarned;
}

/** How many rewards the member has used: confetti fires once for each new round. */
export function rewardRound(history: readonly LedgerEntry[]): number {
  return history.filter((e) => e.kind === 'redeemed').length + 1;
}

/** The history line for one stamp change; manual changes show the reason category only. */
export function ledgerLine(entry: LedgerEntry): string {
  const L = words.rewards.ledger;
  const orderNo = entry.orderNo !== null ? formatOrderNumber(entry.orderNo) : null;
  switch (entry.kind) {
    case 'welcome':
      return L.welcome;
    case 'pending':
      return L.pending(orderNo ?? '');
    case 'earned':
      return L.earned(orderNo);
    case 'redeemed':
      return L.redeemed(orderNo);
    case 'reversed':
      return L.reversed(orderNo);
    case 'given':
      return entry.reasonCategory
        ? `${L.given} · ${words.rewards.reason[entry.reasonCategory]}`
        : L.given;
    case 'removed':
      return entry.reasonCategory
        ? `${L.removed} · ${words.rewards.reason[entry.reasonCategory]}`
        : L.removed;
  }
}

/** "j***@example.com": enough to recognise the address without showing it all. */
export function maskEmail(email: string): string {
  const [name = '', domain = ''] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 1)}***@${domain}`;
}

/** The reward's type line: "Free item", "₱100 off your order" or "Prize". */
export function rewardTypeLine(reward: PublicStampCard['reward']): string {
  if (reward.kind === 'discount' && reward.amount)
    return words.rewards.rewardOff(formatPeso(reward.amount));
  return words.rewards.rewardKind[reward.kind];
}
