import { describe, expect, it } from 'vitest';
import {
  closedShopWords,
  formatPeso,
  normalisePhPhone,
  words,
  SHOP_PACKS,
  PaymentAccountSchema,
  type PaymentAccount,
  type PaymentMethod,
  type PhBank,
} from '@smartapp/core';
import { checkPlaceOrderEligibility, problemBlock, resolvePaymentOptions } from './checkout-rules';

function makePayment(
  method: PaymentMethod,
  accountName: string | null = null,
  accountNumber: string | null = null,
  bank: PhBank | null = method === 'bank' ? 'bdo' : null,
  id = `pay-${method}`,
): PaymentAccount {
  return PaymentAccountSchema.parse({
    id,
    method,
    bank,
    accountName,
    accountNumber,
    qr: null,
    sample: false,
  });
}

describe('normalisePhPhone', () => {
  it('normalises valid Philippine numbers in various formats', () => {
    expect(normalisePhPhone('09171234567')).toEqual({ ok: true, e164: '+639171234567' });
    expect(normalisePhPhone('9171234567')).toEqual({ ok: true, e164: '+639171234567' });
    expect(normalisePhPhone('+639171234567')).toEqual({ ok: true, e164: '+639171234567' });
    expect(normalisePhPhone('639171234567')).toEqual({ ok: true, e164: '+639171234567' });
    expect(normalisePhPhone('0917-123-4567')).toEqual({ ok: true, e164: '+639171234567' });
    expect(normalisePhPhone('0917 123 4567')).toEqual({ ok: true, e164: '+639171234567' });
    expect(normalisePhPhone('(0917) 123-4567')).toEqual({ ok: true, e164: '+639171234567' });
  });

  it('rejects invalid inputs', () => {
    expect(normalisePhPhone('')).toEqual({ ok: false, problem: 'invalid' });
    expect(normalisePhPhone('123456')).toEqual({ ok: false, problem: 'invalid' });
    expect(normalisePhPhone('08171234567')).toEqual({ ok: false, problem: 'invalid' });
    expect(normalisePhPhone('091712345678')).toEqual({ ok: false, problem: 'invalid' });
    expect(normalisePhPhone('phone123456')).toEqual({ ok: false, problem: 'invalid' });
  });
});

describe('resolvePaymentOptions', () => {
  const sampleSf = {
    codMaxTotal: 300_000, // ₱3,000
    payments: [
      makePayment('cash'),
      makePayment('cod'),
      makePayment('gcash', 'Juan Dela Cruz', '09171234567'),
      makePayment('maya', 'Juan Dela Cruz', '09171234567'),
      makePayment('bank', 'Kanto Smash Corp', '1234-5678-90'),
    ],
  };

  it('filters cash for delivery, filters cod for pickup/walk-in', () => {
    const pickupOpts = resolvePaymentOptions(sampleSf, 'pickup', 100_000);
    const pickupMethods = pickupOpts.map((o) => o.method);
    expect(pickupMethods).toContain('cash');
    expect(pickupMethods).not.toContain('cod');
    expect(pickupMethods).toContain('gcash');

    const deliveryOpts = resolvePaymentOptions(sampleSf, 'delivery', 100_000);
    const deliveryMethods = deliveryOpts.map((o) => o.method);
    expect(deliveryMethods).not.toContain('cash');
    expect(deliveryMethods).toContain('cod');
    expect(deliveryMethods).toContain('gcash');
  });

  it('disables COD when total exceeds COD limit with friendly alert message', () => {
    const underLimit = resolvePaymentOptions(sampleSf, 'delivery', 250_000);
    const codUnder = underLimit.find((o) => o.method === 'cod');
    expect(codUnder?.disabled).toBe(false);
    expect(codUnder?.disabledReason).toBeNull();

    const overLimit = resolvePaymentOptions(sampleSf, 'delivery', 350_000);
    const codOver = overLimit.find((o) => o.method === 'cod');
    expect(codOver?.disabled).toBe(true);
    expect(codOver?.disabledReason).toBe('Orders above ₱3,000 need payment first');
  });

  it('assigns Recommended badge only to the first transfer method', () => {
    const opts = resolvePaymentOptions(sampleSf, 'delivery', 100_000);
    const gcash = opts.find((o) => o.method === 'gcash');
    const maya = opts.find((o) => o.method === 'maya');
    const bank = opts.find((o) => o.method === 'bank');

    expect(gcash?.isRecommended).toBe(true);
    expect(maya?.isRecommended).toBe(false);
    expect(bank?.isRecommended).toBe(false);
  });

  it('shows one bank as Bank transfer, and each bank by name when there are two or more (T84)', () => {
    const one = resolvePaymentOptions(sampleSf, 'pickup', 100_000).find((o) => o.method === 'bank');
    expect(one?.label).toBe('Bank transfer');
    expect(one?.accountId).toBe('pay-bank');

    const twoBanks = {
      ...sampleSf,
      payments: [
        ...sampleSf.payments,
        makePayment('bank', 'Juan Dela Cruz', '0000 1111 22', 'bpi', 'pay-bpi'),
      ],
    };
    const banks = resolvePaymentOptions(twoBanks, 'pickup', 100_000).filter(
      (o) => o.method === 'bank',
    );
    expect(banks.map((o) => [o.accountId, o.label])).toEqual([
      ['pay-bank', 'BDO'],
      ['pay-bpi', 'BPI'],
    ]);
  });
});

describe('checkPlaceOrderEligibility', () => {
  const baseSf = SHOP_PACKS['kanto-smash'].storefront;

  const validNow = '2026-10-25T10:00:00.000Z'; // 6 PM Manila (open)

  const defaultInput: Parameters<typeof checkPlaceOrderEligibility>[0] = {
    online: true,
    sf: baseSf,
    now: validNow,
    linesCount: 2,
    flaggedCount: 0,
    orderType: 'pickup',
    scheduledAt: null,
    name: 'Juan dela Cruz',
    phone: '09171234567',
    addressLine: '',
    spot: null,
    zoneId: null,
    paymentMethod: 'cash',
    quote: {
      subtotal: 30000,
      discount: 0,
      deliveryFee: 0,
      total: 30000,
      lines: [],
      distanceM: null,
      slots: [],
      openState: {
        state: 'open',
        closesAt: null,
        nextOpening: null,
        busyUntil: null,
        paused: false,
      },
      readyEstimate: null,
      problems: [],
    },
    quoteLoading: false,
    submitting: false,
  };

  it('waits for the order type when none is picked', () => {
    const res = checkPlaceOrderEligibility({ ...defaultInput, orderType: null });
    expect(res.canPlace).toBe(false);
    expect(res.missingField).toBe('type');
  });

  it('allows placing order when all fields are valid', () => {
    const res = checkPlaceOrderEligibility(defaultInput);
    expect(res.canPlace).toBe(true);
    expect(res.reason).toBeNull();
  });

  it('blocks when offline', () => {
    const res = checkPlaceOrderEligibility({ ...defaultInput, online: false });
    expect(res.canPlace).toBe(false);
    expect(res.reason).toBe(words.checkout.offlineDisabled);
  });

  it('blocks when basket is empty or has flagged lines', () => {
    const emptyRes = checkPlaceOrderEligibility({ ...defaultInput, linesCount: 0 });
    expect(emptyRes.canPlace).toBe(false);

    const flaggedRes = checkPlaceOrderEligibility({ ...defaultInput, flaggedCount: 1 });
    expect(flaggedRes.canPlace).toBe(false);
    expect(flaggedRes.reason).toBe(words.checkout.fixBasketDisabled(1));
  });

  it('validates customer details', () => {
    const noName = checkPlaceOrderEligibility({ ...defaultInput, name: '  ' });
    expect(noName.canPlace).toBe(false);
    expect(noName.missingField).toBe('name');

    const invalidPhone = checkPlaceOrderEligibility({ ...defaultInput, phone: '0911' });
    expect(invalidPhone.canPlace).toBe(false);
    expect(invalidPhone.missingField).toBe('phone');
  });

  it('validates delivery address and area when type is delivery', () => {
    const deliveryInput: Parameters<typeof checkPlaceOrderEligibility>[0] = {
      ...defaultInput,
      orderType: 'delivery',
      paymentMethod: 'cod',
      addressLine: '',
    };
    const noAddress = checkPlaceOrderEligibility(deliveryInput);
    expect(noAddress.canPlace).toBe(false);
    expect(noAddress.missingField).toBe('address');

    const withAddressNoZone = checkPlaceOrderEligibility({
      ...deliveryInput,
      addressLine: '123 Main St',
      zoneId: null,
      spot: null,
    });
    expect(withAddressNoZone.canPlace).toBe(false);
    expect(withAddressNoZone.missingField).toBe('zone');
  });

  // T129: ordering at Lola Remy at 1:30 AM went through as a walk-in and jammed.
  describe('while the shop is closed (T129)', () => {
    const lola = SHOP_PACKS['lola-remy'].storefront;
    const at130 = '2026-11-30T17:30:00.000Z'; // Tue 1 Dec 1:30 AM Manila
    const closed = { ...defaultInput, sf: lola, now: at130 };

    it('walk-in waits for the shop to open and asks for Pickup or Delivery', () => {
      const res = checkPlaceOrderEligibility({ ...closed, orderType: 'walk_in' });
      expect(res.canPlace).toBe(false);
      expect(res.reason).toBe(closedShopWords.walkInClosedShort('5 AM'));
      expect(res.missingField).toBe('type');
    });

    it('an order for now asks for a time', () => {
      const res = checkPlaceOrderEligibility({ ...closed, orderType: 'pickup', scheduledAt: null });
      expect(res.canPlace).toBe(false);
      expect(res.reason).toBe(closedShopWords.closedPickTime('5 AM'));
      expect(res.missingField).toBe('type');
    });

    it('a booked time goes through', () => {
      const res = checkPlaceOrderEligibility({
        ...closed,
        orderType: 'pickup',
        scheduledAt: '2026-11-30T22:00:00.000Z',
      });
      expect(res.canPlace).toBe(true);
    });

    it('after last orders an order for now asks for a time', () => {
      const res = checkPlaceOrderEligibility({
        ...closed,
        now: '2026-12-01T11:50:00.000Z', // 7:50 PM Manila, last orders 7:40 PM
        orderType: 'pickup',
        scheduledAt: null,
      });
      expect(res.canPlace).toBe(false);
      expect(res.reason).toBe(closedShopWords.lastOrdersDisabled('7:40 PM'));
      expect(res.missingField).toBe('type');
    });
  });

  it('a failed price check never places (T129: lines went out at ₱0)', () => {
    const failed = checkPlaceOrderEligibility({ ...defaultInput, quote: null, quoteFailed: true });
    expect(failed.canPlace).toBe(false);
    expect(failed.reason).toBe(closedShopWords.priceCheckFailed);
    const missing = checkPlaceOrderEligibility({ ...defaultInput, quote: null });
    expect(missing.canPlace).toBe(false);
  });
});

describe('problemBlock', () => {
  const at = (code: Parameters<typeof problemBlock>[0]['code'], amount: number | null = null) =>
    problemBlock({ code, amount, km: null });

  it('blocks on a way to pay the shop does not take (it no longer falls through)', () => {
    expect(at('payment_unavailable')).toEqual({
      canPlace: false,
      reason: words.errors.codes.payment_unavailable,
      missingField: 'payment',
    });
  });

  it('words the minimum order with its amount', () => {
    expect(at('below_min_order', 20_000)?.missingField).toBe('basket');
    expect(at('below_min_order', 20_000)?.reason).toBe(words.shop.minOrder(formatPeso(20_000)));
  });

  it('a time the shop cannot take says full or not open, and opens the picker', () => {
    expect(at('slot_full')).toEqual({
      canPlace: false,
      reason: closedShopWords.slotFull,
      missingField: 'type',
    });
    expect(at('slot_unavailable')?.reason).toBe(closedShopWords.slotNotOpen);
  });

  it('blocks a reward or order type the shop cannot take', () => {
    expect(at('reward_unavailable')?.canPlace).toBe(false);
    expect(at('fulfillment_unavailable')?.missingField).toBe('type');
  });
});
