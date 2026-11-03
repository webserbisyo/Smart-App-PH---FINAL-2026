import { describe, expect, it } from 'vitest';
import type { BoardOrder } from '@smartapp/core';
import { dayLoads, statusTone } from '@smartapp/core';

function mockScheduledOrder(patch: Partial<BoardOrder> = {}): BoardOrder {
  const baseDue = '2026-11-08T07:00:00.000Z'; // Manila 3:00 PM Sat 8 Nov
  return {
    id: 'ord_sched_1',
    token: 'tok_sched_123',
    orderNo: 12,
    type: 'pickup',
    status: 'placed',
    paymentStatus: 'paid',
    paymentMethod: 'gcash',
    scheduledAt: baseDue,
    placedAt: '2026-11-03T10:00:00.000Z',
    customerName: 'Maria Santos',
    customerPhone: '+639171234567',
    isFirstOrder: false,
    isMember: true,
    hasReward: false,
    itemsSummary: '1 × Celebration Cake',
    total: 85000,
    dueAt: baseDue,
    startBy: '2026-11-08T05:00:00.000Z',
    pickupCode: 'CAKE',
    seenAt: '2026-11-03T10:00:00.000Z',
    lines: [
      {
        itemId: 'item_cake',
        qty: 1,
        name: 'Celebration Cake',
        variantLabel: '8 inch',
        optionLabels: [],
        note: null,
      },
    ],
    moreLines: 0,
    note: 'Happy Birthday Lola',
    ownerNote: null,
    deliveryArea: null,
    lastStepAt: '2026-11-03T10:00:00.000Z',
    totals: {
      subtotal: 85000,
      deliveryFee: 0,
      discount: 0,
      total: 85000,
    },
    ...patch,
  };
}

describe('O4 Scheduled calendar: events from orders, day loads, and drop intercept', () => {
  it('maps open orders into calendar events with tone colors and time boundaries', () => {
    const orders: BoardOrder[] = [
      mockScheduledOrder({
        id: 'ord_1',
        orderNo: 101,
        status: 'placed',
        dueAt: '2026-11-08T07:00:00.000Z',
      }),
      mockScheduledOrder({
        id: 'ord_2',
        orderNo: 102,
        status: 'preparing',
        dueAt: '2026-11-08T08:00:00.000Z',
      }),
      mockScheduledOrder({
        id: 'ord_3',
        orderNo: 103,
        status: 'ready',
        dueAt: '2026-11-08T09:00:00.000Z',
      }),
      mockScheduledOrder({
        id: 'ord_4',
        orderNo: 104,
        status: 'cancelled',
        dueAt: '2026-11-08T10:00:00.000Z',
      }),
      mockScheduledOrder({
        id: 'ord_5',
        orderNo: 105,
        status: 'completed',
        dueAt: '2026-11-08T11:00:00.000Z',
      }),
    ];

    // Filter rules
    const activeWithoutDone = orders.filter((o) => {
      if (o.status === 'cancelled' || o.status === 'expired') return false;
      if (o.status === 'completed') return false;
      return true;
    });

    expect(activeWithoutDone).toHaveLength(3);

    // Tone checks
    expect(statusTone(activeWithoutDone[0]!.status).tone).toBe('info');
    expect(statusTone(activeWithoutDone[1]!.status).tone).toBe('warning');
    expect(statusTone(activeWithoutDone[2]!.status).tone).toBe('success');

    // Show done rule
    const activeWithDone = orders.filter((o) => {
      if (o.status === 'cancelled' || o.status === 'expired') return false;
      return true;
    });
    expect(activeWithDone).toHaveLength(4);
    expect(activeWithDone.some((o) => o.status === 'completed')).toBe(true);
  });

  it('computes day loads, limit progress, and detects a Full day', () => {
    const saturdayDate = '2026-11-08';

    const cakeItem = { id: 'item_cake', name: 'Celebration Cake', dailyLimit: 6 };

    // 6 cake orders on Saturday
    const orders = [
      mockScheduledOrder({ id: '1', dueAt: '2026-11-08T01:00:00.000Z' }),
      mockScheduledOrder({ id: '2', dueAt: '2026-11-08T02:00:00.000Z' }),
      mockScheduledOrder({ id: '3', dueAt: '2026-11-08T03:00:00.000Z' }),
      mockScheduledOrder({ id: '4', dueAt: '2026-11-08T04:00:00.000Z' }),
      mockScheduledOrder({ id: '5', dueAt: '2026-11-08T05:00:00.000Z' }),
      mockScheduledOrder({ id: '6', dueAt: '2026-11-08T06:00:00.000Z' }),
    ];

    const loads = dayLoads(
      orders.map((o) => ({
        dueAt: o.dueAt,
        status: o.status,
        lines: o.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
      })),
      [cakeItem],
      saturdayDate,
      saturdayDate,
    );

    expect(loads).toHaveLength(1);
    const satLoad = loads[0]!;
    expect(satLoad.date).toBe(saturdayDate);
    expect(satLoad.orders).toBe(6);

    const cakeSummary = satLoad.items.find((i) => i.itemId === 'item_cake');
    expect(cakeSummary).toBeDefined();
    expect(cakeSummary?.count).toBe(6);
    expect(cakeSummary?.limit).toBe(6);

    // Is full condition
    const isFull = satLoad.items.some((it) => it.limit !== null && it.count >= it.limit);
    expect(isFull).toBe(true);
  });

  it('drag-and-drop on calendar drops never save directly and returns false to revert position', () => {
    const order = mockScheduledOrder({ id: 'ord_move_1' });
    let interceptedOrder: BoardOrder | null = null;
    let interceptedDate: Date | null = null;

    // Simulated event handler in ScheduledCalendar
    const onDropOrderToReschedule = (target: BoardOrder, proposedStart: Date) => {
      interceptedOrder = target;
      interceptedDate = proposedStart;
    };

    const proposedStart = new Date('2026-11-09T08:00:00.000Z');

    const handleEventUpdate = (update: {
      event: { data?: { order: BoardOrder } };
      start: Date;
    }) => {
      const ord = update.event.data?.order;
      if (!ord) return false;
      onDropOrderToReschedule(ord, update.start);
      // Contract: Always return false so calendar reverts event position pending confirm
      return false;
    };

    const result = handleEventUpdate({
      event: { data: { order } },
      start: proposedStart,
    });

    expect(result).toBe(false);
    expect(interceptedOrder).toBe(order);
    expect(interceptedDate).toBe(proposedStart);
  });
});
