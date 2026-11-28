import {
  closedShopWords,
  earnsStamp,
  formatClock,
  formatPeso,
  lastOrderAt,
  openingWhen,
  pastLastOrder,
  slotLabel,
  words,
  type LineProblem,
  type OpenState,
  type PublicShop,
  type PublicStampCard,
} from '@smartapp/core';

export function lineProblemMessage(
  problem: LineProblem,
  oldPrice?: number,
  newPrice?: number,
): string {
  switch (problem.code) {
    case 'item_missing':
      return words.shop.lineProblem.item_missing;
    case 'variant_missing':
      return words.shop.lineProblem.variant_missing;
    case 'sold_out':
      return words.shop.lineProblem.sold_out;
    case 'sold_out_today':
      return words.shop.lineProblem.sold_out_today;
    case 'option_missing':
      return words.shop.lineProblem.option_missing;
    case 'option_sold_out':
      return problem.groupName
        ? words.shop.lineProblem.option_sold_out(problem.groupName)
        : 'One choice is sold out';
    case 'required_missing':
      return problem.groupName
        ? words.shop.lineProblem.required_missing(problem.groupName)
        : 'Required choice missing';
    case 'too_few':
      return problem.groupName
        ? words.shop.lineProblem.too_few(problem.groupName)
        : 'Choose more options';
    case 'too_many':
      return problem.groupName
        ? words.shop.lineProblem.too_many(problem.groupName)
        : 'Too many options chosen';
    case 'price_changed':
      if (oldPrice !== undefined && newPrice !== undefined) {
        return words.basket.priceChangedWithAmounts(formatPeso(oldPrice), formatPeso(newPrice));
      }
      return words.shop.lineProblem.price_changed;
    case 'note_too_long':
      return words.shop.lineProblem.note_too_long;
    default:
      return words.shop.notAvailable;
  }
}

export function isFixableProblem(problem: LineProblem): boolean {
  return (
    problem.code === 'required_missing' ||
    problem.code === 'too_few' ||
    problem.code === 'too_many' ||
    problem.code === 'option_missing' ||
    problem.code === 'variant_missing' ||
    problem.code === 'option_sold_out' ||
    problem.code === 'price_changed'
  );
}

/** The first way to order that can be booked for later (pickup, then delivery), or null. */
export function bookableTypeOf(
  types: readonly PublicShop['storefront']['orderTypes'][number][],
): 'pickup' | 'delivery' | null {
  if (types.includes('pickup')) return 'pickup';
  if (types.includes('delivery')) return 'delivery';
  return null;
}

export interface ClosedStateDecision {
  state: 'open' | 'closed_with_scheduling' | 'closed_no_scheduling' | 'busy' | 'paused' | 'offline';
  alertMessage: string | null;
  buttonLabel: string;
  buttonDisabled: boolean;
  buttonReason: string | null;
  scheduleSlot: string | null;
}

export function closedStateDecision({
  sf,
  openState: state,
  isOnline,
  now,
  earliest = null,
}: {
  sf: PublicShop['storefront'];
  openState: OpenState;
  isOnline: boolean;
  now: Date | string;
  /**
   * The first time the basket can be booked, from the shop's schedule (its own slot length, notice days,
   * limits): the same rule the order check uses (T129). It used to come from 15-minute steps, so the
   * button offered "5:30 AM" at a shop that books on the hour and the order jammed.
   */
  earliest?: string | null | undefined;
}): ClosedStateDecision {
  if (!isOnline) {
    return {
      state: 'offline',
      alertMessage: words.basket.offlineSaved,
      buttonLabel: words.basket.goToCheckout,
      buttonDisabled: true,
      buttonReason: words.basket.offlineSaved,
      scheduleSlot: null,
    };
  }

  if (state.paused) {
    return {
      state: 'paused',
      alertMessage: words.basket.notTakingOrders,
      buttonLabel: words.basket.goToCheckout,
      buttonDisabled: true,
      buttonReason: words.basket.notTakingOrders,
      scheduleSlot: null,
    };
  }

  if (state.state === 'busy') {
    const busyTime = state.busyUntil ? formatClock(state.busyUntil) : null;
    const msg = busyTime ? words.shop.busyBack(busyTime) : words.basket.notTakingOrders;
    return {
      state: 'busy',
      alertMessage: msg,
      buttonLabel: words.basket.goToCheckout,
      buttonDisabled: false,
      buttonReason: null,
      scheduleSlot: null,
    };
  }

  // Open, but past the last order for now (closing minus prep, T129): book a time instead.
  const last = lastOrderAt(sf, now);
  const lastText =
    state.state === 'open' && last && pastLastOrder(sf, now) ? formatClock(last) : null;

  if (state.state === 'closed' || lastText) {
    const when = state.nextOpening ? openingWhen(state.nextOpening, now) : null;
    const saved = lastText
      ? closedShopWords.lastOrdersSaved(lastText)
      : when
        ? words.basket.closedSaved(when)
        : words.shop.closedNoOpening;
    if (earliest) {
      return {
        state: 'closed_with_scheduling',
        alertMessage: saved,
        buttonLabel: words.basket.scheduleFor(slotLabel(earliest, now)),
        buttonDisabled: false,
        buttonReason: null,
        scheduleSlot: earliest,
      };
    }
    // Not taking bookings while closed, or nothing left to book.
    const msg = lastText
      ? closedShopWords.lastOrdersSaved(lastText)
      : when
        ? words.basket.opensSaved(when)
        : words.shop.closedNoOpening;
    return {
      state: 'closed_no_scheduling',
      alertMessage: msg,
      buttonLabel: words.basket.goToCheckout,
      buttonDisabled: true,
      buttonReason: msg,
      scheduleSlot: null,
    };
  }

  return {
    state: 'open',
    alertMessage: null,
    buttonLabel: words.basket.goToCheckout,
    buttonDisabled: false,
    buttonReason: null,
    scheduleSlot: null,
  };
}

export interface StampProgressDecision {
  earns: boolean;
  text: string;
}

export function stampProgressDecision(
  stampCard: PublicStampCard,
  subtotal: number,
  earnedToday = 0,
): StampProgressDecision | null {
  if (stampCard.status !== 'on') return null;

  const check = earnsStamp(stampCard.rule, subtotal, earnedToday);
  if (check.earns) {
    return {
      earns: true,
      text: words.basket.earnsStamp,
    };
  }

  if (check.reason === 'cap_reached') {
    return {
      earns: false,
      text: words.basket.alreadyEarnedToday,
    };
  }

  const diff = Math.max(0, stampCard.rule.minOrderTotal - subtotal);
  return {
    earns: false,
    text: words.basket.spendMoreToEarnStamp(formatPeso(diff)),
  };
}
