// The owner's order being made or changed (T111): one state for the three steps, and the payload the
// quote, New order and Edit order send. Prices are never kept here; the quote works them out.
import {
  formatPhPhone,
  lineIdentity,
  type BasketLine,
  type DeliveryDetails,
  type OrderType,
  type OwnerOrder,
  type OwnerOrderPayload,
  type OwnerPay,
  type PaidKind,
  type PaymentMethod,
} from '@smartapp/core';

export const STEPS = ['items', 'details', 'pay'] as const;
export type Step = (typeof STEPS)[number];

export type CustomerChoice =
  | { kind: 'guest'; name: string; phone: string }
  | {
      kind: 'member';
      memberId: string;
      name: string;
      stamps: { have: number; goal: number } | null;
      prizeReady: boolean;
    };

export interface Draft {
  lines: BasketLine[];
  customer: CustomerChoice;
  type: OrderType;
  // Null = now, or a time not picked yet while `later` is on.
  scheduledAt: string | null;
  later: boolean;
  addressLine: string;
  landmark: string;
  zoneId: string | null;
  deliveryFee: number;
  paymentMethod: PaymentMethod;
  paymentAccountId: string | null;
  note: string;
  useReward: boolean;
  override: boolean;
  paidKind: PaidKind;
  partAmount: number;
  handedOver: boolean;
}

export function emptyDraft(type: OrderType, method: PaymentMethod): Draft {
  return {
    lines: [],
    customer: { kind: 'guest', name: '', phone: '' },
    type,
    scheduledAt: null,
    later: false,
    addressLine: '',
    landmark: '',
    zoneId: null,
    deliveryFee: 0,
    paymentMethod: method,
    paymentAccountId: null,
    note: '',
    useReward: false,
    override: false,
    // A walk-in at the counter usually pays now; anything for later is usually not paid yet. Handed
    // over stays off: a food order still goes through the kitchen, so the owner turns it on.
    paidKind: type === 'walk_in' ? 'paid' : 'unpaid',
    partAmount: 0,
    handedOver: false,
  };
}

/** The order as it is now, ready to change (Edit order). */
export function draftFromOrder(order: OwnerOrder, memberName: string | null): Draft {
  const address = order.deliveryAddress ?? '';
  return {
    lines: order.lines.map((l) => ({
      itemId: l.itemId,
      variantId: l.variantId,
      optionIds: [...l.optionIds].sort(),
      note: l.note,
      qty: l.qty,
    })),
    customer:
      order.memberId !== null
        ? {
            kind: 'member',
            memberId: order.memberId,
            name: memberName ?? order.customerName,
            stamps: null,
            prizeReady: false,
          }
        : {
            kind: 'guest',
            name: order.customerName,
            phone: order.customerPhone ? formatPhPhone(order.customerPhone) : '',
          },
    type: order.type,
    scheduledAt: order.scheduledAt,
    later: order.scheduledAt !== null,
    addressLine: address,
    landmark: '',
    zoneId: null,
    deliveryFee: order.totals.deliveryFee,
    paymentMethod: order.paymentMethod,
    paymentAccountId: order.payment?.accountId ?? null,
    note: order.note ?? '',
    useReward: false,
    override: false,
    paidKind: 'unpaid',
    partAmount: 0,
    handedOver: false,
  };
}

/** Adds a line, or more of the same line (same item, choices and note). */
export function addLine(lines: readonly BasketLine[], line: BasketLine): BasketLine[] {
  const id = lineIdentity(line);
  const found = lines.findIndex((l) => lineIdentity(l) === id);
  if (found === -1) return [...lines, line];
  return lines.map((l, i) => (i === found ? { ...l, qty: Math.min(99, l.qty + line.qty) } : l));
}

export function itemCount(lines: readonly BasketLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}

export function qtyOfItem(lines: readonly BasketLine[], itemId: string): number {
  return lines.filter((l) => l.itemId === itemId).reduce((sum, l) => sum + l.qty, 0);
}

function delivery(draft: Draft): DeliveryDetails | null {
  if (draft.type !== 'delivery') return null;
  return {
    spot: null,
    zoneId: draft.zoneId,
    addressLine: draft.addressLine.trim(),
    houseNo: null,
    floor: null,
    landmark: draft.landmark.trim() || null,
  };
}

/** What the quote, New order and Edit order send. Null until there is at least one item. */
export function payloadOf(draft: Draft): OwnerOrderPayload | null {
  if (draft.lines.length === 0) return null;
  return {
    type: draft.type,
    scheduledAt: draft.type === 'walk_in' || !draft.later ? null : draft.scheduledAt,
    lines: draft.lines,
    customer:
      draft.customer.kind === 'member'
        ? { kind: 'member', memberId: draft.customer.memberId }
        : {
            kind: 'guest',
            name: draft.customer.name.trim(),
            phone: draft.customer.phone.trim() || null,
          },
    delivery: delivery(draft),
    deliveryFee: draft.type === 'delivery' ? draft.deliveryFee : null,
    paymentMethod: draft.paymentMethod,
    paymentAccountId: draft.paymentAccountId,
    note: draft.note.trim() || null,
    useReward: draft.customer.kind === 'member' && draft.useReward,
    override: draft.override,
  };
}

export function payOf(draft: Draft): OwnerPay {
  return {
    kind: draft.paidKind,
    amount: draft.paidKind === 'part' ? draft.partAmount : null,
  };
}

/** A part payment must be more than ₱0 and less than the total. */
export function partValid(draft: Draft, total: number): boolean {
  return draft.paidKind !== 'part' || (draft.partAmount > 0 && draft.partAmount < total);
}
