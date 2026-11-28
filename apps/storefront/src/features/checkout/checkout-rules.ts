import {
  closedShopWords,
  formatClock,
  formatPeso,
  isTransfer,
  lastOrderAt,
  normalisePhPhone,
  openState,
  openingWhen,
  pastLastOrder,
  paymentLabel,
  type OrderType,
  type PaymentMethod,
  type Quote,
  type QuoteProblem,
  type Storefront,
} from '@smartapp/core';
import { words } from '@smartapp/core';

export interface PaymentOption {
  // The shop account this option pays (T84); a shop can have up to three banks.
  accountId: string;
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
  // With two or more banks, each shows by its bank so the customer picks which (T84).
  const banks = sf.payments.filter((p) => p.method === 'bank').length;

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

    // QR Ph is paid by its QR alone: without one, the option is left out (T107).
    if (method === 'qr_ph' && !p.qr) {
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

    const label = banks > 1 ? paymentLabel(p) : words.shop.paymentMethod[method];

    results.push({
      accountId: p.id,
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
  /** The price check failed (network, server): nothing is placed on an unchecked total (T129). */
  quoteFailed?: boolean | undefined;
  submitting: boolean;
}

export interface PlaceOrderEligibilityResult {
  canPlace: boolean;
  reason: string | null;
  missingField: 'type' | 'name' | 'phone' | 'address' | 'zone' | 'payment' | 'basket' | null;
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
    quoteFailed = false,
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

  // Never a silent default: a shop with more than one way to order waits for the customer's pick.
  if (!orderType) {
    return { canPlace: false, reason: words.location.choose, missingField: 'type' };
  }

  const nextWhen = state.nextOpening ? openingWhen(state.nextOpening, now) : null;
  // Walk-in means ordering inside the shop now, so not while it is closed (T129). Tapping opens How and
  // where to choose Pickup or Delivery.
  if (state.state === 'closed' && orderType === 'walk_in') {
    const others = sf.orderTypes.some((t) => t !== 'walk_in');
    return {
      canPlace: false,
      reason:
        nextWhen && others
          ? closedShopWords.walkInClosedShort(nextWhen)
          : nextWhen
            ? words.shop.closedOpens(nextWhen)
            : words.shop.closedNoOpening,
      missingField: others ? 'type' : null,
    };
  }

  // An order for now needs the shop open with time to make it before closing (T129); otherwise tapping
  // opens How and where on a time.
  if (orderType !== 'walk_in' && !scheduledAt) {
    const last = lastOrderAt(sf, now);
    if (state.state === 'closed') {
      return {
        canPlace: false,
        reason: nextWhen ? closedShopWords.closedPickTime(nextWhen) : words.shop.closedNoOpening,
        missingField: nextWhen ? 'type' : null,
      };
    }
    if (last && pastLastOrder(sf, now)) {
      return {
        canPlace: false,
        reason: closedShopWords.lastOrdersDisabled(formatClock(last)),
        missingField: 'type',
      };
    }
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

  // A failed price check never counts as "no problems" (T129: the order went out on ₱0 lines).
  if (quoteFailed || !quote) {
    return { canPlace: false, reason: closedShopWords.priceCheckFailed, missingField: null };
  }

  // Every problem the price check found counts, not only the first (a transfer-only shop's first problem
  // can be the payment, hiding a minimum order behind it).
  for (const problem of quote?.problems ?? []) {
    const blocked = problemBlock(problem);
    if (blocked) return blocked;
  }

  return { canPlace: true, reason: null, missingField: null };
}

/** What one price-check problem says on the Place order button, or null when it does not block. */
export function problemBlock(problem: QuoteProblem): PlaceOrderEligibilityResult | null {
  switch (problem.code) {
    case 'cod_limit':
      return { canPlace: false, reason: words.checkout.codLimitReached, missingField: 'payment' };
    case 'payment_unavailable':
      return {
        canPlace: false,
        reason: words.errors.codes.payment_unavailable,
        missingField: 'payment',
      };
    case 'out_of_range':
      return { canPlace: false, reason: words.checkout.outOfRange, missingField: 'address' };
    case 'below_min_order':
      return {
        canPlace: false,
        reason: problem.amount
          ? words.shop.minOrder(formatPeso(problem.amount))
          : words.checkout.belowMinOrder,
        missingField: 'basket',
      };
    case 'zone_required':
      return { canPlace: false, reason: words.location.chooseArea, missingField: 'zone' };
    // A booked time the shop can't take: tapping opens the picker to pick another (T129).
    case 'slot_unavailable':
      return { canPlace: false, reason: closedShopWords.slotNotOpen, missingField: 'type' };
    case 'slot_full':
      return { canPlace: false, reason: closedShopWords.slotFull, missingField: 'type' };
    case 'fulfillment_unavailable':
      return {
        canPlace: false,
        reason: words.errors.codes.fulfillment_unavailable,
        missingField: 'type',
      };
    case 'reward_unavailable':
      return {
        canPlace: false,
        reason: words.errors.codes.reward_unavailable,
        missingField: null,
      };
    case 'shop_closed':
    case 'shop_busy':
    case 'shop_paused':
      return { canPlace: false, reason: words.shop.notTakingOrders, missingField: null };
    case 'empty_basket':
      return { canPlace: false, reason: null, missingField: 'basket' };
  }
}

/** Generates a safe idempotency key for client-side retries. */
export function generateClientKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `clk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
