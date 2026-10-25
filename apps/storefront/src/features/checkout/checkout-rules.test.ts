import { describe, expect, it } from 'vitest';
import {
  normalisePhPhone,
  words,
  SHOP_PACKS,
  PaymentAccountSchema,
  type PaymentAccount,
  type PaymentMethod,
} from '@smartapp/core';
import { checkPlaceOrderEligibility, resolvePaymentOptions } from './checkout-rules';

function makePayment(
  method: PaymentMethod,
  accountName: string | null = null,
  accountNumber: string | null = null,
): PaymentAccount {
  return PaymentAccountSchema.parse({
    method,
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
});
