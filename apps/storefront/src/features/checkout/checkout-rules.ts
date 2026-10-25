import {
  formatPeso,
  isTransfer,
  normalisePhPhone,
  openState,
  openingWhen,
  type OrderType,
  type PaymentMethod,
  type Quote,
  type Storefront,
} from '@smartapp/core';
import { words } from '@smartapp/core';

export interface PaymentOption {
  method: PaymentMethod;
  label: string;
  disabled: boolean;
  disabledReason: string | null;
  isRecommended: boolean;
  accountName?: string | null | undefined;
  accountNumber?: string | null | undefined;
  qrPhoto?: string | null | undefined;
}

/**
 * Resolves available payment methods based on:
 * - Order type: cash (walk-in, pickup), COD (delivery only), transfers (all).
 * - COD limit: over limit disables COD with alert message.
 * - Recommended badge: on the shop's first configured transfer method.
 */
export function resolvePaymentOptions(
  sf: Pick<Storefront, 'payments' | 'codMaxTotal'>,
  type: OrderType,
  totalCentavos: number,
): PaymentOption[] {
  let firstTransferSeen = false;

  const results: PaymentOption[] = [];

  for (const p of sf.payments) {
    const { method } = p;
    const isCod = method === 'cod';
    const isCash = method === 'cash';
    const transfer = isTransfer(method);

    // Cash is only for walk-in and pickup
    if (isCash && type === 'delivery') {
      continue;
    }

    // COD is only for delivery
    if (isCod && type !== 'delivery') {
      continue;
    }

    let disabled = false;
    let disabledReason: string | null = null;

    if (isCod && sf.codMaxTotal !== null && totalCentavos > sf.codMaxTotal) {
      disabled = true;
      disabledReason = words.checkout.codLimitAlert(formatPeso(sf.codMaxTotal));
    }

    let isRecommended = false;
    if (transfer && !firstTransferSeen) {
      firstTransferSeen = true;
      isRecommended = true;
    }

    const label = words.shop.paymentMethod[method];

    results.push({
      method,
      label,
      disabled,
      disabledReason,
      isRecommended,
      accountName: p.accountName,
      accountNumber: p.accountNumber,
      qrPhoto: p.qr,
    });
  }

  return results;
}

export interface PlaceOrderEligibilityInput {
  online: boolean;
  sf: Storefront;
  now: string | Date;
  linesCount: number;
  flaggedCount: number;
  orderType: OrderType | null;
  scheduledAt: string | null;
  name: string;
  phone: string;
  addressLine: string;
  spot: { lat: number; lng: number } | null;
  zoneId: string | null;
  paymentMethod: PaymentMethod | null;
  quote: Quote | null | undefined;
  quoteLoading: boolean;
  submitting: boolean;
}

export interface PlaceOrderEligibilityResult {
  canPlace: boolean;
  reason: string | null;
  missingField: 'name' | 'phone' | 'address' | 'zone' | 'payment' | 'basket' | null;
}

/**
 * Checks if Place Order can be clicked and computes the exact reason if disabled.
 */
export function checkPlaceOrderEligibility(
  input: PlaceOrderEligibilityInput,
): PlaceOrderEligibilityResult {
  const {
    online,
    sf,
    now,
    linesCount,
    flaggedCount,
    orderType,
    scheduledAt,
    name,
    phone,
    addressLine,
    spot,
    zoneId,
    paymentMethod,
    quote,
    quoteLoading,
    submitting,
  } = input;

  if (submitting) {
    return { canPlace: false, reason: null, missingField: null };
  }

  if (!online) {
    return { canPlace: false, reason: words.checkout.offlineDisabled, missingField: null };
  }

  if (linesCount === 0) {
    return { canPlace: false, reason: words.basket.empty, missingField: 'basket' };
  }

  if (flaggedCount > 0) {
    return {
      canPlace: false,
      reason: words.checkout.fixBasketDisabled(flaggedCount),
      missingField: 'basket',
    };
  }

  const state = openState(sf, now);
  if (state.paused) {
    return { canPlace: false, reason: words.shop.notTakingOrders, missingField: null };
  }

  if (state.state === 'closed' && !scheduledAt && orderType !== 'walk_in') {
    const nextWhen = state.nextOpening ? openingWhen(state.nextOpening, now) : null;
    return {
      canPlace: false,
      reason: nextWhen ? words.checkout.closedDisabled(nextWhen) : words.shop.notTakingOrders,
      missingField: null,
    };
  }

  if (!name.trim()) {
    return { canPlace: false, reason: words.checkout.enterName, missingField: 'name' };
  }

  const phoneRes = normalisePhPhone(phone);
  if (!phoneRes.ok) {
    return { canPlace: false, reason: words.checkout.enterPhone, missingField: 'phone' };
  }

  if (orderType === 'delivery') {
    if (!addressLine.trim()) {
      return { canPlace: false, reason: words.checkout.enterAddress, missingField: 'address' };
    }
    if (!spot && !zoneId && sf.delivery.zones.length > 0) {
      return { canPlace: false, reason: words.location.chooseArea, missingField: 'zone' };
    }
  }

  if (!paymentMethod) {
    return { canPlace: false, reason: words.checkout.choosePayment, missingField: 'payment' };
  }

  if (quoteLoading && !quote) {
    return { canPlace: false, reason: null, missingField: null };
  }

  if (quote?.problems && quote.problems.length > 0) {
    const first = quote.problems[0];
    if (first) {
      switch (first.code) {
        case 'cod_limit':
          return {
            canPlace: false,
            reason: words.checkout.codLimitReached,
            missingField: 'payment',
          };
        case 'out_of_range':
          return { canPlace: false, reason: words.checkout.outOfRange, missingField: 'address' };
        case 'below_min_order':
          return {
            canPlace: false,
            reason: first.amount
              ? words.shop.minOrder(formatPeso(first.amount))
              : words.checkout.belowMinOrder,
            missingField: 'basket',
          };
        case 'zone_required':
          return { canPlace: false, reason: words.location.chooseArea, missingField: 'zone' };
        case 'slot_unavailable':
          return { canPlace: false, reason: words.checkout.pickupTimeInvalid, missingField: null };
        case 'shop_closed':
        case 'shop_busy':
        case 'shop_paused':
          return { canPlace: false, reason: words.shop.notTakingOrders, missingField: null };
        default:
          break;
      }
    }
  }

  return { canPlace: true, reason: null, missingField: null };
}

/** Generates a safe idempotency key for client-side retries. */
export function generateClientKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `clk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
