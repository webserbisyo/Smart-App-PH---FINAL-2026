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
  // How many different items to pick (default 1 to 3), and a quantity multiplier for big orders.
  lineCount?: number;
  qtyBoost?: number;
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

import { getMockScenario } from './scenario-state';

function kantoSmashDrafts(shop: PublicShop, now: Date): DraftOrder[] {
  const iso = now.toISOString();
  const walkIn = typeFor(shop, 'walk_in');
  const pickup = typeFor(shop, 'pickup');
  const gcash = methodFor(shop, pickup, 'gcash');
  const cash = methodFor(shop, pickup, 'cash');
  const delivery = deliveryFor(shop);
  const cod = methodFor(shop, 'delivery', 'cod');

  // 18 open orders across all columns:
  // 2 scheduled, 4 new (2 with pending transfer proof), 5 preparing (1 amber, 1 red, 1 long note), 4 ready (1 amber, 1 long note), 3 out (1 rider)
  const openDrafts: DraftOrder[] = [
    // Scheduled (2)
    {
      customerIndex: 1,
      placedAt: addMinutes(iso, -10),
      scheduledAt: addMinutes(iso, 120),
      type: pickup,
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: gcash,
    },
    {
      customerIndex: 2,
      placedAt: addMinutes(iso, -8),
      scheduledAt: addMinutes(iso, 180),
      type: pickup,
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: cash,
    },
    // New (4)
    {
      customerIndex: 0,
      placedAt: addMinutes(iso, -2),
      type: walkIn,
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: methodFor(shop, walkIn, 'cash'),
      isFirstOrder: true,
    },
    {
      customerIndex: 3,
      placedAt: addMinutes(iso, -5),
      type: pickup,
      status: 'placed',
      paymentStatus: 'pending',
      paymentMethod: gcash,
      expiresAt: addMinutes(iso, 25),
      proofs: [proof('pf-ks-1', 'pending', addMinutes(iso, -3), '2001 111 2222')],
    },
    {
      customerIndex: 4,
      placedAt: addMinutes(iso, -9),
      type: pickup,
      status: 'placed',
      paymentStatus: 'pending',
      paymentMethod: gcash,
      expiresAt: addMinutes(iso, 21),
      proofs: [proof('pf-ks-2', 'pending', addMinutes(iso, -6), '2001 333 4444')],
    },
    {
      customerIndex: 5,
      placedAt: addMinutes(iso, -12),
      type: pickup,
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      proofs: [proof('pf-ks-3', 'approved', addMinutes(iso, -10), '2001 555 6666')],
    },
    // Preparing (5) - 1 amber late (age 25 > prep 20), 1 red late (age 35 > prep 20), 1 long note
    {
      customerIndex: 6,
      placedAt: addMinutes(iso, -25),
      type: pickup,
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: gcash,
    },
    {
      customerIndex: 7,
      placedAt: addMinutes(iso, -35),
      type: pickup,
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: gcash,
    },
    {
      customerIndex: 8,
      placedAt: addMinutes(iso, -18),
      type: pickup,
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      note: 'Please make sure patties are extra smashed with crispy lacy edges! Extra sauce on the side please, no pickles at all.',
    },
    {
      customerIndex: 9,
      placedAt: addMinutes(iso, -14),
      type: walkIn,
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: methodFor(shop, walkIn, 'cash'),
    },
    {
      customerIndex: 1,
      placedAt: addMinutes(iso, -10),
      type: pickup,
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: gcash,
    },
    // Ready (4) - 1 amber late (dueAt was placedAt + 20 = now - 25m), 1 long note
    {
      customerIndex: 2,
      placedAt: addMinutes(iso, -45),
      type: pickup,
      status: 'ready',
      paymentStatus: 'paid',
      paymentMethod: cash,
    },
    {
      customerIndex: 3,
      placedAt: addMinutes(iso, -30),
      type: pickup,
      status: 'ready',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      note: 'Pickup by Grab driver. Please double bag so the drink does not spill on the way.',
    },
    {
      customerIndex: 4,
      placedAt: addMinutes(iso, -22),
      type: pickup,
      status: 'ready',
      paymentStatus: 'paid',
      paymentMethod: gcash,
    },
    {
      customerIndex: 5,
      placedAt: addMinutes(iso, -18),
      type: pickup,
      status: 'ready',
      paymentStatus: 'paid',
      paymentMethod: gcash,
    },
    // Out for delivery (3) - 1 with rider
    {
      customerIndex: 6,
      placedAt: addMinutes(iso, -40),
      type: 'delivery',
      status: 'out_for_delivery',
      paymentStatus: 'unpaid',
      paymentMethod: cod,
      deliveryFee: delivery.fee,
      deliveryAddress: delivery.address,
      rider: { name: 'Kuya Jomar', phone: '0917 111 2222', provider: 'Lalamove' },
      trackingUrl: 'https://example.com/track/ks-ride-1',
    },
    {
      customerIndex: 7,
      placedAt: addMinutes(iso, -32),
      type: 'delivery',
      status: 'out_for_delivery',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      deliveryFee: delivery.fee,
      deliveryAddress: delivery.address,
    },
    {
      customerIndex: 8,
      placedAt: addMinutes(iso, -28),
      type: 'delivery',
      status: 'out_for_delivery',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      deliveryFee: delivery.fee,
      deliveryAddress: delivery.address,
    },
  ];

  // Edge cases the board must handle: a big family order with many lines, a bulk order with a long
  // name and a big total, and a walk-in that is almost due.
  openDrafts.push(
    {
      customerIndex: 5,
      placedAt: addMinutes(iso, -6),
      type: walkIn,
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: methodFor(shop, walkIn, 'cash'),
      lineCount: 7,
    },
    {
      customer: {
        name: 'Ma. Concepcion Dela Paz-Villanueva',
        phone: '+639170004321',
        email: 'concepcion.villanueva@example.com',
      },
      placedAt: addMinutes(iso, -4),
      type: pickup,
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      lineCount: 3,
      qtyBoost: 25,
      proofs: [proof('pf-ks-bulk', 'approved', addMinutes(iso, -3), '2001 777 8888')],
      note: 'Office party. Please pack per box with labels.',
    },
  );

  // Earlier completed/cancelled orders today
  const historyToday: DraftOrder[] = [
    {
      customerIndex: 9,
      placedAt: addMinutes(iso, -120),
      type: pickup,
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: cash,
      rating: { stars: 5, comment: 'Crispy smash burger, the best!', at: addMinutes(iso, -90) },
    },
    {
      customerIndex: 0,
      placedAt: addMinutes(iso, -180),
      type: walkIn,
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: methodFor(shop, walkIn, 'cash'),
    },
    {
      customerIndex: 1,
      placedAt: addMinutes(iso, -95),
      type: pickup,
      status: 'cancelled',
      paymentStatus: 'unpaid',
      paymentMethod: cash,
      cancelReason: 'Customer asked to cancel.',
    },
  ];

  // Past days: three completed orders each
  const pastDays: DraftOrder[] = [];
  for (let day = 1; day <= 3; day += 1) {
    for (let k = 0; k < 3; k += 1) {
      pastDays.push({
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

  return [...openDrafts, ...historyToday, ...pastDays];
}

function lolaRemyDrafts(shop: PublicShop, now: Date): DraftOrder[] {
  const iso = now.toISOString();
  const pickup = typeFor(shop, 'pickup');
  const gcash = methodFor(shop, pickup, 'gcash');
  const cash = methodFor(shop, pickup, 'cash');
  const delivery = deliveryFor(shop);
  const todayDate = manilaDate(now);

  const d = new Date(now.getTime() + 8 * 3600 * 1000);
  const dayOfWeek = d.getUTCDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  const nextSaturday = addDays(todayDate, daysUntilSaturday);

  const choc = shop.catalog.items.find((i) => i.id === 'lr-chocolate-moist-cake');
  const ube = shop.catalog.items.find((i) => i.id === 'lr-ube-macapuno-cake');
  const chocVarId = choc?.variants[0]?.id ?? 'lr-chocolate-moist-cake--base';
  const ubeVarId = ube?.variants[0]?.id ?? 'lr-ube-macapuno-cake--base';

  // 1. Next Saturday fully booked for cakes: 6 cakes total across slots
  const saturdayCakeOrders: DraftOrder[] = [
    {
      customerIndex: 1,
      placedAt: addMinutes(iso, -300),
      scheduledAt: manilaToDate(nextSaturday, '10:00').toISOString(),
      type: pickup,
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      note: 'Happy 7th birthday, Migo!',
      lines: [
        {
          itemId: choc?.id ?? 'lr-chocolate-moist-cake',
          variantId: chocVarId,
          optionIds: [],
          qty: 1,
          note: '',
        },
        {
          itemId: ube?.id ?? 'lr-ube-macapuno-cake',
          variantId: ubeVarId,
          optionIds: [],
          qty: 1,
          note: '',
        },
      ],
    },
    {
      customerIndex: 2,
      placedAt: addMinutes(iso, -240),
      scheduledAt: manilaToDate(nextSaturday, '11:00').toISOString(),
      type: pickup,
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      note: 'Happy 50th Wedding Anniversary Lolo and Lola!',
      lines: [
        {
          itemId: ube?.id ?? 'lr-ube-macapuno-cake',
          variantId: ubeVarId,
          optionIds: [],
          qty: 1,
          note: '',
        },
      ],
    },
    {
      customerIndex: 3,
      placedAt: addMinutes(iso, -200),
      scheduledAt: manilaToDate(nextSaturday, '15:00').toISOString(),
      type: pickup,
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      note: 'Congratulations Sofia on your graduation!',
      lines: [
        {
          itemId: choc?.id ?? 'lr-chocolate-moist-cake',
          variantId: chocVarId,
          optionIds: [],
          qty: 2,
          note: '',
        },
      ],
    },
    {
      customerIndex: 4,
      placedAt: addMinutes(iso, -180),
      scheduledAt: manilaToDate(nextSaturday, '16:00').toISOString(),
      type: pickup,
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      note: 'Happy Birthday Tita Baby!',
      lines: [
        {
          itemId: ube?.id ?? 'lr-ube-macapuno-cake',
          variantId: ubeVarId,
          optionIds: [],
          qty: 1,
          note: '',
        },
      ],
    },
  ];

  // 2. One 40-line party order
  const activeItems = shop.catalog.items.filter(
    (i) => i.status === 'active' && i.variants.length > 0,
  );
  const partyLines: BasketLine[] = [];
  for (let i = 0; i < 40; i += 1) {
    const item = activeItems[i % activeItems.length]!;
    const variant = item.variants[0]!;
    partyLines.push({
      itemId: item.id,
      variantId: variant.id,
      optionIds: [],
      qty: (i % 2) + 1,
      note: i === 0 ? 'Assorted bakery party box' : '',
    });
  }

  const partyOrder: DraftOrder = {
    customerIndex: 5,
    placedAt: addMinutes(iso, -150),
    scheduledAt: manilaToDate(addDays(todayDate, 4), '14:00').toISOString(),
    type: pickup,
    status: 'placed',
    paymentStatus: 'paid',
    paymentMethod: gcash,
    note: 'Big family reunion! Please pack each pastry in individual boxes.',
    lines: partyLines,
  };

  // 3. 20 other scheduled orders over the next 30 days (total 4 + 1 + 20 = 25 scheduled)
  const scheduledDaysOffsets = [
    1, 2, 3, 5, 7, 8, 10, 12, 13, 14, 16, 18, 19, 20, 22, 24, 25, 27, 28, 29,
  ];
  const greetingNotes = [
    'Happy 18th Birthday Chloe!',
    'Best wishes Carlos and Maria!',
    'Thank you teachers!',
    'Welcome home Kuya Noel!',
    'Happy Christening Baby Lucas!',
  ];
  const moreScheduled: DraftOrder[] = scheduledDaysOffsets.map((offset, idx) => {
    const day = addDays(todayDate, offset);
    const hour = 8 + (idx % 8);
    const timeStr = `${String(hour).padStart(2, '0')}:00`;
    return {
      customerIndex: (idx + 6) % NAMES.length,
      placedAt: addMinutes(iso, -100 - idx * 10),
      scheduledAt: manilaToDate(day, timeStr).toISOString(),
      type: idx % 3 === 0 ? 'delivery' : pickup,
      status: 'placed',
      paymentStatus: idx % 2 === 0 ? 'paid' : 'unpaid',
      paymentMethod: idx % 2 === 0 ? gcash : cash,
      note: greetingNotes[idx] ?? null,
      ...(idx % 3 === 0 ? { deliveryFee: delivery.fee, deliveryAddress: delivery.address } : {}),
    };
  });

  // Open orders today
  const todayOpen: DraftOrder[] = [
    {
      customerIndex: 0,
      placedAt: addMinutes(iso, -6),
      type: pickup,
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: cash,
    },
    {
      customerIndex: 1,
      placedAt: addMinutes(iso, -15),
      type: pickup,
      status: 'ready',
      paymentStatus: 'paid',
      paymentMethod: gcash,
    },
    {
      customerIndex: 2,
      placedAt: addMinutes(iso, -3),
      type: typeFor(shop, 'walk_in'),
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: cash,
    },
  ];

  // Past days completed orders
  const pastDays: DraftOrder[] = [];
  for (let day = 1; day <= 3; day += 1) {
    for (let k = 0; k < 3; k += 1) {
      pastDays.push({
        customerIndex: (day * 3 + k) % NAMES.length,
        placedAt: addMinutes(iso, -day * DAY - k * 90),
        type: pickup,
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: cash,
      });
    }
  }

  return [...saturdayCakeOrders, partyOrder, ...moreScheduled, ...todayOpen, ...pastDays];
}

function kapeJuanDrafts(shop: PublicShop, now: Date): DraftOrder[] {
  const iso = now.toISOString();
  const walkIn = typeFor(shop, 'walk_in');
  const pickup = typeFor(shop, 'pickup');
  const gcash = methodFor(shop, pickup, 'gcash');
  const cash = methodFor(shop, pickup, 'cash');
  const todayDate = manilaDate(now);

  // ASAP coffees now
  const todayOpen: DraftOrder[] = [
    {
      customerIndex: 0,
      placedAt: addMinutes(iso, -3),
      type: walkIn,
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: methodFor(shop, walkIn, 'cash'),
      isFirstOrder: true,
    },
    {
      customerIndex: 1,
      placedAt: addMinutes(iso, -7),
      type: pickup,
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: gcash,
    },
    {
      customerIndex: 2,
      placedAt: addMinutes(iso, -12),
      type: pickup,
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: gcash,
    },
    {
      customerIndex: 3,
      placedAt: addMinutes(iso, -18),
      type: walkIn,
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: methodFor(shop, walkIn, 'cash'),
    },
    {
      customerIndex: 4,
      placedAt: addMinutes(iso, -24),
      type: pickup,
      status: 'ready',
      paymentStatus: 'paid',
      paymentMethod: cash,
    },
    {
      customerIndex: 5,
      placedAt: addMinutes(iso, -28),
      type: pickup,
      status: 'ready',
      paymentStatus: 'paid',
      paymentMethod: gcash,
    },
  ];

  // 6 bookings next week
  const cateringItem = shop.catalog.items.find((i) => i.id === 'kj-chicken-pesto-sandwich');
  const cateringVarId = cateringItem?.variants[0]?.id ?? 'kj-chicken-pesto-sandwich--base';
  const bookingsNextWeek: DraftOrder[] = [1, 2, 3, 4, 5, 6].map((dayOffset, idx) => {
    const isCatering = idx === 1;
    return {
      customerIndex: (idx + 6) % NAMES.length,
      placedAt: addMinutes(iso, -150 - idx * 20),
      scheduledAt: manilaToDate(addDays(todayDate, dayOffset), '09:00').toISOString(),
      type: pickup,
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      note: isCatering ? 'Catering meeting booking (10 pax)' : 'Morning office coffee run',
      ...(isCatering && cateringItem
        ? {
            lines: [
              {
                itemId: cateringItem.id,
                variantId: cateringVarId,
                optionIds: [],
                qty: 10,
                note: 'Pack with napkins and cutlery',
              },
            ],
          }
        : {}),
    };
  });

  // Past days completed orders
  const pastDays: DraftOrder[] = [];
  for (let day = 1; day <= 3; day += 1) {
    for (let k = 0; k < 3; k += 1) {
      pastDays.push({
        customerIndex: (day * 3 + k) % NAMES.length,
        placedAt: addMinutes(iso, -day * DAY - k * 90),
        type: pickup,
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: cash,
      });
    }
  }

  return [...todayOpen, ...bookingsNextWeek, ...pastDays];
}

function talaApparelDrafts(shop: PublicShop, now: Date): DraftOrder[] {
  const iso = now.toISOString();
  const pickup: OrderType = 'pickup';
  const delivery = deliveryFor(shop);
  const gcash = methodFor(shop, pickup, 'gcash');
  const bank = methodFor(shop, pickup, 'bank');

  // One ₱12,345.50 order:
  // Weekend Set (1799) x 6 = 10,794
  // Habi-print Midi Dress (1299) x 1 = 1,299
  // Terno-sleeve Blouse (1199) x 1 = 1,199
  // Subtotal = 13,292.00 (1,329,200). Discount = 94650. Total = 1,234,550 centavos = ₱12,345.50!
  const weekendSet = shop.catalog.items.find((i) => i.id === 'ta-weekend-set');
  const habiDress = shop.catalog.items.find((i) => i.id === 'ta-habi-print-midi-dress');
  const ternoBlouse = shop.catalog.items.find((i) => i.id === 'ta-terno-sleeve-blouse');

  const bigOrderLines: BasketLine[] = [
    {
      itemId: weekendSet?.id ?? 'ta-weekend-set',
      variantId: weekendSet?.variants[0]?.id ?? 'ta-weekend-set--s',
      optionIds: [],
      qty: 6,
      note: 'Sizes S to L for bridal entourage',
    },
    {
      itemId: habiDress?.id ?? 'ta-habi-print-midi-dress',
      variantId: habiDress?.variants[0]?.id ?? 'ta-habi-print-midi-dress--m',
      optionIds: [],
      qty: 1,
      note: 'Maid of honour fitting',
    },
    {
      itemId: ternoBlouse?.id ?? 'ta-terno-sleeve-blouse',
      variantId: ternoBlouse?.variants[0]?.id ?? 'ta-terno-sleeve-blouse--m',
      optionIds: [],
      qty: 1,
      note: 'Mother of the bride',
    },
  ];

  const bigOrder: DraftOrder = {
    customerIndex: 2,
    placedAt: addMinutes(iso, -20),
    type: pickup,
    status: 'placed',
    paymentStatus: 'paid',
    paymentMethod: bank,
    discount: 94650,
    rewardTitle: 'VIP Loyalty Discount (₱946.50 off)',
    note: 'Custom bridal party fitting. Please ensure all items are boxed with handwritten tags.',
    lines: bigOrderLines,
  };

  // Other open orders with long product names
  const otherOpen: DraftOrder[] = [
    {
      customerIndex: 0,
      placedAt: addMinutes(iso, -5),
      type: pickup,
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: gcash,
    },
    {
      customerIndex: 1,
      placedAt: addMinutes(iso, -15),
      type: 'delivery',
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      deliveryFee: delivery.fee,
      deliveryAddress: delivery.address,
    },
    {
      customerIndex: 3,
      placedAt: addMinutes(iso, -35),
      type: pickup,
      status: 'ready',
      paymentStatus: 'paid',
      paymentMethod: gcash,
    },
    {
      customerIndex: 4,
      placedAt: addMinutes(iso, -45),
      type: 'delivery',
      status: 'out_for_delivery',
      paymentStatus: 'unpaid',
      paymentMethod: methodFor(shop, 'delivery', 'cod'),
      deliveryFee: delivery.fee,
      deliveryAddress: delivery.address,
      rider: { name: 'Kuya Ronald', phone: '0917 555 8888', provider: 'Lalamove' },
      trackingUrl: 'https://example.com/track/ta-ride-1',
    },
  ];

  // Past days completed orders
  const pastDays: DraftOrder[] = [];
  for (let day = 1; day <= 3; day += 1) {
    for (let k = 0; k < 3; k += 1) {
      pastDays.push({
        customerIndex: (day * 3 + k) % NAMES.length,
        placedAt: addMinutes(iso, -day * DAY - k * 90),
        type: k === 1 ? 'delivery' : pickup,
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: gcash,
        ...(k === 1 ? { deliveryFee: delivery.fee, deliveryAddress: delivery.address } : {}),
      });
    }
  }

  return [bigOrder, ...otherOpen, ...pastDays];
}

function aqualinisDrafts(shop: PublicShop, now: Date): DraftOrder[] {
  const iso = now.toISOString();
  const delivery = deliveryFor(shop);
  const cod = methodFor(shop, 'delivery', 'cod');
  const gcash = methodFor(shop, 'delivery', 'gcash');
  const todayDate = manilaDate(now);
  const tomorrow = addDays(todayDate, 1);

  // Two slots full tomorrow (each slot gets 3 orders, matching ordersPerSlot: 3)
  const slot1Time = manilaToDate(tomorrow, '10:00').toISOString();
  const slot2Time = manilaToDate(tomorrow, '14:00').toISOString();

  const tomorrowFullSlots: DraftOrder[] = [
    // Slot 1 (10:00) - 3 orders
    {
      customerIndex: 0,
      placedAt: addMinutes(iso, -180),
      scheduledAt: slot1Time,
      type: 'delivery',
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: cod,
      deliveryFee: delivery.fee,
      deliveryAddress: 'Block 4 Lot 12, Pamplona Uno, Las Piñas',
      isFirstOrder: false,
    },
    {
      customerIndex: 1,
      placedAt: addMinutes(iso, -160),
      scheduledAt: slot1Time,
      type: 'delivery',
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      deliveryFee: delivery.fee,
      deliveryAddress: 'Unit 301, Talon Village, Las Piñas',
      isFirstOrder: false,
    },
    {
      customerIndex: 2,
      placedAt: addMinutes(iso, -140),
      scheduledAt: slot1Time,
      type: 'delivery',
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: cod,
      deliveryFee: delivery.fee,
      deliveryAddress: '88 Alabang-Zapote Rd., Las Piñas',
      isFirstOrder: false,
    },
    // Slot 2 (14:00) - 3 orders
    {
      customerIndex: 3,
      placedAt: addMinutes(iso, -120),
      scheduledAt: slot2Time,
      type: 'delivery',
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: cod,
      deliveryFee: delivery.fee,
      deliveryAddress: '15 Rosal St., Almanza Uno, Las Piñas',
      isFirstOrder: false,
    },
    {
      customerIndex: 4,
      placedAt: addMinutes(iso, -100),
      scheduledAt: slot2Time,
      type: 'delivery',
      status: 'placed',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      deliveryFee: delivery.fee,
      deliveryAddress: '24 Orchid St., Pamplona Dos, Las Piñas',
      isFirstOrder: false,
    },
    {
      customerIndex: 5,
      placedAt: addMinutes(iso, -80),
      scheduledAt: slot2Time,
      type: 'delivery',
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: cod,
      deliveryFee: delivery.fee,
      deliveryAddress: 'Unit 5A, Las Piñas Residences',
      isFirstOrder: false,
    },
  ];

  // Open orders today
  const todayOpen: DraftOrder[] = [
    {
      customerIndex: 6,
      placedAt: addMinutes(iso, -10),
      type: 'delivery',
      status: 'placed',
      paymentStatus: 'unpaid',
      paymentMethod: cod,
      deliveryFee: delivery.fee,
      deliveryAddress: delivery.address,
      isFirstOrder: false,
    },
    {
      customerIndex: 7,
      placedAt: addMinutes(iso, -20),
      type: 'delivery',
      status: 'preparing',
      paymentStatus: 'paid',
      paymentMethod: gcash,
      deliveryFee: delivery.fee,
      deliveryAddress: delivery.address,
      isFirstOrder: false,
    },
    {
      customerIndex: 8,
      placedAt: addMinutes(iso, -35),
      type: 'delivery',
      status: 'out_for_delivery',
      paymentStatus: 'unpaid',
      paymentMethod: cod,
      deliveryFee: delivery.fee,
      deliveryAddress: delivery.address,
      rider: { name: 'Kuya Danny', phone: '0917 222 3333', provider: 'AquaLinis Fleet' },
      trackingUrl: 'https://example.com/track/aq-ride-1',
      isFirstOrder: false,
    },
  ];

  // Past days completed orders
  const pastDays: DraftOrder[] = [];
  for (let day = 1; day <= 3; day += 1) {
    for (let k = 0; k < 3; k += 1) {
      pastDays.push({
        customerIndex: (day * 3 + k) % NAMES.length,
        placedAt: addMinutes(iso, -day * DAY - k * 90),
        type: 'delivery',
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: cod,
        deliveryFee: delivery.fee,
        deliveryAddress: delivery.address,
        isFirstOrder: false,
      });
    }
  }

  return [...tomorrowFullSlots, ...todayOpen, ...pastDays];
}

function defaultActivityDrafts(shop: PublicShop, now: Date): DraftOrder[] {
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

/** Orders for the owner side: today's board in every status and a few past days. */
function activityDrafts(shop: PublicShop, now: Date): DraftOrder[] {
  const sc = getMockScenario();
  if (sc.ordersMode === 'rush' || shop.storefront.slug === 'kanto-smash') {
    return kantoSmashDrafts(shop, now);
  }
  switch (shop.storefront.slug) {
    case 'lola-remy':
      return lolaRemyDrafts(shop, now);
    case 'kape-juan':
      return kapeJuanDrafts(shop, now);
    case 'tala-apparel':
      return talaApparelDrafts(shop, now);
    case 'aqualinis':
      return aqualinisDrafts(shop, now);
    default:
      return defaultActivityDrafts(shop, now);
  }
}

/** Builds every generated order for a shop, numbered gap-free per Manila day in placement order. */
export function generateOrders(shop: PublicShop, now: Date, rng: Rng): OrderRecord[] {
  const slug = shop.storefront.slug;
  if (shop.catalog.items.length === 0) return [];
  const drafts = [...activityDrafts(shop, now), ...demoReceiptDrafts(shop, now)]
    .map(({ lineCount, qtyBoost, ...d }) => {
      const lines = d.lines ?? orderableLines(shop, now, rng, lineCount ?? int(rng, 1, 3));
      return {
        ...d,
        lines: qtyBoost ? lines.map((l) => ({ ...l, qty: l.qty * qtyBoost })) : lines,
      };
    })
    .filter((d) => d.lines.length > 0)
    .sort((a, b) => a.placedAt.localeCompare(b.placedAt));
  const counters = new Map<string, number>();
  let openCount = 0;
  return drafts.map((d, index) => {
    const date = manilaDate(d.placedAt);
    const orderNo = (counters.get(date) ?? 0) + 1;
    counters.set(date, orderNo);
    const customer = d.customer ?? customerFor(d.customerIndex ?? index);
    const { customerIndex: _unused, ...rest } = d;
    void _unused;
    const isOpen = ['placed', 'preparing', 'ready', 'out_for_delivery'].includes(d.status);
    let seenAt = rest.seenAt;
    if (isOpen) {
      if (seenAt === undefined) {
        seenAt = openCount % 2 === 0 ? addMinutes(d.placedAt, 2) : null;
      }
      openCount += 1;
    }
    return buildOrder(shop, {
      ...rest,
      ...(seenAt !== undefined ? { seenAt } : {}),
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
