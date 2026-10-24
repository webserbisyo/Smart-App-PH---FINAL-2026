// Mock server state and the one builder that turns basket lines into an order record.
import {
  formatPeso,
  isTransfer,
  manilaDate,
  timelineSteps,
  unitPrice,
  variantLabel,
  words,
  type BasketLine,
  type CustomerAddress,
  type CustomerSession,
  type LedgerEntry,
  type OrderEvent,
  type OrderMessage,
  type OrderReceipt,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
  type PaymentStatus,
  type Proof,
  type PublicShop,
  type ReceiptLine,
  type RewardClaim,
  type Rider,
} from '@smartapp/core';

export interface OrderRecord {
  id: string;
  slug: string;
  clientKey: string | null;
  businessDate: string;
  receipt: OrderReceipt;
  customerPhone: string;
  customerEmail: string | null;
  proofs: Proof[];
  isFirstOrder: boolean;
  memberEmail: string | null;
  // Stamps taken at placement for a reward; given back if the order is cancelled or expires.
  redeemed: number;
  stamp: 'none' | 'pending' | 'earned' | 'reversed';
  // Created on this phone: kept in device storage (decision N29).
  byCustomer: boolean;
}

export interface MemberRecord {
  slug: string;
  email: string;
  name: string;
  phone: string;
  memberCode: string;
  joinedAt: string;
  ledger: LedgerEntry[];
  addresses: CustomerAddress[];
  claims: RewardClaim[];
  byCustomer: boolean;
}

export interface ShopState {
  shop: PublicShop;
  orders: OrderRecord[];
  members: MemberRecord[];
}

export interface CodeRecord {
  issuedAt: string;
  sends: string[];
}

export interface MockState {
  shops: Map<string, ShopState>;
  session: CustomerSession | null;
  codes: Record<string, CodeRecord>;
}

const MINUTE = 60_000;

export const addMinutes = (iso: string | Date, minutes: number): string =>
  new Date(new Date(iso).getTime() + minutes * MINUTE).toISOString();

export function receiptLines(shop: PublicShop, lines: readonly BasketLine[]): ReceiptLine[] {
  const { items, optionGroups } = shop.catalog;
  return lines.flatMap((line) => {
    const item = items.find((i) => i.id === line.itemId);
    const variant = item?.variants.find((v) => v.id === line.variantId);
    if (!item || !variant) return [];
    const price = unitPrice(item, optionGroups, line);
    return [
      {
        name: item.name,
        variantLabel: variantLabel(variant),
        optionLabels: optionGroups
          .flatMap((g) => g.options)
          .filter((o) => line.optionIds.includes(o.id))
          .map((o) => o.name),
        note: line.note,
        qty: line.qty,
        unitPrice: price,
        lineTotal: price * line.qty,
        itemId: item.id,
        variantId: variant.id,
        optionIds: [...line.optionIds],
      },
    ];
  });
}

/** Status events up to `status`, 10 minutes apart from placement. */
export function eventsFor(
  type: OrderType,
  status: OrderStatus,
  placedAt: string,
  endedAt?: string,
): OrderEvent[] {
  if (status === 'cancelled' || status === 'expired') {
    return [
      { status: 'placed', at: placedAt },
      { status, at: endedAt ?? addMinutes(placedAt, 30) },
    ];
  }
  const steps = timelineSteps(type);
  const upto = steps.indexOf(status);
  return steps.slice(0, upto + 1).map((s, i) => ({ status: s, at: addMinutes(placedAt, i * 10) }));
}

export interface OrderSpec {
  id: string;
  slug: string;
  token: string;
  orderNo: number;
  placedAt: string;
  type: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  lines: readonly BasketLine[];
  customer: { name: string; phone: string; email: string | null };
  scheduledAt?: string | null;
  deliveryAddress?: string | null;
  deliveryFee?: number;
  discount?: number;
  rewardTitle?: string | null;
  proofs?: Proof[];
  rider?: Rider | null;
  trackingUrl?: string | null;
  refundReason?: string | null;
  cancelReason?: string | null;
  rating?: OrderReceipt['rating'];
  expiresAt?: string | null;
  note?: string | null;
  clientKey?: string | null;
  isFirstOrder?: boolean;
  memberEmail?: string | null;
  redeemed?: number;
  stamp?: OrderRecord['stamp'];
  byCustomer?: boolean;
}

export function threadFor(spec: OrderSpec, events: OrderEvent[]): OrderMessage[] {
  const messages: OrderMessage[] = [];
  for (const proof of spec.proofs ?? []) {
    messages.push({
      id: `${proof.id}-m`,
      kind: 'proof',
      at: proof.uploadedAt,
      status: null,
      proof,
      text: null,
    });
    if (proof.status === 'rejected' && proof.rejectReason) {
      messages.push({
        id: `${proof.id}-r`,
        kind: 'status',
        at: addMinutes(proof.uploadedAt, 4),
        status: null,
        proof: null,
        text: words.shop.thread.paymentRejected(proof.rejectReason),
      });
    }
    if (proof.status === 'approved') {
      messages.push({
        id: `${proof.id}-a`,
        kind: 'status',
        at: addMinutes(proof.uploadedAt, 3),
        status: null,
        proof: null,
        text: words.shop.thread.paymentApproved,
      });
    }
  }
  for (const event of events.slice(1)) {
    messages.push({
      id: `${spec.id}-${event.status}`,
      kind: 'status',
      at: event.at,
      status: event.status,
      proof: null,
      text: null,
    });
  }
  if (spec.rider) {
    const at = events.find((e) => e.status === 'out_for_delivery')?.at ?? spec.placedAt;
    messages.push({
      id: `${spec.id}-rider`,
      kind: 'rider',
      at,
      status: null,
      proof: null,
      text: words.shop.thread.rider(spec.rider.name),
    });
  }
  if (spec.trackingUrl) {
    const at = events.find((e) => e.status === 'out_for_delivery')?.at ?? spec.placedAt;
    messages.push({
      id: `${spec.id}-track`,
      kind: 'tracking',
      at,
      status: null,
      proof: null,
      text: words.shop.thread.tracking,
    });
  }
  return messages.sort((a, b) => a.at.localeCompare(b.at));
}

export function buildOrder(shop: PublicShop, spec: OrderSpec): OrderRecord {
  const lines = receiptLines(shop, spec.lines);
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const discount = Math.min(spec.discount ?? 0, subtotal);
  const deliveryFee = spec.type === 'delivery' ? (spec.deliveryFee ?? 0) : 0;
  const total = subtotal - discount + deliveryFee;
  const endedAt = spec.status === 'expired' ? (spec.expiresAt ?? undefined) : undefined;
  const events = eventsFor(spec.type, spec.status, spec.placedAt, endedAt);
  const account = shop.storefront.payments.find((p) => p.method === spec.paymentMethod);
  const refund =
    spec.paymentStatus === 'refunded'
      ? {
          amount: total,
          reason: spec.refundReason ?? spec.cancelReason ?? '',
          at: events[events.length - 1]?.at ?? spec.placedAt,
        }
      : null;
  const receipt: OrderReceipt = {
    slug: spec.slug,
    orderNo: spec.orderNo,
    token: spec.token,
    type: spec.type,
    status: spec.status,
    paymentStatus: spec.paymentStatus,
    paymentMethod: spec.paymentMethod,
    placedAt: spec.placedAt,
    scheduledAt: spec.scheduledAt ?? null,
    customerName: spec.customer.name,
    deliveryAddress: spec.type === 'delivery' ? (spec.deliveryAddress ?? null) : null,
    events,
    messages: threadFor(spec, events),
    lines,
    totals: { subtotal, discount, deliveryFee, total },
    rewardTitle: spec.rewardTitle ?? null,
    payment: isTransfer(spec.paymentMethod)
      ? {
          method: spec.paymentMethod,
          accountName: account?.accountName ?? null,
          accountNumber: account?.accountNumber ?? null,
          qr: account?.qr ?? null,
          amount: total,
        }
      : null,
    rider: spec.rider ?? null,
    trackingUrl: spec.trackingUrl ?? null,
    refund,
    rating: spec.rating ?? null,
    cancelReason: spec.cancelReason ?? null,
    expiresAt: spec.expiresAt ?? null,
    note: spec.note ?? null,
  };
  if (refund) {
    receipt.messages.push({
      id: `${spec.id}-refund`,
      kind: 'status',
      at: refund.at,
      status: null,
      proof: null,
      text: words.shop.thread.refunded(formatPeso(refund.amount), refund.reason),
    });
  }
  return {
    id: spec.id,
    slug: spec.slug,
    clientKey: spec.clientKey ?? null,
    businessDate: manilaDate(spec.placedAt),
    receipt,
    customerPhone: spec.customer.phone,
    customerEmail: spec.customer.email,
    proofs: spec.proofs ?? [],
    isFirstOrder: spec.isFirstOrder ?? false,
    memberEmail: spec.memberEmail ?? null,
    redeemed: spec.redeemed ?? 0,
    stamp: spec.stamp ?? 'none',
    byCustomer: spec.byCustomer ?? false,
  };
}

/** Next gap-free order number for a shop on a Manila business date. */
export function nextOrderNo(state: ShopState, businessDate: string): number {
  return (
    state.orders
      .filter((o) => o.businessDate === businessDate)
      .reduce((max, o) => Math.max(max, o.receipt.orderNo), 0) + 1
  );
}

export function memberBalance(member: MemberRecord): number {
  return member.ledger.filter((e) => e.kind !== 'pending').reduce((sum, e) => sum + e.delta, 0);
}
