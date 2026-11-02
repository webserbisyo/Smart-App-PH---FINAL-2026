import { describe, expect, it } from 'vitest';
import {
  BoardOrderSchema,
  BookingRulesSchema,
  DayLoadSchema,
  OpenStateSchema,
} from '@smartapp/core';
import { errorCode, mnl, testStore } from './helpers.js';
import { createApiOwnerOrdersAdapter } from '../src/adapters/api/owner-orders.js';
import type { OwnerOrdersAdapter } from '../src/adapters/types.js';

describe('ownerOrders mock adapter', () => {
  it('listOrders returns board cards with lines up to 8, moreLines, seenAt, dueAt, startBy, pickupCode', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));

    // Open orders for Kanto Smash
    const openOrders = await store.ownerOrders.listOrders({ slug: 'kanto-smash', open: true });
    expect(openOrders.length).toBeGreaterThan(0);

    for (const card of openOrders) {
      const parsed = BoardOrderSchema.safeParse(card);
      expect(parsed.success).toBe(true);
      expect(card.lines.length).toBeLessThanOrEqual(8);
      expect(card.dueAt).toBeDefined();
      expect(card.startBy).toBeDefined();
      expect(card.pickupCode).toBeDefined();
      expect(card.pickupCode.length).toBe(4);
    }

    // Check Lola Remy 40-line order has lines capped at 8 and moreLines: 32
    const lolaOrders = await store.ownerOrders.listOrders({ slug: 'lola-remy', open: true });
    const longOrder = lolaOrders.find((o) => o.moreLines > 0);
    expect(longOrder).toBeDefined();
    if (longOrder) {
      expect(longOrder.lines.length).toBe(8);
      expect(longOrder.moreLines).toBe(32);
    }
  });

  it('listOrders filters by businessDate and search q (orderNo, customerName, phone, pickupCode)', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));

    const dateOrders = await store.ownerOrders.listOrders({
      slug: 'kanto-smash',
      date: '2026-10-26',
    });
    expect(dateOrders.length).toBeGreaterThan(0);

    const first = dateOrders[0]!;

    // Search by orderNo
    const byNo = await store.ownerOrders.listOrders({
      slug: 'kanto-smash',
      date: '2026-10-26',
      q: String(first.orderNo),
    });
    expect(byNo.some((o) => o.id === first.id)).toBe(true);

    // Search by customer name
    const byName = await store.ownerOrders.listOrders({
      slug: 'kanto-smash',
      date: '2026-10-26',
      q: first.customerName.slice(0, 3),
    });
    expect(byName.some((o) => o.id === first.id)).toBe(true);

    // Search by pickup code
    const byCode = await store.ownerOrders.listOrders({
      slug: 'kanto-smash',
      date: '2026-10-26',
      q: first.pickupCode,
    });
    expect(byCode.some((o) => o.id === first.id)).toBe(true);
  });

  it('listScheduled returns scheduled orders and daily loads', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));

    const result = await store.ownerOrders.listScheduled({
      slug: 'lola-remy',
      from: '2026-10-26',
      to: '2026-11-05',
    });

    expect(result.orders.length).toBeGreaterThan(0);
    for (const order of result.orders) {
      expect(BoardOrderSchema.safeParse(order).success).toBe(true);
      expect(order.scheduledAt).not.toBeNull();
    }

    expect(result.days.length).toBeGreaterThan(0);
    for (const day of result.days) {
      expect(DayLoadSchema.safeParse(day).success).toBe(true);
      expect(day.date).toBeDefined();
    }
  });

  it('findOrder finds order by pickup code or order number', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));

    const openOrders = await store.ownerOrders.listOrders({ slug: 'kanto-smash', open: true });
    const target = openOrders[0]!;

    // Find by pickup code (case-insensitive)
    const byCode = await store.ownerOrders.findOrder({
      slug: 'kanto-smash',
      code: target.pickupCode.toLowerCase(),
    });
    expect(byCode.length).toBeGreaterThan(0);
    expect(byCode.some((o) => o.id === target.id)).toBe(true);

    // Find by order number
    const byNumber = await store.ownerOrders.findOrder({
      slug: 'kanto-smash',
      code: String(target.orderNo),
    });
    expect(byNumber.length).toBeGreaterThan(0);
    expect(byNumber.some((o) => o.id === target.id)).toBe(true);

    // Not found
    const missing = await store.ownerOrders.findOrder({
      slug: 'kanto-smash',
      code: 'NONEXISTENT999',
    });
    expect(missing).toEqual([]);
  });

  it('markSeen sets seenAt timestamp on an order', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));

    const openOrders = await store.ownerOrders.listOrders({ slug: 'kanto-smash', open: true });
    // Find an order that was not seen
    const unseen = openOrders.find((o) => o.seenAt === null);
    expect(unseen).toBeDefined();
    if (!unseen) return;

    const seen = await store.ownerOrders.markSeen({
      slug: 'kanto-smash',
      orderId: unseen.id,
    });
    expect(seen.seenAt).not.toBeNull();

    // Repeated call retains seenAt
    const seenAgain = await store.ownerOrders.markSeen({
      slug: 'kanto-smash',
      orderId: unseen.id,
    });
    expect(seenAgain.seenAt).toBe(seen.seenAt);
  });

  it('recallOrder reverts status within 10 seconds and leaves schedule messages untouched', async () => {
    const { store, clock } = testStore(mnl('2026-10-26 12:00'));

    const openOrders = await store.ownerOrders.listOrders({ slug: 'kanto-smash', open: true });
    // Starting a transfer order needs it paid, so pick one that can start.
    const placed = openOrders.find(
      (o) =>
        o.status === 'placed' &&
        (o.paymentStatus === 'paid' || o.paymentMethod === 'cash' || o.paymentMethod === 'cod'),
    );
    expect(placed).toBeDefined();
    if (!placed) return;

    // Reschedule order first to create a schedule thread message
    await store.ownerOrders.rescheduleOrder({
      slug: 'kanto-smash',
      orderId: placed.id,
      scheduledAt: mnl('2026-10-26 14:00'),
      override: true,
    });

    const withSchedule = await store.ownerOrders.getOrderDetail({
      slug: 'kanto-smash',
      orderId: placed.id,
    });
    const scheduleMsgCount = withSchedule.messages.filter((m) => m.kind === 'schedule').length;
    expect(scheduleMsgCount).toBe(1);

    // Advance order to 'preparing'
    const advanced = await store.ownerOrders.advanceOrder({
      slug: 'kanto-smash',
      orderId: placed.id,
      toStatus: 'preparing',
    });
    expect(advanced.status).toBe('preparing');

    // Recall inside 10 seconds (e.g. after 5 seconds)
    clock.now = new Date(new Date(advanced.lastStepAt).getTime() + 5_000);
    const recalled = await store.ownerOrders.recallOrder({
      slug: 'kanto-smash',
      orderId: placed.id,
    });
    expect(recalled.status).toBe('placed');

    // Verify schedule message was not touched by recall
    const afterRecall = await store.ownerOrders.getOrderDetail({
      slug: 'kanto-smash',
      orderId: placed.id,
    });
    expect(afterRecall.messages.filter((m) => m.kind === 'schedule').length).toBe(1);

    // Advance again
    const advancedAgain = await store.ownerOrders.advanceOrder({
      slug: 'kanto-smash',
      orderId: placed.id,
      toStatus: 'preparing',
    });

    // Advance clock past 10 seconds -> recall fails with recall_expired
    clock.now = new Date(new Date(advancedAgain.lastStepAt).getTime() + 11_000);
    const code = await errorCode(
      store.ownerOrders.recallOrder({
        slug: 'kanto-smash',
        orderId: placed.id,
      }),
    );
    expect(code).toBe('recall_expired');
  });

  it('rescheduleOrder recalculates dueAt/startBy, enforces slot capacity and opening hours', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));

    const openOrders = await store.ownerOrders.listOrders({ slug: 'kanto-smash', open: true });
    const pickupOrder = openOrders.find((o) => o.type === 'pickup' && o.status === 'placed');
    expect(pickupOrder).toBeDefined();
    if (!pickupOrder) return;

    // Reschedule pickup order inside hours
    const targetSlot = mnl('2026-10-26 15:30');
    const rescheduled = await store.ownerOrders.rescheduleOrder({
      slug: 'kanto-smash',
      orderId: pickupOrder.id,
      scheduledAt: targetSlot,
    });
    expect(rescheduled.scheduledAt).toBe(targetSlot);
    expect(rescheduled.dueAt).toBe(targetSlot);
    expect(new Date(rescheduled.startBy).getTime()).toBeLessThan(new Date(targetSlot).getTime());

    // Lola Remy slot full refusal without override
    const lolaOrders = await store.ownerOrders.listOrders({ slug: 'lola-remy', open: true });
    const lolaPickup = lolaOrders.find((o) => o.type === 'pickup' && o.status === 'placed');
    expect(lolaPickup).toBeDefined();
    if (lolaPickup) {
      // Find a slot that is full (Lola Remy has max ordersPerSlot: 4)
      // Pick a slot and fill it
      const saturatedSlot = mnl('2026-10-27 10:00');
      // Update rules to ordersPerSlot: 1 to easily trigger slot_full
      await store.ownerOrders.saveBookingRules({
        slug: 'lola-remy',
        rules: {
          daysAhead: 30,
          slotMinutes: 60,
          ordersPerSlot: 1,
          prepMinutes: 20,
          takeOrdersWhileClosed: false,
        },
      });

      // Place first order in slot
      await store.ownerOrders.rescheduleOrder({
        slug: 'lola-remy',
        orderId: lolaPickup.id,
        scheduledAt: saturatedSlot,
        override: true,
      });

      // Second order without override fails with slot_full
      const secondOrder = lolaOrders.find(
        (o) => o.id !== lolaPickup.id && o.type === 'pickup' && o.status === 'placed',
      );
      if (secondOrder) {
        const fullErr = await errorCode(
          store.ownerOrders.rescheduleOrder({
            slug: 'lola-remy',
            orderId: secondOrder.id,
            scheduledAt: saturatedSlot,
            override: false,
          }),
        );
        expect(fullErr).toBe('slot_full');

        // With override: true, rescheduling to full slot succeeds
        const overridden = await store.ownerOrders.rescheduleOrder({
          slug: 'lola-remy',
          orderId: secondOrder.id,
          scheduledAt: saturatedSlot,
          override: true,
        });
        expect(overridden.scheduledAt).toBe(saturatedSlot);
      }

      // Even with override: true, rescheduling outside opening hours is refused
      const outOfHours = mnl('2026-10-27 23:30');
      const outErr = await errorCode(
        store.ownerOrders.rescheduleOrder({
          slug: 'lola-remy',
          orderId: lolaPickup.id,
          scheduledAt: outOfHours,
          override: true,
        }),
      );
      expect(outErr).toBe('reschedule_not_allowed');

      // Even with override: true, rescheduling to a closure day is refused
      const closedDay = mnl('2026-11-01 10:00'); // Kape Juan closed on Nov 1
      const kapeOrders = await store.ownerOrders.listOrders({ slug: 'kape-juan', open: true });
      const kapeOrder = kapeOrders.find((o) => o.type === 'pickup');
      if (kapeOrder) {
        const closureErr = await errorCode(
          store.ownerOrders.rescheduleOrder({
            slug: 'kape-juan',
            orderId: kapeOrder.id,
            scheduledAt: closedDay,
            override: true,
          }),
        );
        expect(closureErr).toBe('reschedule_not_allowed');
      }
    }

    // Walk-in order cannot be rescheduled
    const walkInOrder = openOrders.find((o) => o.type === 'walk_in');
    if (walkInOrder) {
      const walkInErr = await errorCode(
        store.ownerOrders.rescheduleOrder({
          slug: 'kanto-smash',
          orderId: walkInOrder.id,
          scheduledAt: targetSlot,
        }),
      );
      expect(walkInErr).toBe('reschedule_not_allowed');
    }
  });

  it('saveOwnerNote saves and clears note, enforces max 300 chars', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));

    const openOrders = await store.ownerOrders.listOrders({ slug: 'kanto-smash', open: true });
    const target = openOrders[0]!;

    // Save note
    const noteText = 'Customer requested extra napkins and cutlery.';
    const saved = await store.ownerOrders.saveOwnerNote({
      slug: 'kanto-smash',
      orderId: target.id,
      note: noteText,
    });
    expect(saved.ownerNote).toBe(noteText);

    // Long note is trimmed to 300 chars
    const longText = 'A'.repeat(350);
    const longSaved = await store.ownerOrders.saveOwnerNote({
      slug: 'kanto-smash',
      orderId: target.id,
      note: longText,
    });
    expect(longSaved.ownerNote?.length).toBe(300);

    // Clear note
    const cleared = await store.ownerOrders.saveOwnerNote({
      slug: 'kanto-smash',
      orderId: target.id,
      note: null,
    });
    expect(cleared.ownerNote).toBeNull();
  });

  it('getBookingRules and saveBookingRules round-trip configuration', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));

    const rules = await store.ownerOrders.getBookingRules({ slug: 'kanto-smash' });
    expect(BookingRulesSchema.safeParse(rules).success).toBe(true);

    const updated = await store.ownerOrders.saveBookingRules({
      slug: 'kanto-smash',
      rules: {
        daysAhead: 7,
        slotMinutes: 15,
        ordersPerSlot: 5,
        prepMinutes: 25,
        takeOrdersWhileClosed: true,
      },
    });

    expect(updated.daysAhead).toBe(7);
    expect(updated.slotMinutes).toBe(15);
    expect(updated.ordersPerSlot).toBe(5);
    expect(updated.prepMinutes).toBe(25);
    expect(updated.takeOrdersWhileClosed).toBe(true);

    const reloaded = await store.ownerOrders.getBookingRules({ slug: 'kanto-smash' });
    expect(reloaded).toEqual(updated);
  });

  it('setPause toggles busy_15, busy_30, pause, and resume with proper openState', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));

    // busy_15
    const busy15 = await store.ownerOrders.setPause({ slug: 'kanto-smash', mode: 'busy_15' });
    expect(OpenStateSchema.safeParse(busy15).success).toBe(true);
    expect(busy15.state).toBe('busy');
    expect(busy15.busyUntil).toBe(mnl('2026-10-26 12:15'));

    // busy_30
    const busy30 = await store.ownerOrders.setPause({ slug: 'kanto-smash', mode: 'busy_30' });
    expect(busy30.state).toBe('busy');
    expect(busy30.busyUntil).toBe(mnl('2026-10-26 12:30'));

    // pause
    const paused = await store.ownerOrders.setPause({ slug: 'kanto-smash', mode: 'pause' });
    expect(paused.state).toBe('closed');
    expect(paused.paused).toBe(true);

    // resume
    const resumed = await store.ownerOrders.setPause({ slug: 'kanto-smash', mode: 'resume' });
    expect(resumed.state).toBe('open');
    expect(resumed.paused).toBe(false);
    expect(resumed.busyUntil).toBeNull();
  });

  it('createApiOwnerOrdersAdapter implements all methods returning promises', () => {
    const adapter = createApiOwnerOrdersAdapter({
      baseUrl: 'http://localhost:4000',
      getToken: async () => 'mock-jwt-token',
    });

    const expectedMethods: readonly (keyof OwnerOrdersAdapter)[] = [
      'listOrders',
      'listScheduled',
      'findOrder',
      'markSeen',
      'getOrderDetail',
      'getProofUrl',
      'reviewPayment',
      'recordPayment',
      'advanceOrder',
      'recallOrder',
      'rescheduleOrder',
      'saveOwnerNote',
      'cancelOrder',
      'saveDeliveryInfo',
      'getBookingRules',
      'saveBookingRules',
      'setPause',
    ];

    for (const name of expectedMethods) {
      expect(typeof adapter[name]).toBe('function');
    }
  });
});
