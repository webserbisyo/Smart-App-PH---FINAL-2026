// The mock server's quote: every rule from core, the same way the API will run it.
import {
  deliveryFee,
  lineIdentity,
  openState,
  pickupSlots,
  readyEstimate,
  rewardState,
  unitPrice,
  validateLinePicks,
  variantAvailability,
  variantLabel,
  type MemberAccount,
  type OrderPayload,
  type PaymentMethod,
  type PublicShop,
  type Quote,
  type QuoteLine,
  type QuoteProblem,
} from '@smartapp/core';

export interface QuoteContext {
  shop: PublicShop;
  now: Date;
  member: Pick<MemberAccount, 'balance' | 'pendingStamps'> | null;
}

const problem = (
  code: QuoteProblem['code'],
  amount: number | null = null,
  km: number | null = null,
): QuoteProblem => ({
  code,
  amount,
  km,
});

/** Methods an order type allows: cash at the counter for walk-in and pickup, COD for delivery only. */
export function methodsFor(shop: PublicShop, type: OrderPayload['type']): PaymentMethod[] {
  return shop.storefront.payments
    .map((p) => p.method)
    .filter((m) => (m === 'cash' ? type !== 'delivery' : m === 'cod' ? type === 'delivery' : true));
}

export function quote(
  ctx: QuoteContext,
  payload: Pick<
    OrderPayload,
    'type' | 'scheduledAt' | 'lines' | 'delivery' | 'paymentMethod' | 'useReward'
  >,
): Quote {
  const { shop, now } = ctx;
  const sf = shop.storefront;
  const { items, optionGroups } = shop.catalog;
  const problems: QuoteProblem[] = [];

  const lines: QuoteLine[] = payload.lines.map((line) => {
    const item = items.find((i) => i.id === line.itemId);
    const base = {
      identity: lineIdentity(line),
      itemId: line.itemId,
      variantId: line.variantId,
      optionIds: line.optionIds,
      qty: line.qty,
      note: line.note,
    };
    if (!item) {
      return {
        ...base,
        name: '',
        variantLabel: null,
        optionLabels: [],
        unitPrice: 0,
        lineTotal: 0,
        photo: null,
        problems: [{ code: 'item_missing', groupId: null, groupName: null }],
      };
    }
    const variant = item.variants.find((v) => v.id === line.variantId);
    const options = optionGroups
      .flatMap((g) => g.options)
      .filter((o) => line.optionIds.includes(o.id));
    const price = unitPrice(item, optionGroups, line);
    return {
      ...base,
      name: item.name,
      variantLabel: variant ? variantLabel(variant) : null,
      optionLabels: options.map((o) => o.name),
      unitPrice: price,
      lineTotal: price * line.qty,
      photo: item.photos[0] ?? null,
      problems: validateLinePicks(item, optionGroups, line, now),
    };
  });

  const good = lines.filter((l) => l.problems.length === 0);
  const subtotal = good.reduce((sum, l) => sum + l.lineTotal, 0);
  if (good.length === 0) problems.push(problem('empty_basket'));

  const state = openState(sf, now);
  const slots = payload.type === 'walk_in' ? [] : pickupSlots(sf, now);
  if (!sf.orderTypes.includes(payload.type)) problems.push(problem('fulfillment_unavailable'));
  if (state.paused) problems.push(problem('shop_paused'));
  else if (payload.scheduledAt) {
    if (!slots.includes(payload.scheduledAt)) problems.push(problem('slot_unavailable'));
  } else if (state.state === 'closed') problems.push(problem('shop_closed'));
  else if (state.state === 'busy') problems.push(problem('shop_busy'));
  if (payload.type === 'walk_in' && state.state !== 'open' && !state.paused) {
    if (!problems.some((p) => p.code === 'fulfillment_unavailable'))
      problems.push(problem('fulfillment_unavailable'));
  }

  if (!methodsFor(shop, payload.type).includes(payload.paymentMethod))
    problems.push(problem('payment_unavailable'));

  let fee = 0;
  let distance: number | null = null;
  if (payload.type === 'delivery') {
    const result = deliveryFee(
      sf,
      { spot: payload.delivery?.spot ?? null, zoneId: payload.delivery?.zoneId ?? null },
      subtotal,
    );
    if (result.ok) {
      fee = result.fee;
      distance = result.distanceM;
    } else if (result.code === 'out_of_range') {
      problems.push(problem('out_of_range', null, result.maxKm));
    } else if (result.code === 'below_min_order') {
      problems.push(problem('below_min_order', result.minOrder));
    } else {
      problems.push(problem('zone_required'));
    }
  }

  let discount = 0;
  if (payload.useReward) {
    const card = sf.stampCard;
    const reward = card.reward;
    const freeItem =
      reward.kind === 'free_item' ? items.find((i) => i.id === reward.itemId) : undefined;
    const freeVariant = freeItem?.variants.find((v) => v.id === reward.variantId);
    const freeAvailable = freeVariant
      ? variantAvailability(freeVariant, now) === 'available'
      : false;
    const rs =
      card.status === 'off'
        ? 'not_ready'
        : rewardState({ card, member: ctx.member, freeItemAvailable: freeAvailable });
    if (rs !== 'ready' || reward.kind === 'custom') {
      problems.push(problem('reward_unavailable'));
    } else if (reward.kind === 'discount') {
      discount = Math.min(reward.amount ?? 0, subtotal);
    } else {
      const inBasket = good.find((l) => l.variantId === reward.variantId);
      if (!inBasket || !freeVariant) problems.push(problem('reward_unavailable'));
      else discount = Math.min(freeVariant.price, subtotal);
    }
  }

  const total = Math.max(0, subtotal - discount) + fee;
  if (payload.paymentMethod === 'cod' && sf.codMaxTotal !== null && total > sf.codMaxTotal) {
    problems.push(problem('cod_limit', sf.codMaxTotal));
  }

  return {
    lines,
    subtotal,
    discount,
    deliveryFee: fee,
    total,
    distanceM: distance,
    slots,
    openState: state,
    readyEstimate: payload.scheduledAt ?? readyEstimate(sf, now),
    problems,
  };
}
