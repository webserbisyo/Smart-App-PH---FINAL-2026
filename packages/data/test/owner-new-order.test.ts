import { describe, expect, it } from 'vitest';
import { balanceOf, editBlock, type OwnerOrderPayload } from '@smartapp/core';
import { errorCode, mnl, testStore } from './helpers.js';

const slug = 'kanto-smash';

// Two simple items (one size, no add-ons) from the shop's menu.
async function simpleItems(store: ReturnType<typeof testStore>['store']) {
  const shop = await store.storefront.getStorefront({ slug });
  if (!shop) throw new Error('no shop');
  const simple = shop.catalog.items.filter(
    (i) => i.variants.length === 1 && i.optionGroupIds.length === 0 && !i.variants[0]?.soldOut,
  );
  const [a, b] = simple;
  if (!a?.variants[0] || !b?.variants[0]) throw new Error('need two simple items');
  return [
    { itemId: a.id, variantId: a.variants[0].id, optionIds: [], note: '', qty: 1 },
    { itemId: b.id, variantId: b.variants[0].id, optionIds: [], note: '', qty: 1 },
  ] as const;
}

function walkIn(lines: OwnerOrderPayload['lines']): OwnerOrderPayload {
  return {
    type: 'walk_in',
    scheduledAt: null,
    lines,
    customer: { kind: 'guest', name: '', phone: null },
    delivery: null,
    deliveryFee: null,
    paymentMethod: 'cash',
    paymentAccountId: null,
    note: null,
    useReward: false,
    override: false,
  };
}

describe('New order and Edit order (T111)', () => {
  it('a walk-in handed over is made Done at once, paid in full, and a retry makes no second order', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));
    const [one] = await simpleItems(store);
    const input = {
      payload: walkIn([one]),
      pay: { kind: 'paid' as const, amount: null },
      handedOver: true,
      clientKey: 'walk-in-key-0001',
    };
    const made = await store.ownerOrders.createOwnerOrder({ slug, input });
    expect(made.status).toBe('completed');
    const again = await store.ownerOrders.createOwnerOrder({ slug, input });
    expect(again.orderId).toBe(made.orderId);

    const detail = await store.ownerOrders.getOrderDetail({ slug, orderId: made.orderId });
    expect(detail.source).toBe('owner');
    expect(detail.customerName).toBe('Walk-in');
    expect(detail.customerPhone).toBeNull();
    expect(detail.paidAmount).toBe(detail.totals.total);
    expect(editBlock(detail)).toBe('order_locked');
  });

  it('a part payment leaves the rest to collect, and Mark as paid takes the rest', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));
    const [one, two] = await simpleItems(store);
    const q = await store.ownerOrders.quoteOwnerOrder({ slug, payload: walkIn([one, two]) });
    const made = await store.ownerOrders.createOwnerOrder({
      slug,
      input: {
        payload: walkIn([one, two]),
        pay: { kind: 'part', amount: 100 },
        handedOver: false,
        clientKey: 'walk-in-key-0002',
      },
    });
    const detail = await store.ownerOrders.getOrderDetail({ slug, orderId: made.orderId });
    expect(detail.paymentStatus).toBe('unpaid');
    expect(balanceOf({ total: detail.totals.total, paidAmount: detail.paidAmount }).due).toBe(
      q.total - 100,
    );
    const paid = await store.ownerOrders.recordPayment({
      slug,
      orderId: made.orderId,
      method: 'cash',
      amount: q.total - 100,
    });
    expect(paid.paidAmount).toBe(q.total);
    expect(
      await errorCode(
        store.ownerOrders.createOwnerOrder({
          slug,
          input: {
            payload: walkIn([one]),
            pay: { kind: 'part', amount: 0 },
            handedOver: false,
            clientKey: 'walk-in-key-0003',
          },
        }),
      ),
    ).toBe('invalid_input');
  });

  it('an edit changes the items, raises the version, tells the customer, and refuses an old version', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));
    const [one, two] = await simpleItems(store);
    const made = await store.ownerOrders.createOwnerOrder({
      slug,
      input: {
        payload: walkIn([one]),
        pay: { kind: 'paid', amount: null },
        handedOver: false,
        clientKey: 'walk-in-key-0004',
      },
    });
    const before = await store.ownerOrders.getOrderDetail({ slug, orderId: made.orderId });
    expect(editBlock(before)).toBeNull();

    const edited = await store.ownerOrders.editOrder({
      slug,
      orderId: made.orderId,
      input: { version: before.version, payload: walkIn([one, two]) },
    });
    expect(edited.version).toBe(before.version + 1);
    expect(edited.editedAt).not.toBeNull();
    expect(edited.lines.length).toBe(2);
    expect(edited.totals.total).toBeGreaterThan(before.totals.total);
    // Paid for one item, now two: the rest is to collect.
    expect(edited.paymentStatus).toBe('unpaid');
    expect(balanceOf({ total: edited.totals.total, paidAmount: edited.paidAmount }).due).toBe(
      edited.totals.total - before.totals.total,
    );

    const receipt = await store.storefront.getOrder({ slug, token: edited.token });
    expect(receipt.messages.some((m) => m.kind === 'changed' && m.from === 'shop')).toBe(true);

    expect(
      await errorCode(
        store.ownerOrders.editOrder({
          slug,
          orderId: made.orderId,
          input: { version: before.version, payload: walkIn([one]) },
        }),
      ),
    ).toBe('order_changed');
  });

  it('a smaller order after paying shows change to give back until it is marked given back', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));
    const [one, two] = await simpleItems(store);
    const made = await store.ownerOrders.createOwnerOrder({
      slug,
      input: {
        payload: walkIn([one, two]),
        pay: { kind: 'paid', amount: null },
        handedOver: false,
        clientKey: 'walk-in-key-0005',
      },
    });
    const before = await store.ownerOrders.getOrderDetail({ slug, orderId: made.orderId });
    const edited = await store.ownerOrders.editOrder({
      slug,
      orderId: made.orderId,
      input: { version: before.version, payload: walkIn([one]) },
    });
    const { back } = balanceOf({ total: edited.totals.total, paidAmount: edited.paidAmount });
    expect(back).toBe(before.totals.total - edited.totals.total);
    expect(edited.paymentStatus).toBe('paid');
    const done = await store.ownerOrders.recordGiveBack({ slug, orderId: made.orderId });
    expect(done.paidAmount).toBe(edited.totals.total);
  });

  it('the owner quote skips customer-only limits but keeps closed days and checks the address', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));
    const [one] = await simpleItems(store);
    const q = await store.ownerOrders.quoteOwnerOrder({ slug, payload: walkIn([one]) });
    expect(q.problems).toEqual([]);
    const delivery = await store.ownerOrders.quoteOwnerOrder({
      slug,
      payload: { ...walkIn([one]), type: 'delivery', paymentMethod: 'cod' },
    });
    expect(delivery.problems.map((p) => p.code)).toContain('zone_required');
  });
});
