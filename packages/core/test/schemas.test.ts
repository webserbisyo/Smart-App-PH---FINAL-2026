import { describe, expect, it } from 'vitest';
import { BasketSchema } from '../src/schemas/basket.js';
import { OrderPayloadSchema, OrderReceiptSchema, QuoteSchema } from '../src/schemas/order.js';
import { MemberAccountSchema, RewardClaimSchema } from '../src/schemas/loyalty.js';
import { ErrorCode, errorWords } from '../src/errors.js';

const payload = {
  type: 'pickup',
  scheduledAt: null,
  lines: [
    {
      itemId: 'ks-classic-smash',
      variantId: 'ks-classic-smash--single',
      optionIds: [],
      note: '',
      qty: 1,
    },
  ],
  customer: { name: 'Juan dela Cruz', phone: '0917 000 1234', email: null },
  delivery: null,
  paymentMethod: 'gcash',
  note: null,
  useReward: false,
};

describe('schemas', () => {
  it('a valid order payload parses', () => {
    expect(OrderPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it('an order payload with a price field fails (the server prices orders)', () => {
    expect(OrderPayloadSchema.safeParse({ ...payload, total: 100 }).success).toBe(false);
    const withLinePrice = { ...payload, lines: [{ ...payload.lines[0], price: 14900 }] };
    expect(OrderPayloadSchema.safeParse(withLinePrice).success).toBe(false);
  });

  it('a basket line note over 120 characters fails', () => {
    const basket = {
      slug: 'kanto-smash',
      version: 1,
      lines: [{ ...payload.lines[0], note: 'x'.repeat(121) }],
    };
    expect(BasketSchema.safeParse(basket).success).toBe(false);
  });

  it('a quote, receipt, member account and claim parse', () => {
    const openState = {
      state: 'open',
      closesAt: '2026-10-26T14:00:00.000Z',
      nextOpening: null,
      busyUntil: null,
      paused: false,
    };
    expect(
      QuoteSchema.safeParse({
        subtotal: 14900,
        discount: 0,
        deliveryFee: 0,
        total: 14900,
        lines: [],
        distanceM: null,
        slots: ['2026-10-26T04:30:00.000Z'],
        openState,
        readyEstimate: null,
        problems: [{ code: 'cod_limit', amount: 300000, km: null }],
      }).success,
    ).toBe(true);
    const line = {
      name: 'Classic Smash',
      variantLabel: 'Single',
      optionLabels: [],
      note: '',
      qty: 1,
      unitPrice: 14900,
      lineTotal: 14900,
      itemId: 'ks-classic-smash',
      variantId: 'ks-classic-smash--single',
      optionIds: [],
    };
    expect(
      OrderReceiptSchema.safeParse({
        slug: 'kanto-smash',
        orderNo: 42,
        token: 'demo-placed-transfer',
        type: 'pickup',
        status: 'placed',
        paymentStatus: 'unpaid',
        paymentMethod: 'gcash',
        placedAt: '2026-10-26T04:00:00.000Z',
        scheduledAt: null,
        customerName: 'Juan',
        deliveryAddress: null,
        events: [{ status: 'placed', at: '2026-10-26T04:00:00.000Z' }],
        messages: [],
        lines: [line],
        totals: { subtotal: 14900, discount: 0, deliveryFee: 0, total: 14900 },
        rewardTitle: null,
        payment: {
          method: 'gcash',
          accountName: 'Paolo R.',
          accountNumber: '0917 000 0001',
          qr: null,
          amount: 14900,
        },
        rider: null,
        trackingUrl: null,
        refund: null,
        rating: null,
        cancelReason: null,
        expiresAt: '2026-10-26T04:30:00.000Z',
        note: null,
      }).success,
    ).toBe(true);
    expect(
      MemberAccountSchema.safeParse({
        name: 'Juan dela Cruz',
        phone: '+639170001234',
        email: 'juan@example.com',
        balance: 3,
        pendingStamps: 1,
        rewardReady: false,
        memberCode: 'KS-4821',
        joinedAt: '2026-10-20T04:00:00.000Z',
        history: [
          {
            kind: 'welcome',
            delta: 1,
            reasonCategory: null,
            orderNo: null,
            at: '2026-10-20T04:00:00.000Z',
          },
        ],
        claims: [],
      }).success,
    ).toBe(true);
    expect(
      RewardClaimSchema.safeParse({
        code: 'TL-0042',
        status: 'pending',
        qrUrl: 'https://app.webserbisyo.com/claims/TL-0042',
        title: 'Kislap Limited Edition Tee',
        createdAt: '2026-10-26T04:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('every error code has words', () => {
    for (const code of ErrorCode) expect(errorWords(code).length, code).toBeGreaterThan(10);
  });
});
