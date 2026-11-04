import { describe, expect, it } from 'vitest';
import type { BoardOrder } from '@smartapp/core';
import {
  awaitsTransfer,
  moveTargets,
  ordersWords,
  payWindowOver,
  stageStatus,
  statusStage,
  ticketTime,
} from '@smartapp/core';
import { OrdersSearchSchema } from '../src/features/orders/search';

function order(patch: Partial<BoardOrder> = {}): BoardOrder {
  const at = '2026-11-04T10:00:00.000Z';
  return {
    id: 'o1',
    token: 't1',
    orderNo: 7,
    type: 'pickup',
    status: 'placed',
    paymentStatus: 'paid',
    paymentMethod: 'gcash',
    scheduledAt: null,
    placedAt: at,
    customerName: 'Ana',
    isFirstOrder: false,
    isMember: false,
    hasReward: false,
    itemsSummary: '1 × Burger',
    total: 19900,
    dueAt: '2026-11-04T10:20:00.000Z',
    startBy: at,
    pickupCode: 'ABCD',
    seenAt: at,
    lines: [
      { qty: 1, name: 'Burger', variantLabel: null, optionLabels: [], note: null, photo: null },
    ],
    moreLines: 0,
    note: null,
    ownerNote: null,
    deliveryArea: null,
    lastStepAt: at,
    expiresAt: null,
    memberStamps: null,
    ...patch,
  };
}

describe('Orders v2 rules (T54-T56)', () => {
  it('time chip: due, a few minutes left, late, waiting and out', () => {
    const o = order();
    expect(ticketTime(o, '2026-11-04T10:05:00.000Z')).toEqual({ kind: 'due', minutes: 0 });
    expect(ticketTime(o, '2026-11-04T10:16:30.000Z')).toEqual({ kind: 'soon', minutes: 4 });
    expect(ticketTime(o, '2026-11-04T10:24:00.000Z')).toEqual({ kind: 'late', minutes: 4 });
    // Only New and Preparing can be late; Ready counts the wait instead.
    expect(ticketTime({ ...o, status: 'ready' }, '2026-11-04T10:32:00.000Z')).toEqual({
      kind: 'waiting',
      minutes: 32,
    });
    expect(ticketTime({ ...o, status: 'out_for_delivery' }, '2026-11-04T10:18:00.000Z')).toEqual({
      kind: 'out',
      minutes: 18,
    });
    expect(ticketTime({ ...o, status: 'completed' }, '2026-11-04T11:00:00.000Z').kind).toBe('none');
  });

  it('stages map both ways', () => {
    expect(statusStage('out_for_delivery')).toBe('out');
    expect(statusStage('cancelled')).toBeNull();
    expect(stageStatus('done')).toBe('completed');
    expect(stageStatus('new')).toBe('placed');
  });

  it('move targets: every later step, never Out for a pickup, never Done while unpaid', () => {
    expect(moveTargets(order())).toEqual(['preparing', 'ready', 'completed']);
    expect(moveTargets(order({ type: 'delivery' }))).toEqual([
      'preparing',
      'ready',
      'out_for_delivery',
      'completed',
    ]);
    expect(moveTargets(order({ paymentMethod: 'cash', paymentStatus: 'unpaid' }))).toEqual([
      'preparing',
      'ready',
    ]);
    // An unpaid transfer can't start at all.
    expect(moveTargets(order({ paymentStatus: 'unpaid' }))).toEqual([]);
  });

  it('unpaid transfers wait, and leave the board when the pay window ends', () => {
    const unpaid = order({ paymentStatus: 'unpaid', expiresAt: '2026-11-04T10:15:00.000Z' });
    expect(awaitsTransfer(unpaid)).toBe(true);
    expect(awaitsTransfer(order({ paymentMethod: 'cash', paymentStatus: 'unpaid' }))).toBe(false);
    expect(payWindowOver(unpaid, '2026-11-04T10:14:59.000Z')).toBe(false);
    expect(payWindowOver(unpaid, '2026-11-04T10:15:00.000Z')).toBe(true);
    // A proof was sent: the owner checks it, the order stays.
    expect(payWindowOver({ ...unpaid, paymentStatus: 'pending' }, '2026-11-04T11:00:00.000Z')).toBe(
      false,
    );
  });

  it('the address falls back instead of breaking on bad values', () => {
    expect(OrdersSearchSchema.parse({ view: 'kitchen', filter: 'all', day: 'last week' })).toEqual({
      view: undefined,
      filter: undefined,
      day: undefined,
    });
    expect(
      OrdersSearchSchema.parse({
        view: 'list',
        day: '2026-11-01',
        status: 'done',
        order: 'ks-o-1',
      }),
    ).toMatchObject({ view: 'list', day: '2026-11-01', status: 'done', order: 'ks-o-1' });
  });

  it('words read naturally', () => {
    expect(ordersWords.board.laterToday(3)).toBe('+3 later today');
    expect(ordersWords.list.footer(1, '₱199.00')).toBe('1 order · ₱199.00');
    expect(ordersWords.stages.preparing('retail')).toBe('Packing');
  });
});
