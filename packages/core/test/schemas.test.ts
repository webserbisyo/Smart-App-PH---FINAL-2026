import { describe, expect, it } from 'vitest';
import { BasketSchema } from '../src/schemas/basket.js';
import { OrderPayloadSchema, OrderReceiptSchema, QuoteSchema } from '../src/schemas/order.js';
import { MemberAccountSchema, RewardClaimSchema } from '../src/schemas/loyalty.js';
import { BookingRulesSchema } from '../src/schemas/storefront.js';
import { BoardOrderSchema } from '../src/schemas/owner-orders.js';
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
        dueAt: '2026-10-26T04:20:00.000Z',
        startBy: '2026-10-26T04:00:00.000Z',
        pickupCode: 'ABCD',
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

  it('booking rules schema enforces 15, 30, 60 slot lengths', () => {
    const rest = { prepMinutes: 20, takeOrdersWhileClosed: true };
    expect(
      BookingRulesSchema.safeParse({ daysAhead: 7, slotMinutes: 15, ordersPerSlot: 4, ...rest })
        .success,
    ).toBe(true);
    expect(
      BookingRulesSchema.safeParse({ daysAhead: 7, slotMinutes: 30, ordersPerSlot: null, ...rest })
        .success,
    ).toBe(true);
    expect(
      BookingRulesSchema.safeParse({ daysAhead: 7, slotMinutes: 60, ordersPerSlot: 10, ...rest })
        .success,
    ).toBe(true);
    // 20 is not a valid slotMinutes length
    expect(
      BookingRulesSchema.safeParse({ daysAhead: 7, slotMinutes: 20, ordersPerSlot: 4, ...rest })
        .success,
    ).toBe(false);
  });

  it('board order schema enforces at most 8 ticket lines', () => {
    const validBoardOrder = {
      id: 'ks-o-1',
      token: 'demo-placed-transfer',
      orderNo: 42,
      type: 'pickup',
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: 'gcash',
      scheduledAt: null,
      placedAt: '2026-10-26T04:00:00.000Z',
      customerName: 'Juan',
      isFirstOrder: true,
      isMember: false,
      hasReward: false,
      itemsSummary: '1 × Classic Smash',
      total: 14900,
      dueAt: '2026-10-26T04:20:00.000Z',
      startBy: '2026-10-26T04:00:00.000Z',
      pickupCode: 'ABCD',
      seenAt: null,
      lines: Array.from({ length: 8 }, (_, i) => ({
        qty: 1,
        name: `Item ${i + 1}`,
        variantLabel: null,
        optionLabels: [],
        note: null,
        photo: null,
      })),
      moreLines: 0,
      note: null,
      ownerNote: null,
      deliveryArea: null,
      lastStepAt: '2026-10-26T04:00:00.000Z',
      expiresAt: null,
      memberStamps: null,
    };
    expect(BoardOrderSchema.safeParse(validBoardOrder).success).toBe(true);

    // 9 lines fails
    const invalidBoardOrder = {
      ...validBoardOrder,
      lines: Array.from({ length: 9 }, (_, i) => ({
        qty: 1,
        name: `Item ${i + 1}`,
        variantLabel: null,
        optionLabels: [],
        note: null,
        photo: null,
      })),
    };
    expect(BoardOrderSchema.safeParse(invalidBoardOrder).success).toBe(false);
  });

  it('every error code has words', () => {
    for (const code of ErrorCode) expect(errorWords(code).length, code).toBeGreaterThan(10);
  });
});
