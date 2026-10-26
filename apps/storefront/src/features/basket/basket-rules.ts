import {
  earnsStamp,
  formatClock,
  formatPeso,
  manilaDate,
  openingWhen,
  pickupSlots,
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
}: {
  sf: PublicShop['storefront'];
  openState: OpenState;
  isOnline: boolean;
  now: Date | string;
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

  if (state.state === 'closed') {
    const nextOpening = state.nextOpening;
    if (!nextOpening) {
      return {
        state: 'closed_no_scheduling',
        alertMessage: words.shop.closedNoOpening,
        buttonLabel: words.basket.goToCheckout,
        buttonDisabled: true,
        buttonReason: words.shop.closedNoOpening,
        scheduleSlot: null,
      };
    }

    const nowDate = manilaDate(now);
    const openingDate = manilaDate(nextOpening);
    const nowTomorrow = manilaDate(new Date(new Date(now).getTime() + 24 * 60 * 60 * 1000));
    const isTodayOrTomorrow = openingDate === nowDate || openingDate === nowTomorrow;

    if (sf.takeOrdersWhileClosed && isTodayOrTomorrow) {
      const when = openingWhen(nextOpening, now);
      const slots = pickupSlots(sf, nextOpening);
      const firstSlot = slots[0] ?? nextOpening;
      const slotTime = formatClock(firstSlot);

      return {
        state: 'closed_with_scheduling',
        alertMessage: words.basket.closedSaved(when),
        buttonLabel: words.basket.scheduleFor(slotTime),
        buttonDisabled: false,
        buttonReason: null,
        scheduleSlot: firstSlot,
      };
    }

    // Closed without scheduling or opens later than tomorrow
    const when = openingWhen(nextOpening, now);
    const msg = words.basket.opensSaved(when);
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
