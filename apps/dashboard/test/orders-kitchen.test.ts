import { describe, expect, it } from 'vitest';
import type { BoardOrder } from '@smartapp/core';
import {
  kitchenReady,
  kitchenTickets,
  pruneKitchenChecks,
  toggleKitchenCheck,
  vocab,
} from '@smartapp/core';
import { createDeviceStorage } from '@smartapp/data';

const NOW = new Date('2026-11-03T10:30:00.000Z');

function order(patch: Partial<BoardOrder> = {}): BoardOrder {
  return {
    id: 'ord_1',
    token: 'tok_kitchen_1',
    orderNo: 1,
    type: 'pickup',
    status: 'placed',
    paymentStatus: 'paid',
    paymentMethod: 'gcash',
    scheduledAt: null,
    placedAt: '2026-11-03T10:00:00.000Z',
    customerName: 'Ana',
    isFirstOrder: false,
    isMember: false,
    hasReward: false,
    itemsSummary: '1 × Burger',
    total: 25000,
    dueAt: '2026-11-03T10:40:00.000Z',
    startBy: '2026-11-03T10:20:00.000Z',
    pickupCode: 'ABCD',
    seenAt: null,
    lines: [{ qty: 1, name: 'Burger', variantLabel: null, optionLabels: [], note: null }],
    moreLines: 0,
    note: null,
    ownerNote: null,
    deliveryArea: null,
    lastStepAt: '2026-11-03T10:00:00.000Z',
    ...patch,
  };
}

describe('O5 Kitchen view: which tickets show', () => {
  it('shows New orders due to start and Preparing orders, oldest start-by first', () => {
    const orders = [
      order({ id: 'late', orderNo: 3, status: 'preparing', startBy: '2026-11-03T10:25:00.000Z' }),
      order({ id: 'early', orderNo: 2, startBy: '2026-11-03T10:05:00.000Z' }),
      order({ id: 'mid', orderNo: 4, startBy: '2026-11-03T10:15:00.000Z' }),
    ];
    expect(kitchenTickets(orders, NOW).map((o) => o.id)).toEqual(['early', 'mid', 'late']);
  });

  it('leaves out scheduled orders until they are active, unpaid transfers, Ready and Done', () => {
    const orders = [
      order({
        id: 'later',
        startBy: '2026-11-04T10:00:00.000Z',
        dueAt: '2026-11-04T10:20:00.000Z',
      }),
      order({ id: 'soon', startBy: '2026-11-03T11:00:00.000Z' }),
      order({ id: 'unpaid', paymentStatus: 'unpaid', paymentMethod: 'gcash' }),
      order({ id: 'cash', paymentStatus: 'unpaid', paymentMethod: 'cash' }),
      order({ id: 'ready', status: 'ready' }),
      order({ id: 'done', status: 'completed' }),
    ];
    expect(kitchenTickets(orders, NOW).map((o) => o.id)).toEqual(['cash']);
  });

  it('a scheduled order joins the wall once its start time arrives', () => {
    const scheduled = order({
      id: 'cake',
      scheduledAt: '2026-11-03T12:00:00.000Z',
      startBy: '2026-11-03T11:00:00.000Z',
      dueAt: '2026-11-03T12:00:00.000Z',
    });
    expect(kitchenTickets([scheduled], NOW)).toHaveLength(0);
    expect(kitchenTickets([scheduled], new Date('2026-11-03T11:00:00.000Z'))).toHaveLength(1);
  });

  it('filters by order type, and lists Ready orders for the bottom row', () => {
    const orders = [
      order({ id: 'p', type: 'pickup' }),
      order({ id: 'd', type: 'delivery' }),
      order({ id: 'r1', status: 'ready', dueAt: '2026-11-03T10:50:00.000Z' }),
      order({ id: 'r2', status: 'ready', dueAt: '2026-11-03T10:10:00.000Z' }),
    ];
    expect(kitchenTickets(orders, NOW, 'delivery').map((o) => o.id)).toEqual(['d']);
    expect(kitchenReady(orders).map((o) => o.id)).toEqual(['r2', 'r1']);
    expect(kitchenReady(orders, 'delivery')).toEqual([]);
  });

  it('names the view by shop kind', () => {
    expect(vocab('food').kitchenView).toBe('Kitchen view');
    expect(vocab('retail').kitchenView).toBe('Packing view');
  });
});

describe('O5 Kitchen view: line checks stay on this device', () => {
  it('toggles a line on and off', () => {
    const once = toggleKitchenCheck({}, 'ord_1', 2);
    expect(once).toEqual({ ord_1: [2] });
    const twice = toggleKitchenCheck(once, 'ord_1', 0);
    expect(twice).toEqual({ ord_1: [0, 2] });
    expect(toggleKitchenCheck(toggleKitchenCheck(twice, 'ord_1', 0), 'ord_1', 2)).toEqual({});
  });

  it('drops ticks for orders that left the wall', () => {
    const checks = { a: [0], b: [1, 2] };
    expect(pruneKitchenChecks(checks, new Set(['b']))).toEqual({ b: [1, 2] });
  });

  it('keeps ticks in device storage per shop, never anywhere else', () => {
    const map = new Map<string, string>();
    const storage = createDeviceStorage({
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
    });
    storage.kitchenChecks.write('kanto-smash', { ord_1: [0] });
    expect(storage.kitchenChecks.read('kanto-smash').value).toEqual({ ord_1: [0] });
    expect(storage.kitchenChecks.read('tala-apparel').value).toBeNull();
    expect([...map.keys()]).toEqual(['smartapp:kitchenChecks:kanto-smash']);
    expect(storage.kitchenTheme.read('all').value).toBeNull();
  });
});
