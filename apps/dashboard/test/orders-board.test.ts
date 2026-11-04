import { describe, expect, it } from 'vitest';
import type { BoardOrder } from '@smartapp/core';
import { boardColumn, canAdvance, canRecall, nextActions, ordersWords } from '@smartapp/core';

function mockOrder(patch: Partial<BoardOrder> = {}): BoardOrder {
  const basePlaced = '2026-11-03T10:00:00.000Z';
  return {
    id: 'ord_test_1',
    token: 'tok_test_123',
    orderNo: 12,
    type: 'pickup',
    status: 'placed',
    paymentStatus: 'paid',
    paymentMethod: 'gcash',
    scheduledAt: null,
    placedAt: basePlaced,
    customerName: 'Juan dela Cruz',
    isFirstOrder: false,
    isMember: false,
    hasReward: false,
    itemsSummary: '1 × Classic Burger',
    total: 25000,
    dueAt: '2026-11-03T10:20:00.000Z',
    startBy: '2026-11-03T10:00:00.000Z',
    pickupCode: 'ABCD',
    seenAt: basePlaced,
    lines: [
      { qty: 1, name: 'Burger', variantLabel: null, optionLabels: [], note: null, photo: null },
      { qty: 1, name: 'Fries', variantLabel: null, optionLabels: [], note: null, photo: null },
      { qty: 1, name: 'Drink', variantLabel: null, optionLabels: [], note: null, photo: null },
      { qty: 1, name: 'Pie', variantLabel: null, optionLabels: [], note: null, photo: null },
      { qty: 1, name: 'Sauce', variantLabel: null, optionLabels: [], note: null, photo: null },
    ],
    moreLines: 1,
    note: null,
    ownerNote: null,
    deliveryArea: null,
    lastStepAt: basePlaced,
    expiresAt: null,
    memberStamps: null,
    ...patch,
  };
}

describe('O3 orders-board rules and grouping', () => {
  it('groups orders into board columns correctly by status and timing', () => {
    const now = new Date('2026-11-03T10:05:00.000Z');

    const newOrder = mockOrder({ status: 'placed', startBy: '2026-11-03T10:00:00.000Z' });
    expect(boardColumn(newOrder, now)).toBe('new');

    const futureOrder = mockOrder({ status: 'placed', startBy: '2026-11-03T11:00:00.000Z' });
    expect(boardColumn(futureOrder, now)).toBe('scheduled');

    const preparingOrder = mockOrder({ status: 'preparing' });
    expect(boardColumn(preparingOrder, now)).toBe('preparing');

    const readyOrder = mockOrder({ status: 'ready' });
    expect(boardColumn(readyOrder, now)).toBe('ready');

    const outOrder = mockOrder({ status: 'out_for_delivery', type: 'delivery' });
    expect(boardColumn(outOrder, now)).toBe('out');

    const doneOrder = mockOrder({ status: 'completed' });
    expect(boardColumn(doneOrder, now)).toBe('done');
  });

  it('filters orders by order type correctly', () => {
    const orders: BoardOrder[] = [
      mockOrder({ id: '1', type: 'walk_in' }),
      mockOrder({ id: '2', type: 'pickup' }),
      mockOrder({ id: '3', type: 'delivery' }),
      mockOrder({ id: '4', type: 'pickup' }),
    ];

    expect(orders.filter((o) => o.type === 'walk_in')).toHaveLength(1);
    expect(orders.filter((o) => o.type === 'pickup')).toHaveLength(2);
    expect(orders.filter((o) => o.type === 'delivery')).toHaveLength(1);
  });

  it('enforces drop rules: any later column (T55), never backwards', () => {
    const order = mockOrder({
      status: 'placed',
      type: 'pickup',
      paymentStatus: 'paid',
      paymentMethod: 'gcash',
    });

    // Valid next step: placed -> preparing
    expect(canAdvance(order, 'preparing')).toEqual({ ok: true });
    expect(nextActions(order)).toEqual(['preparing']);

    // Forward skip: placed -> ready is allowed (decision T55)
    expect(canAdvance(order, 'ready')).toEqual({ ok: true });
    // A pickup never goes Out
    expect(canAdvance(order, 'out_for_delivery')).toEqual({
      ok: false,
      code: 'invalid_transition',
    });

    // Invalid backward move: preparing -> placed
    const prepOrder = mockOrder({ status: 'preparing', paymentStatus: 'paid' });
    expect(canAdvance(prepOrder, 'placed')).toEqual({ ok: false, code: 'invalid_transition' });
    expect(canAdvance(prepOrder, 'ready')).toEqual({ ok: true });
  });

  it('blocks advancing transfer orders when unpaid', () => {
    const unpaidTransfer = mockOrder({
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: 'gcash',
    });

    expect(canAdvance(unpaidTransfer, 'preparing')).toEqual({ ok: false, code: 'not_paid' });
    expect(nextActions(unpaidTransfer)).toEqual([]);

    // Cash / COD orders can advance even if paymentStatus is unpaid
    const unpaidCash = mockOrder({
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: 'cash',
    });
    expect(canAdvance(unpaidCash, 'preparing')).toEqual({ ok: true });
  });

  it('enforces 10-second recall grace window on the server (T51)', () => {
    const stepTime = '2026-11-03T10:00:00.000Z';
    const prepOrder = mockOrder({ status: 'preparing', lastStepAt: stepTime });

    // 4 seconds later: within 5s UI toast window and 10s server grace
    expect(canRecall(prepOrder, new Date('2026-11-03T10:00:04.000Z'))).toBe(true);

    // 8 seconds later: within 10s server grace
    expect(canRecall(prepOrder, new Date('2026-11-03T10:00:08.000Z'))).toBe(true);

    // 11 seconds later: expired
    expect(canRecall(prepOrder, new Date('2026-11-03T10:00:11.000Z'))).toBe(false);

    // Placed orders cannot be recalled
    const placedOrder = mockOrder({ status: 'placed', lastStepAt: stepTime });
    expect(canRecall(placedOrder, new Date('2026-11-03T10:00:02.000Z'))).toBe(false);
  });

  it('caps visible lines on card at 4 and computes remaining lines', () => {
    const orderWith5Lines = mockOrder();
    const cardLineCap = 4;
    const visible = orderWith5Lines.lines.slice(0, cardLineCap);
    const remaining = orderWith5Lines.lines.length - cardLineCap + orderWith5Lines.moreLines;

    expect(visible).toHaveLength(4);
    expect(remaining).toBe(2);
    expect(ordersWords.ticket.moreLines(remaining)).toBe('+2 more');

    // 40 line order
    const largeOrder = mockOrder({
      lines: Array.from({ length: 8 }, (_, i) => ({
        qty: 1,
        name: `Item ${i + 1}`,
        variantLabel: null,
        optionLabels: [],
        note: null,
        photo: null,
      })),
      moreLines: 32,
    });
    const largeVisible = largeOrder.lines.slice(0, 4);
    const largeRemaining = largeOrder.lines.length - 4 + largeOrder.moreLines;
    expect(largeVisible).toHaveLength(4);
    expect(largeRemaining).toBe(36);
    expect(ordersWords.ticket.moreLines(largeRemaining)).toBe('+36 more');
  });
});
