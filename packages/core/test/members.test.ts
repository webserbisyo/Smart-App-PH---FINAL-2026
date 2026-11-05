// Members rules (T57 to T59). The SQL functions in phase 4 run the same table.
import { describe, expect, it } from 'vitest';
import {
  canUndo,
  changesLeftToday,
  isAlmost,
  manualChangesToday,
  memberCodeMatches,
  memberSegments,
  normaliseMemberCode,
  recentCounterStamp,
  stampImpact,
  usuallyBuys,
  type CounterEntry,
} from '../src/rules/members.js';

const NOW = '2026-11-05T04:00:00.000Z'; // 12:00 NN Manila
const ago = (minutes: number) => new Date(new Date(NOW).getTime() - minutes * 60_000).toISOString();
const daysAgo = (days: number) => ago(days * 1440);

describe('isAlmost: 1 or 2 left, only 1 on cards of 5 or fewer (M11)', () => {
  it.each([
    [8, 10, true],
    [9, 10, true],
    [7, 10, false],
    [10, 10, false],
    [4, 5, true],
    [3, 5, false],
    [3, 4, true],
    [2, 4, false],
  ])('%i of %i → %s', (balance, goal, want) => {
    expect(isAlmost(balance, goal)).toBe(want);
  });
});

describe('memberSegments', () => {
  const base = {
    balance: 3,
    goal: 10,
    cardStatus: 'on' as const,
    completedOrders: 1,
    lastOrderAt: daysAgo(2),
    joinedAt: daysAgo(90),
  };
  it.each([
    ['nothing special', base, []],
    ['ready', { ...base, balance: 10 }, ['ready']],
    ['over the goal is still ready', { ...base, balance: 12 }, ['ready']],
    ['almost', { ...base, balance: 9 }, ['almost']],
    ['paused keeps ready (M1)', { ...base, balance: 10, cardStatus: 'paused' as const }, ['ready']],
    ['off shows no card groups', { ...base, balance: 10, cardStatus: 'off' as const }, []],
    ['regulars at 3 orders', { ...base, completedOrders: 3 }, ['regulars']],
    ['quiet after 30 days', { ...base, lastOrderAt: daysAgo(31) }, ['quiet']],
    [
      'never ordered counts from joining',
      { ...base, lastOrderAt: null, joinedAt: daysAgo(45) },
      ['quiet'],
    ],
    ['new within 30 days', { ...base, joinedAt: daysAgo(10) }, ['new']],
    [
      'several at once',
      { ...base, balance: 8, completedOrders: 5, joinedAt: daysAgo(20) },
      ['almost', 'regulars', 'new'],
    ],
  ])('%s', (_name, input, want) => {
    expect(memberSegments(input, NOW)).toEqual(want);
  });
});

describe('stampImpact both ways (M9)', () => {
  const balances = [0, 4, 5, 6, 8, 10];
  it('goal down: who becomes ready', () => {
    expect(stampImpact(balances, 10, 6)).toEqual({ readyNow: 2, loseReady: 0 });
  });
  it('goal up: who loses a ready reward', () => {
    expect(stampImpact(balances, 5, 6)).toEqual({ readyNow: 0, loseReady: 1 });
  });
  it('same goal: nothing', () => {
    expect(stampImpact(balances, 8, 8)).toEqual({ readyNow: 0, loseReady: 0 });
  });
});

const line = (patch: Partial<CounterEntry>): CounterEntry => ({
  kind: 'given',
  at: ago(30),
  byOwner: true,
  undone: false,
  reasonCategory: 'counter_purchase',
  ...patch,
});

describe('manual changes: 3 per Manila day, an undone pair counts as none (M6, D1)', () => {
  it.each([
    ['none yet', [], 0],
    ['one stamp', [line({})], 1],
    ['a stamp and a removal', [line({}), line({ kind: 'removed' })], 2],
    [
      'undone stamp and its undo line',
      [line({ undone: true }), line({ kind: 'undone', undone: true })],
      0,
    ],
    ['earned by an order', [line({ kind: 'earned', byOwner: false })], 0],
    ['yesterday in Manila', [line({ at: '2026-11-04T15:59:00.000Z' })], 0],
    ['just after Manila midnight', [line({ at: '2026-11-04T16:01:00.000Z' })], 1],
    ['four', [line({}), line({}), line({}), line({})], 4],
  ])('%s → %i used', (_name, entries, used) => {
    expect(manualChangesToday(entries, NOW)).toBe(used);
    expect(changesLeftToday(entries, NOW)).toBe(Math.max(0, 3 - used));
  });
});

describe('recentCounterStamp: the 2-minute double-stamp check (D2)', () => {
  it.each([
    ['a counter stamp 1 minute ago', [line({ at: ago(1) })], ago(1)],
    ['2 minutes ago is outside', [line({ at: ago(2) })], null],
    ['an undone stamp does not count', [line({ at: ago(1), undone: true })], null],
    ['another reason does not count', [line({ at: ago(1), reasonCategory: 'goodwill' })], null],
    ['an order stamp does not count', [line({ at: ago(1), kind: 'earned', byOwner: false })], null],
  ])('%s', (_name, entries, want) => {
    expect(recentCounterStamp(entries, NOW)).toBe(want);
  });
});

describe('canUndo: shown 10 s, accepted 15 s', () => {
  it.each([
    [0, true],
    [10, true],
    [15, true],
    [16, false],
  ])('%i s → %s', (seconds, want) => {
    expect(canUndo(ago(seconds / 60), NOW)).toBe(want);
  });
  it('a future time (clock skew) is refused', () => {
    expect(canUndo(ago(-1), NOW)).toBe(false);
  });
});

describe('member codes match exactly (D7)', () => {
  it('normalises spacing, dashes and case', () => {
    expect(normaliseMemberCode(' ks-4100 ')).toBe('KS4100');
  });
  it.each([
    ['KS-4100', true],
    ['ks4100', true],
    ['KS 4100', true],
    ['4100', true],
    ['410', false],
    ['4101', false],
    ['KS-41000', false],
    ['KA-4100', false],
  ])('%s → %s', (typed, want) => {
    expect(memberCodeMatches('KS-4100', typed)).toBe(want);
  });
});

describe('usuallyBuys (D6)', () => {
  it('most by quantity, ties by name, null when empty', () => {
    expect(
      usuallyBuys([
        { name: 'Latte', qty: 2 },
        { name: 'Mocha', qty: 1 },
        { name: 'Mocha', qty: 1 },
        { name: 'Bun', qty: 1 },
      ]),
    ).toBe('Latte');
    expect(usuallyBuys([])).toBeNull();
  });
});
