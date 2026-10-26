// Demo activity, generated from a shop pack plus a seed and a date (never copied into real shops): orders in every
// status for the owner side, members in every segment, and the fixed demo receipts for the customer side.
import {
  addDays,
  canQuickAdd,
  defaultPicks,
  manilaDate,
  manilaToDate,
  openState,
  pickupSlots,
  validateLinePicks,
  type BasketLine,
  type CustomerAddress,
  type LedgerEntry,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
  type PaymentStatus,
  type Proof,
  type PublicShop,
} from '@smartapp/core';
import { int, pick, token, type Rng } from './rng';
import {
  addMinutes,
  buildOrder,
  type MemberRecord,
  type OrderRecord,
  type OrderSpec,
} from './state';

export const DEMO_RECEIPT_TOKENS = [
  'demo-placed-transfer',
  'demo-proof-pending',
  'demo-proof-rejected',
  'demo-preparing',
  'demo-ready-pickup',
  'demo-out-for-delivery',
  'demo-completed',
  'demo-completed-rated',
  'demo-cancelled-refunded',
  'demo-expired',
  'demo-scheduled',
] as const;
export type DemoReceiptToken = (typeof DEMO_RECEIPT_TOKENS)[number];

// Every receipt state, at a fixed token per demo shop: /<slug>/o/<token> (Playwright and screenshots).
export const DEMO_RECEIPTS: Readonly<Record<DemoReceiptToken, string>> = {
  'demo-placed-transfer': 'Unpaid transfer, pay countdown running',
  'demo-proof-pending': 'Proof sent, waiting for the shop to check it',
  'demo-proof-rejected': 'Proof rejected with a reason, upload again',
  'demo-preparing': 'Paid and preparing',
  'demo-ready-pickup': 'Ready for pickup',
  'demo-out-for-delivery': 'Out for delivery with rider and tracking link',
  'demo-completed': 'Completed, rating open',
  'demo-completed-rated': 'Completed and rated',
  'demo-cancelled-refunded': 'Cancelled and refunded',
  'demo-expired': 'Expired, not paid in time',
  'demo-scheduled': 'Scheduled for the next opening (closed shop)',
};

export const DEMO_CUSTOMER = {
  name: 'Juan dela Cruz',
  email: 'juan@example.com',
  phone: '+639170001234',
} as const;

const NAMES = [
  'Maria Santos',
  'Jose Ramos',
  'Ana Cruz',
  'Mark Reyes',
  'Liza Garcia',
  'Paolo Mendoza',
  'Grace Lim',
  'Rico Bautista',
  'Joy Navarro',
  'Ben Aquino',
] as const;

const DAY = 24 * 60;

/** Juan's two saved places in the shop's first delivery zone, so the account shows real-looking data. */
export function demoAddresses(shop: PublicShop): CustomerAddress[] {
  const zoneId = shop.storefront.delivery.zones[0]?.id ?? null;
  return [
    {
      id: 'demo-address-home',
      label: 'Home',
      addressLine: '12 Sampaguita St.',
      houseNo: 'Blue gate',
      floor: null,
      landmark: 'Across the sari-sari store',
      spot: null,
      zoneId,
    },
    {
      id: 'demo-address-work',
      label: 'Work',
      addressLine: '88 Rizal Ave., Unit 5B',
      houseNo: null,
      floor: '5th floor',
      landmark: 'Beside the bank',
      spot: null,
      zoneId,
    },
  ];
}

export function isDemoReceiptToken(value: string): value is DemoReceiptToken {
  return DEMO_RECEIPT_TOKENS.some((token) => token === value);
}

function customerFor(i: number): { name: string; phone: string; email: string } {
  const name = NAMES[i % NAMES.length] ?? 'Customer';
  return {
    name,
    phone: `+63917000${String(2000 + i).padStart(4, '0')}`,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
  };
}

/** Lines a customer could order right now: items with valid default picks. */
export function orderableLines(shop: PublicShop, now: Date, rng: Rng, count: number): BasketLine[] {
  const { items, optionGroups } = shop.catalog;
  const candidates = items.filter((item) => {
    if (item.status !== 'active') return false;
    const picks = defaultPicks(item, optionGroups, now);
    return validateLinePicks(item, optionGroups, picks, now).length === 0;
  });
  if (candidates.length === 0) return [];
  const lines: BasketLine[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count * 3 && lines.length < count; i += 1) {
    const item = pick(rng, candidates);
    if (used.has(item.id)) continue;
    used.add(item.id);
    const picks = defaultPicks(item, optionGroups, now);
    lines.push({
      variantId: picks.variantId,
      optionIds: [...picks.optionIds],
      itemId: item.id,
      note: '',
      qty: int(rng, 1, 2),
    });
  }
  return lines;
}

/** Up to 3 quick-add lines for `?mock=basket`. */
export function demoBasketLines(shop: PublicShop, now: Date): BasketLine[] {
  const { items, optionGroups } = shop.catalog;
  return items
    .filter((i) => canQuickAdd(i, optionGroups))
    .map((item) => {
      const picks = defaultPicks(item, optionGroups, now);
      return {
        variantId: picks.variantId,
        optionIds: [...picks.optionIds],
        itemId: item.id,
        note: '',
        qty: 1,
      };
    })
    .filter((line) => {
      const item = items.find((i) => i.id === line.itemId);
      return item ? validateLinePicks(item, optionGroups, line, now).length === 0 : false;
    })
    .slice(0, 3);
}

function methodFor(shop: PublicShop, type: OrderType, wanted: PaymentMethod): PaymentMethod {
  const methods = shop.storefront.payments.map((p) => p.method);
  const allowed = methods.filter((m) =>
    m === 'cash' ? type !== 'delivery' : m === 'cod' ? type === 'delivery' : true,
  );
  return allowed.includes(wanted) ? wanted : (allowed[0] ?? 'gcash');
}

function typeFor(shop: PublicShop, wanted: OrderType): OrderType {
  return shop.storefront.orderTypes.includes(wanted)
    ? wanted
    : (shop.storefront.orderTypes[0] ?? 'pickup');
}

function deliveryFor(shop: PublicShop): { fee: number; address: string } {
  const row = shop.storefront.delivery.distance[0];
  const zone = shop.storefront.delivery.zones[0];
  return {
    fee: row?.fee ?? zone?.fee ?? 0,
    address: `12 Sample St., ${zone?.name ?? 'near the shop'}`,
  };
}

interface DraftOrder extends Omit<
  OrderSpec,
  'id' | 'slug' | 'token' | 'orderNo' | 'lines' | 'customer'
> {
  token?: string;
  lines?: BasketLine[];
  customerIndex?: number;
  customer?: OrderSpec['customer'];
}

function proof(
  id: string,
  status: Proof['status'],
  uploadedAt: string,
  referenceNo: string,
  rejectReason: string | null = null,
): Proof {
  return { id, status, referenceNo, path: `proofs/${id}.webp`, uploadedAt, rejectReason };
}

/** The fixed receipts, placed earlier today relative to `now`. */
function demoReceiptDrafts(shop: PublicShop, now: Date): DraftOrder[] {
  const iso = now.toISOString();
  const pickup = typeFor(shop, 'pickup');
  const gcash = methodFor(shop, pickup, 'gcash');
  const delivery = deliveryFor(shop);
  // Juan's demo receipts use a separate number, so the unpaid-order limit never blocks a tester typing his phone.
  const juan = { name: DEMO_CUSTOMER.name, phone: '+639170009999', email: DEMO_CUSTOMER.email };
  const scheduled = (() => {
    const slots = pickupSlots(shop.storefront, now);
    const state = openState(shop.storefront, now);
    if (state.state === 'closed' && slots[0]) return slots[0];
    const tomorrow = addDays(manilaDate(now), 1);
    return (
      slots.find((s) => manilaDate(s) === tomorrow) ?? manilaToDate(tomorrow, '10:00').toISOString()
    );
  })();
  const base = { customer: juan };
  return [
    {
      ...base,
      token: 'demo-placed-transfer',
      placedAt: addMinutes(iso, -5),
      type: pickup,
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: gcash,
      expiresAt: addMinutes(iso, 25),
    },
    {
      ...base,
      token: 'demo-proof-pending',
      placedAt: addMinutes(iso, -12),
      type: pickup,
      status: 'placed',
      paymentStatus: 'pending',
      paymentMethod: gcash,
      expiresAt: addMinutes(iso, 18),
      proofs: [proof('pf-pending', 'pending', addMinutes(iso, -8), '1023 456 7890')],
    },
    {
      ...base,
      token: 'demo-proof-rejected',
      placedAt: addMinutes(iso, -20),
      type: pickup,
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: gcash,
      expiresAt: addMinutes(iso, 20),
      proofs: [
        proof(
          'pf-rejected',
          'rejected',
          addMinutes(iso, -15),
          '1023 000 1111',
          'The amount does not match. Please send the exact total.',
        ),
      ],
    },
    {
      ...base,
      token: 'demo-preparing',
      placedAt: addMinutes(iso, -25),
      type: pickup,
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      proofs: [proof('pf-preparing', 'approved', addMinutes(iso, -23), '1023 222 3333')],
    },
    {
      ...base,
      token: 'demo-ready-pickup',
      placedAt: addMinutes(iso, -40),
      type: pickup,
      status: 'ready',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      proofs: [proof('pf-ready', 'approved', addMinutes(iso, -38), '1023 444 5555')],
    },
    {
      ...base,
      token: 'demo-out-for-delivery',
      placedAt: addMinutes(iso, -45),
      type: 'delivery',
      status: 'out_for_delivery',
      paymentStatus: 'unpaid',
      paymentMethod: methodFor(shop, 'delivery', 'cod'),
      deliveryFee: delivery.fee,
      deliveryAddress: delivery.address,
      rider: { name: 'Kuya Jun', phone: '0917 000 5555', provider: 'Lalamove' },
      trackingUrl: 'https://example.com/track/demo-ride',
    },
    {
      ...base,
      token: 'demo-completed',
      placedAt: addMinutes(iso, -120),
      type: pickup,
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: methodFor(shop, pickup, 'cash'),
    },
    {
      ...base,
      token: 'demo-completed-rated',
      placedAt: addMinutes(iso, -180),
      type: pickup,
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: methodFor(shop, pickup, 'cash'),
      rating: { stars: 5, comment: 'Mabilis and still hot. Salamat!', at: addMinutes(iso, -100) },
    },
    {
      ...base,
      token: 'demo-cancelled-refunded',
      placedAt: addMinutes(iso, -90),
      type: pickup,
      status: 'cancelled',
      paymentStatus: 'refunded',
      paymentMethod: gcash,
      cancelReason: 'We ran out of an item in your order.',
      refundReason: 'We ran out of an item in your order.',
      proofs: [proof('pf-refunded', 'approved', addMinutes(iso, -88), '1023 666 7777')],
    },
    {
      ...base,
      token: 'demo-expired',
      placedAt: addMinutes(iso, -75),
      type: pickup,
      status: 'expired',
      paymentStatus: 'unpaid',
      paymentMethod: gcash,
      expiresAt: addMinutes(iso, -45),
    },
    {
      ...base,
      token: 'demo-scheduled',
      placedAt: addMinutes(iso, -3),
      type: pickup,
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: methodFor(shop, pickup, 'cash'),
      scheduledAt: scheduled,
    },
  ];
}

/** Orders for the owner side: today's board in every status and a few past days. */
function activityDrafts(shop: PublicShop, now: Date): DraftOrder[] {
  const iso = now.toISOString();
  const walkIn = typeFor(shop, 'walk_in');
  const pickup = typeFor(shop, 'pickup');
  const gcash = methodFor(shop, pickup, 'gcash');
  const delivery = deliveryFor(shop);
  const drafts: DraftOrder[] = [
    {
      customerIndex: 0,
      placedAt: addMinutes(iso, -4),
      type: walkIn,
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: methodFor(shop, walkIn, 'cash'),
      isFirstOrder: true,
    },
    {
      customerIndex: 1,
      placedAt: addMinutes(iso, -9),
      type: pickup,
      status: 'placed',
      paymentStatus: 'pending',
      paymentMethod: gcash,
      expiresAt: addMinutes(iso, 21),
      proofs: [proof('pf-a1', 'pending', addMinutes(iso, -6), '2001 111 2222')],
    },
    {
      customerIndex: 2,
      placedAt: addMinutes(iso, -16),
      type: pickup,
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: gcash,
      expiresAt: addMinutes(iso, 24),
      proofs: [
        proof(
          'pf-a2',
          'rejected',
          addMinutes(iso, -12),
          '2001 333 4444',
          'No payment with this reference yet.',
        ),
      ],
    },
    {
      customerIndex: 3,
      placedAt: addMinutes(iso, -22),
      type: pickup,
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      proofs: [proof('pf-a3', 'approved', addMinutes(iso, -20), '2001 555 6666')],
    },
    {
      customerIndex: 4,
      placedAt: addMinutes(iso, -35),
      type: pickup,
      status: 'ready',
      paymentStatus: 'unpaid',
      paymentMethod: methodFor(shop, pickup, 'cash'),
    },
    {
      customerIndex: 5,
      placedAt: addMinutes(iso, -50),
      type: 'delivery',
      status: 'out_for_delivery',
      paymentStatus: 'unpaid',
      paymentMethod: methodFor(shop, 'delivery', 'cod'),
      deliveryFee: delivery.fee,
      deliveryAddress: delivery.address,
      rider: { name: 'Kuya Ramil', phone: '0917 000 6666', provider: 'Grab' },
      trackingUrl: 'https://example.com/track/ride-2',
    },
    {
      customerIndex: 6,
      placedAt: addMinutes(iso, -140),
      type: pickup,
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: methodFor(shop, pickup, 'cash'),
      rating: { stars: 4, comment: 'Sulit! Will order again.', at: addMinutes(iso, -100) },
    },
    {
      customerIndex: 7,
      placedAt: addMinutes(iso, -200),
      type: walkIn,
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: methodFor(shop, walkIn, 'cash'),
    },
    {
      customerIndex: 8,
      placedAt: addMinutes(iso, -95),
      type: pickup,
      status: 'cancelled',
      paymentStatus: 'unpaid',
      paymentMethod: methodFor(shop, pickup, 'cash'),
      cancelReason: 'Customer asked to cancel.',
    },
    {
      customerIndex: 9,
      placedAt: addMinutes(iso, -110),
      type: pickup,
      status: 'expired',
      paymentStatus: 'unpaid',
      paymentMethod: gcash,
      expiresAt: addMinutes(iso, -80),
    },
    {
      customerIndex: 1,
      placedAt: addMinutes(iso, -2),
      type: pickup,
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: methodFor(shop, pickup, 'cash'),
      scheduledAt: addMinutes(iso, 120),
    },
    {
      customerIndex: 2,
      placedAt: addMinutes(iso, -1),
      type: pickup,
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: methodFor(shop, pickup, 'cash'),
      scheduledAt: addMinutes(iso, 180),
    },
  ];
  // Past days: three completed orders each, for history and insights later.
  for (let day = 1; day <= 3; day += 1) {
    for (let k = 0; k < 3; k += 1) {
      drafts.push({
        customerIndex: (day * 3 + k) % NAMES.length,
        placedAt: addMinutes(iso, -day * DAY - k * 90),
        type: k === 2 ? 'delivery' : pickup,
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod:
          k === 2 ? methodFor(shop, 'delivery', 'cod') : methodFor(shop, pickup, 'cash'),
        ...(k === 2 ? { deliveryFee: delivery.fee, deliveryAddress: delivery.address } : {}),
      });
    }
  }
  return drafts;
}

/** Builds every generated order for a shop, numbered gap-free per Manila day in placement order. */
export function generateOrders(shop: PublicShop, now: Date, rng: Rng): OrderRecord[] {
  const slug = shop.storefront.slug;
  if (shop.catalog.items.length === 0) return [];
  const drafts = [...activityDrafts(shop, now), ...demoReceiptDrafts(shop, now)]
    .map((d) => ({ ...d, lines: d.lines ?? orderableLines(shop, now, rng, int(rng, 1, 3)) }))
    .filter((d) => d.lines.length > 0)
    .sort((a, b) => a.placedAt.localeCompare(b.placedAt));
  const counters = new Map<string, number>();
  return drafts.map((d, index) => {
    const date = manilaDate(d.placedAt);
    const orderNo = (counters.get(date) ?? 0) + 1;
    counters.set(date, orderNo);
    const customer = d.customer ?? customerFor(d.customerIndex ?? index);
    const { customerIndex: _unused, ...rest } = d;
    void _unused;
    return buildOrder(shop, {
      ...rest,
      id: `${slug}-o-${index + 1}`,
      slug,
      token: d.token ?? token(rng),
      orderNo,
      lines: d.lines,
      customer,
    });
  });
}

const SEGMENTS = [
  'new',
  'regular',
  'ready',
  'almost',
  'quiet',
  'reversed',
  'manual',
  'guest-linked',
] as const;

/** Members in every segment, with ledgers showing welcome, earned, redeemed, reversed and manual rows. */
export function generateMembers(shop: PublicShop, now: Date): MemberRecord[] {
  const slug = shop.storefront.slug;
  if (shop.storefront.stampCard.status === 'off') return [];
  const needed = shop.storefront.stampCard.rule.stampsNeeded;
  const iso = now.toISOString();
  const prefix = slug.slice(0, 2).toUpperCase();
  return SEGMENTS.map((segment, i) => {
    const c = customerFor(i);
    const joinedAt = addMinutes(iso, -(segment === 'new' ? 3 : 20 + i * 5) * DAY);
    const ledger: LedgerEntry[] = [
      { kind: 'welcome', delta: 1, reasonCategory: null, orderNo: null, at: joinedAt },
    ];
    const earn = (n: number, fromDay: number) => {
      for (let k = 0; k < n; k += 1) {
        ledger.push({
          kind: 'earned',
          delta: 1,
          reasonCategory: null,
          orderNo: 10 + k,
          at: addMinutes(iso, -(fromDay - k) * DAY),
        });
      }
    };
    switch (segment) {
      case 'regular':
        earn(4, 15);
        break;
      case 'ready':
        earn(needed - 1, needed + 2);
        break;
      case 'almost':
        earn(needed - 2, needed + 3);
        break;
      case 'quiet':
        earn(1, 45);
        break;
      case 'reversed':
        earn(3, 12);
        ledger.push({
          kind: 'reversed',
          delta: -1,
          reasonCategory: null,
          orderNo: 12,
          at: addMinutes(iso, -9 * DAY),
        });
        break;
      case 'manual':
        ledger.push({
          kind: 'given',
          delta: 1,
          reasonCategory: 'counter_purchase',
          orderNo: null,
          at: addMinutes(iso, -6 * DAY),
        });
        ledger.push({
          kind: 'removed',
          delta: -1,
          reasonCategory: 'correction',
          orderNo: null,
          at: addMinutes(iso, -5 * DAY),
        });
        earn(2, 4);
        break;
      default:
        break;
    }
    return {
      slug,
      email: c.email,
      name: c.name,
      phone: c.phone,
      memberCode: `${prefix}-${String(4100 + i * 37).padStart(4, '0')}`,
      joinedAt,
      ledger: ledger.sort((a, b) => a.at.localeCompare(b.at)),
      addresses: [],
      claims: [],
      byCustomer: false,
    };
  });
}

export type { OrderStatus, PaymentStatus };
