// Demo members and guests for one shop (decision T57, D6): who they are, their past orders and a stamp history
// replayed from those orders with the shop's own rules, so every number on the Members page adds up.
import {
  addDays,
  isAlmost,
  manilaDate,
  manilaToDate,
  memberQrUrl,
  type PublicShop,
} from '@smartapp/core';
import { int, pick, token, type Rng } from './rng';
import {
  addMinutes,
  type ArchivedOrder,
  type MemberRecord,
  type OrderRecord,
  type StoredClaim,
  type StoredLedgerEntry,
} from './state';

// The first ten are the live order customers (activity.ts customerFor), so today's orders link to them.
export const MEMBER_NAMES = [
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
  'Carla Mendoza-Villanueva de los Santos',
  'Jun Reyes',
  'Ana Lim',
  'Bea Villanueva',
  'Carlo Dizon',
  'Dana Soriano',
  'Elmer Castillo',
  'Fe Manalo',
  'Gino Pascual',
  'Hazel Tolentino',
  'Ivy Salazar',
  'Jaypee Ocampo',
  'Kristine Lopez',
  'Leo Francisco',
  'Mika Valdez',
  'Nico de Guzman',
  'Olive Panganiban',
  'Pia Gonzales',
  'Ramon Aguilar',
  'Sheila Mercado',
  'Toni Domingo',
  'Uly Fernandez',
  'Vince Ramirez',
  'Weng Bautista',
  'Xandra Cruz',
  'Yeng Morales',
] as const;

const GUEST_NAMES = [
  'Arnel Santiago',
  'Bong Rivera',
  'Cathy Javier',
  'Dennis Robles',
  'Edna Flores',
  'Ferdie Sison',
  'Gemma Torres',
  'Hector Andrada',
  'Irene Del Rosario',
  'Jomar Pineda',
  'Karen Uy',
  'Lito Samonte',
  'Marites Cabrera',
  'Noel Bernardo',
  'Odette Lacson',
  'Pepito Natividad',
  'Queenie Yap',
  'Rhea Concepcion',
  'Sonny Vergara',
  'Tess Abad',
  'Ulysses Ilagan',
  'Vilma Encarnacion',
  'Wilfredo Tan',
  'Zeny Marquez',
] as const;

const NOTES = [
  'Less ice, oat milk',
  'Usually pays with GCash',
  'Allergic to peanuts',
  null,
] as const;

export interface Community {
  members: MemberRecord[];
  archive: ArchivedOrder[];
  // Prize pieces held by claims that were not cancelled (D8).
  piecesHeld: number;
}

const emailOf = (name: string): string =>
  `${name
    .toLowerCase()
    .replace(/[^a-z]+/g, '.')
    .replace(/^\.|\.$/g, '')}@example.com`;

interface Sellable {
  name: string;
  price: number;
}

function sellables(shop: PublicShop): Sellable[] {
  return shop.catalog.items
    .filter((i) => i.status === 'active')
    .flatMap((i) => {
      const v = i.variants[0];
      return v ? [{ name: i.name, price: v.priceOverride ?? v.price }] : [];
    });
}

/** Order lines for one past order: mostly the person's favourite, enough to reach `atLeast` when set. */
function basket(
  rng: Rng,
  items: readonly Sellable[],
  favourite: Sellable,
  atLeast: number,
  below: number | null,
): { lines: { name: string; qty: number }[]; subtotal: number } {
  if (below !== null) {
    const cheap = items.filter((i) => i.price < below).sort((a, b) => a.price - b.price)[0];
    if (cheap) return { lines: [{ name: cheap.name, qty: 1 }], subtotal: cheap.price };
  }
  const lines: { name: string; qty: number }[] = [{ name: favourite.name, qty: int(rng, 1, 2) }];
  let subtotal = favourite.price * (lines[0]?.qty ?? 1);
  if (rng() < 0.5) {
    const extra = pick(rng, items);
    const qty = 1;
    const same = lines.find((l) => l.name === extra.name);
    if (same) same.qty += qty;
    else lines.push({ name: extra.name, qty });
    subtotal += extra.price * qty;
  }
  const first = lines[0];
  while (subtotal < atLeast && first && first.qty < 12) {
    first.qty += 1;
    subtotal += favourite.price;
  }
  return { lines, subtotal };
}

function orderTime(now: Date, daysAgo: number, rng: Rng): string {
  const date = addDays(manilaDate(now), -daysAgo);
  const hour = int(rng, 10, 19);
  const minute = int(rng, 0, 11) * 5;
  return manilaToDate(date, `${hour}:${String(minute).padStart(2, '0')}`).toISOString();
}

/** Distinct day offsets in [from, to], newest last. */
function days(rng: Rng, count: number, from: number, to: number): number[] {
  const picked = new Set<number>();
  const span = Math.max(1, to - from + 1);
  let guard = 0;
  while (picked.size < Math.min(count, span) && guard < count * 20) {
    picked.add(from + Math.floor(rng() * span));
    guard += 1;
  }
  return [...picked].sort((a, b) => b - a);
}

/**
 * Members and guests with past orders. Each member gets a target balance and a number of rewards used; the
 * earning orders are made to match, then the history is replayed in time order with the shop's rules.
 */
export function generateCommunity(
  shop: PublicShop,
  liveOrders: OrderRecord[],
  now: Date,
  rng: Rng,
): Community {
  const slug = shop.storefront.slug;
  const card = shop.storefront.stampCard;
  const goal = card.rule.stampsNeeded;
  const min = card.rule.minOrderTotal;
  const custom = card.reward.kind === 'custom';
  const items = sellables(shop);
  const prefix = slug.slice(0, 2).toUpperCase();
  const iso = now.toISOString();
  const archive: ArchivedOrder[] = [];
  let piecesHeld = 0;
  let seq = 0;

  const archiveOrder = (
    person: { name: string; phone: string; email: string | null },
    placedAt: string,
    picked: { lines: { name: string; qty: number }[]; subtotal: number },
    status: ArchivedOrder['status'],
  ): ArchivedOrder => {
    seq += 1;
    const order: ArchivedOrder = {
      id: `${slug}-a-${seq}`,
      orderNo: int(rng, 1, 40),
      placedAt,
      status,
      subtotal: picked.subtotal,
      total: picked.subtotal,
      lines: picked.lines,
      customerName: person.name,
      customerPhone: person.phone,
      customerEmail: person.email,
    };
    archive.push(order);
    return order;
  };

  const members: MemberRecord[] = [];
  if (card.status !== 'off' && items.length > 0) {
    MEMBER_NAMES.forEach((name, i) => {
      const phone = `+63917000${String((i < 10 ? 2000 : 2100) + i).padStart(4, '0')}`;
      const email = emailOf(name);
      const person = { name, phone, email };
      const favourite = items[(i * 7) % items.length] ?? pick(rng, items);
      const isNew = i % 6 === 5 || i === 13;
      const isQuiet = i >= 10 && i % 7 === 3;
      const joinedDaysAgo = isNew
        ? i === 13
          ? int(rng, 14, 26)
          : int(rng, 1, 12)
        : int(rng, 40, 220);
      const lastDaysAgo = isQuiet ? int(rng, 34, 80) : i < 10 ? 4 : int(rng, 4, 18);

      // Targets: a few ready, a handful one or two away, the rest spread along the card.
      const ready = i === 2 || i === 11 || i === 23;
      const almost = [1, 5, 14, 19, 27, 33].includes(i);
      let balance = ready
        ? goal
        : almost
          ? goal - (isAlmost(goal - 2, goal) && i % 2 === 0 ? 2 : 1)
          : int(rng, 0, Math.max(0, goal - (goal <= 5 ? 2 : 3)));
      const tenure = joinedDaysAgo - lastDaysAgo;
      let rounds = isNew || ready ? 0 : Math.min(Math.floor((tenure / 70) * (0.5 + rng())), 3);
      if (custom && card.reward.onePerCustomer) rounds = Math.min(rounds, 1);
      // A prize claimed in the last few days that the owner hasn't handed over yet.
      const waiting = custom && (i === 4 || i === 17);
      if (waiting) {
        rounds = 1;
        balance = int(rng, 0, 1);
      }
      if (balance === 0 && rounds === 0) balance = card.rule.welcomeStamps;

      const liveDone = liveOrders.filter(
        (o) =>
          o.customerEmail === email &&
          o.receipt.status === 'completed' &&
          o.receipt.totals.subtotal >= min,
      );
      const earning = Math.max(
        0,
        balance + rounds * goal - card.rule.welcomeStamps - liveDone.length,
      );
      const extra = min > 0 ? int(rng, 0, 2) : 0;
      const span = Math.max(earning + extra + 2, joinedDaysAgo - lastDaysAgo);
      const offsets = days(rng, earning + extra, lastDaysAgo, lastDaysAgo + span);
      const joined = Math.max(joinedDaysAgo, (offsets[0] ?? lastDaysAgo) + 1);
      const joinedAt = addMinutes(orderTime(now, joined, rng), -30);
      const nonEarning = new Set(
        offsets.length > earning ? days(rng, offsets.length - earning, 0, offsets.length - 1) : [],
      );

      const ledger: StoredLedgerEntry[] = [];
      const claims: StoredClaim[] = [];
      let lineSeq = 0;
      const line = (entry: Omit<StoredLedgerEntry, 'id'>): void => {
        lineSeq += 1;
        ledger.push({ id: `${slug}-l-${i}-${lineSeq}`, note: null, undone: false, ...entry });
      };
      if (card.rule.welcomeStamps > 0) {
        line({
          kind: 'welcome',
          delta: card.rule.welcomeStamps,
          reasonCategory: null,
          orderNo: null,
          at: joinedAt,
          byOwner: false,
        });
      }

      let have = card.rule.welcomeStamps;
      let roundsLeft = rounds;
      let owed = false;
      const useReward = (at: string, orderNo: number | null): void => {
        owed = false;
        roundsLeft -= 1;
        have -= goal;
        if (custom) {
          const isWaiting = waiting && roundsLeft === 0;
          const claimAt = isWaiting ? addMinutes(iso, -int(rng, 1, 4) * 1440 - 90) : at;
          const code = `${prefix}-${token(rng).slice(0, 6).toUpperCase()}`;
          claims.push({
            id: `${slug}-c-${i}-${claims.length + 1}`,
            code,
            status: isWaiting ? 'pending' : 'given',
            qrUrl: memberQrUrl(code),
            title: card.reward.title,
            createdAt: claimAt,
            givenAt: isWaiting ? null : addMinutes(claimAt, int(rng, 20, 1440)),
            cancelledAt: null,
            cancelReason: null,
          });
          piecesHeld += 1;
          line({
            kind: 'claimed',
            delta: -goal,
            reasonCategory: null,
            orderNo: null,
            at: claimAt,
            byOwner: false,
          });
          return;
        }
        line({
          kind: 'used',
          delta: -goal,
          reasonCategory: null,
          orderNo,
          at,
          byOwner: orderNo === null,
        });
      };

      offsets.forEach((daysAgo, k) => {
        const earns = !nonEarning.has(k);
        const placedAt = orderTime(now, daysAgo, rng);
        const picked = basket(
          rng,
          items,
          favourite,
          earns ? min : 0,
          earns || min === 0 ? null : min,
        );
        const cancelled = !earns && rng() < 0.3;
        const order = archiveOrder(person, placedAt, picked, cancelled ? 'cancelled' : 'completed');
        if (owed && !custom && !cancelled) useReward(placedAt, order.orderNo);
        if (!earns || cancelled) return;
        line({
          kind: 'earned',
          delta: 1,
          reasonCategory: null,
          orderNo: order.orderNo,
          at: addMinutes(placedAt, 25),
          byOwner: false,
        });
        have += 1;
        if (have >= goal && roundsLeft > 0) {
          owed = true;
          if (custom) useReward(addMinutes(placedAt, int(rng, 60, 2 * 1440)), null);
        }
      });
      for (const o of liveDone) {
        line({
          kind: 'earned',
          delta: 1,
          reasonCategory: null,
          orderNo: o.receipt.orderNo,
          at: o.receipt.events[o.receipt.events.length - 1]?.at ?? o.receipt.placedAt,
          byOwner: false,
        });
        have += 1;
        o.memberEmail = email;
        o.stamp = 'earned';
      }
      if (owed) useReward(addMinutes(iso, -(lastDaysAgo - 1) * 1440), null);

      // A few counter lines so the history shows who did what (D4).
      if (!ready && !almost && !waiting && i % 9 === 4) {
        line({
          kind: 'given',
          delta: 1,
          reasonCategory: 'counter_purchase',
          orderNo: null,
          at: orderTime(now, lastDaysAgo + 1, rng),
          note: 'Paid cash at the counter',
          byOwner: true,
        });
      }
      if (!ready && !almost && !waiting && i % 13 === 6) {
        const at = orderTime(now, lastDaysAgo + 2, rng);
        line({
          kind: 'given',
          delta: 1,
          reasonCategory: 'counter_purchase',
          orderNo: null,
          at,
          byOwner: true,
        });
        line({
          kind: 'removed',
          delta: -1,
          reasonCategory: 'correction',
          orderNo: null,
          at: addMinutes(at, 3),
          note: 'Tapped twice',
          byOwner: true,
        });
      }

      // Open orders from a member will earn a stamp when completed.
      for (const o of liveOrders) {
        if (o.customerEmail !== email || o.receipt.status === 'completed') continue;
        o.memberEmail = email;
        if (
          card.status === 'on' &&
          !['cancelled', 'expired'].includes(o.receipt.status) &&
          o.receipt.totals.subtotal >= min
        )
          o.stamp = 'pending';
      }

      members.push({
        slug,
        email,
        name,
        phone,
        memberCode: `${prefix}-${String(4100 + i * 37).padStart(4, '0')}`,
        joinedAt,
        ledger: ledger.sort((a, b) => a.at.localeCompare(b.at)),
        addresses: [],
        claims,
        byCustomer: false,
        note: i % 8 === 0 ? (NOTES[(i / 8) % NOTES.length] ?? null) : null,
      });
    });
  }

  // Guests: ordered without joining. Grouped by mobile number on the owner side, never merged (M12).
  GUEST_NAMES.forEach((name, j) => {
    const person = {
      name,
      phone: `+63918000${String(5000 + j).padStart(4, '0')}`,
      email: j % 3 === 0 ? emailOf(name) : null,
    };
    if (items.length === 0) return;
    const favourite = items[(j * 5 + 3) % items.length] ?? pick(rng, items);
    const count = int(rng, 1, 4);
    for (const daysAgo of days(rng, count, int(rng, 3, 30), 120)) {
      archiveOrder(
        person,
        orderTime(now, daysAgo, rng),
        basket(rng, items, favourite, 0, null),
        'completed',
      );
    }
  });

  return {
    members,
    archive: archive.sort((a, b) => a.placedAt.localeCompare(b.placedAt)),
    piecesHeld,
  };
}
