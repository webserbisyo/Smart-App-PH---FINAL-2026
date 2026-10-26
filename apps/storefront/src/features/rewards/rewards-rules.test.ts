import { describe, expect, it } from 'vitest';
import { quantityLabel, type LedgerEntry, type StampRule } from '@smartapp/core';
import { capReached, ledgerLine, maskEmail, rewardRound, ruleLine } from './rewards-rules';

const rule: StampRule = {
  minOrderTotal: 25000,
  stampsNeeded: 8,
  welcomeStamps: 1,
  maxEarned: 1,
  period: 'day',
};

function entry(over: Partial<LedgerEntry>): LedgerEntry {
  return {
    kind: 'earned',
    delta: 1,
    reasonCategory: null,
    orderNo: 42,
    at: '2026-10-25T04:00:00.000Z',
    ...over,
  };
}

describe('rewards rules', () => {
  it('words the stamp rule with the daily cap', () => {
    expect(ruleLine(rule)).toBe('1 stamp per order of ₱250 or more · up to 1 a day');
    expect(ruleLine({ ...rule, minOrderTotal: 0, maxEarned: null, period: null })).toBe(
      '1 stamp per order',
    );
  });

  it('knows when today’s stamp is already earned (Manila day)', () => {
    const now = '2026-10-25T10:00:00.000Z';
    expect(capReached(rule, [entry({})], now)).toBe(true);
    expect(capReached(rule, [entry({ at: '2026-10-24T10:00:00.000Z' })], now)).toBe(false);
    expect(capReached(rule, [entry({ kind: 'welcome' })], now)).toBe(false);
    expect(capReached(rule, [entry({})], null)).toBe(false);
  });

  it('counts reward rounds so confetti fires once per reward', () => {
    expect(rewardRound([entry({})])).toBe(1);
    expect(rewardRound([entry({ kind: 'redeemed', delta: -8 }), entry({})])).toBe(2);
  });

  it('words history lines without private notes', () => {
    expect(ledgerLine(entry({ kind: 'pending' }))).toBe('Pending · Order #042');
    expect(ledgerLine(entry({ kind: 'given', reasonCategory: 'goodwill', orderNo: null }))).toBe(
      'Given by the shop · Thank-you',
    );
    expect(ledgerLine(entry({ kind: 'welcome', orderNo: null }))).toBe('Welcome stamp');
  });

  it('masks the email', () => {
    expect(maskEmail('juan@example.com')).toBe('j***@example.com');
  });

  it('shows the limited prize badge at the right thresholds', () => {
    const at = (left: number) => quantityLabel({ quantityTotal: 100, quantityLeft: left });
    expect(at(100)).toEqual({ kind: 'only', total: 100 });
    expect(at(21)).toEqual({ kind: 'only', total: 100 });
    expect(at(20)).toEqual({ kind: 'left', left: 20 });
    expect(at(1)).toEqual({ kind: 'left', left: 1 });
    expect(at(0)).toEqual({ kind: 'all_claimed', total: 100 });
  });
});
