import { describe, expect, it } from 'vitest';
import type { OrderRow } from '@smartapp/core';
import { mergeOrderRows, nextStep, pickTab, splitOrders } from './orders-rules';

function row(over: Partial<OrderRow>): OrderRow {
  return {
    slug: 'kanto-smash',
    token: 'token-0001',
    orderNo: 42,
    type: 'pickup',
    status: 'placed',
    paymentStatus: 'unpaid',
    total: 34500,
    placedAt: '2026-10-25T04:00:00.000Z',
    scheduledAt: null,
    itemCount: 2,
    summary: '2 × Classic Smash',
    photos: [],
    paymentMethod: 'cash',
    expiresAt: null,
    ratingStars: null,
    ...over,
  };
}

describe('mergeOrderRows', () => {
  it('keeps one row per order, the server copy first, newest first', () => {
    const saved = [
      row({ token: 'aaaaaaaa', status: 'placed', placedAt: '2026-10-25T01:00:00.000Z' }),
      row({ token: 'bbbbbbbb', placedAt: '2026-10-25T03:00:00.000Z' }),
    ];
    const server = [
      row({ token: 'aaaaaaaa', status: 'completed', placedAt: '2026-10-25T01:00:00.000Z' }),
      row({ token: 'cccccccc', placedAt: '2026-10-25T02:00:00.000Z' }),
    ];
    const merged = mergeOrderRows(server, saved);
    expect(merged.map((r) => r.token)).toEqual(['bbbbbbbb', 'cccccccc', 'aaaaaaaa']);
    expect(merged.find((r) => r.token === 'aaaaaaaa')?.status).toBe('completed');
  });

  it('shows the saved rows when the server has none', () => {
    expect(mergeOrderRows(undefined, [row({})])).toHaveLength(1);
  });
});

describe('splitOrders and pickTab', () => {
  it('puts ended orders under Past and opens Past when nothing is active', () => {
    const { active, past } = splitOrders([
      row({ token: 'aaaaaaaa', status: 'ready' }),
      row({ token: 'bbbbbbbb', status: 'expired' }),
      row({ token: 'cccccccc', status: 'completed' }),
    ]);
    expect(active).toHaveLength(1);
    expect(past).toHaveLength(2);
    expect(pickTab(null, 0)).toBe('past');
    expect(pickTab(null, 1)).toBe('active');
    expect(pickTab('past', 3)).toBe('past');
    expect(pickTab('nope', 0)).toBe('past');
  });
});

describe('nextStep', () => {
  const now = '2026-10-25T04:00:00.000Z';

  it('asks for payment with the minutes left on an unpaid transfer', () => {
    const r = row({ paymentMethod: 'gcash', expiresAt: '2026-10-25T04:18:20.000Z' });
    expect(nextStep(r, 'food', now)).toBe('Pay within 19 min, then upload your proof');
    expect(nextStep(r, 'food', null)).toBe('Upload your proof of payment');
  });

  it('words every other state', () => {
    expect(nextStep(row({ paymentMethod: 'gcash', paymentStatus: 'pending' }), 'food', now)).toBe(
      'Waiting for the shop to check your payment',
    );
    expect(nextStep(row({}), 'food', now)).toBe('Sent to the shop. They will start it soon.');
    expect(nextStep(row({ status: 'preparing' }), 'food', now)).toBe('Your order is being made');
    expect(nextStep(row({ status: 'preparing' }), 'retail', now)).toBe(
      'Your order is being packed',
    );
    expect(nextStep(row({ status: 'ready' }), 'food', now)).toBe('Ready for pickup');
    expect(nextStep(row({ status: 'out_for_delivery', type: 'delivery' }), 'food', now)).toBe(
      'Rider on the way',
    );
    expect(nextStep(row({ status: 'completed' }), 'food', now)).toBeNull();
  });
});
