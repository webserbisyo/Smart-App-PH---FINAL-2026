// What the owner's Members page reads, worked out from orders and the stamp history (D6). The SQL functions
// in phase 4 return the same shapes, with the same core rules.
import {
  changesLeftToday,
  CustomerPageSchema,
  CustomerRowSchema,
  formatPhPhone,
  isFinal,
  manilaDate,
  MemberDetailSchema,
  memberCodeMatches,
  memberSegments,
  MembersOverviewSchema,
  OwnerClaimSchema,
  recentCounterStamp,
  usuallyBuys,
  USUALLY_BUYS_DAYS,
  CUSTOMER_FILTERS,
  type CounterEntry,
  type CustomerFilter,
  type CustomerPage,
  type CustomerRow,
  type ListCustomersInput,
  type MemberDetail,
  type MembersOverview,
  type OrderStatus,
  type OwnerClaim,
  type OwnerLedgerEntry,
} from '@smartapp/core';
import {
  guestId,
  memberBalance,
  memberId,
  type MemberRecord,
  type ShopState,
  type StoredClaim,
  type StoredLedgerEntry,
} from './state';

const DAY_MS = 86_400_000;
const NEAR_LIMIT = 20;
const ORDERS_SHOWN = 20;

export interface PersonOrder {
  id: string;
  orderNo: number;
  placedAt: string;
  status: OrderStatus;
  total: number;
  lines: { name: string; qty: number }[];
}

export interface Person {
  id: string;
  member: MemberRecord | null;
  name: string;
  phone: string;
  email: string | null;
  orders: PersonOrder[];
}

/** Members (by email, the way orders link) and guests (by mobile number, for display only, M12). */
export function peopleOf(s: ShopState): Person[] {
  const byEmail = new Map<string, Person>();
  const people: Person[] = s.members.map((m) => {
    const p: Person = {
      id: memberId(m),
      member: m,
      name: m.name,
      phone: m.phone,
      email: m.email,
      orders: [],
    };
    byEmail.set(m.email, p);
    return p;
  });
  const guests = new Map<string, Person>();
  const place = (email: string | null, phone: string, name: string, order: PersonOrder): void => {
    const member = email ? byEmail.get(email) : undefined;
    if (member) {
      member.orders.push(order);
      return;
    }
    let guest = guests.get(phone);
    if (!guest) {
      guest = { id: guestId(phone), member: null, name, phone, email, orders: [] };
      guests.set(phone, guest);
    }
    guest.orders.push(order);
  };
  for (const a of s.archive ?? []) {
    place(a.customerEmail, a.customerPhone, a.customerName, {
      id: a.id,
      orderNo: a.orderNo,
      placedAt: a.placedAt,
      status: a.status,
      total: a.total,
      lines: a.lines,
    });
  }
  for (const o of s.orders) {
    place(o.memberEmail ?? o.customerEmail, o.customerPhone, o.receipt.customerName, {
      id: o.id,
      orderNo: o.receipt.orderNo,
      placedAt: o.receipt.placedAt,
      status: o.receipt.status,
      total: o.receipt.totals.total,
      lines: o.receipt.lines.map((l) => ({ name: l.name, qty: l.qty })),
    });
  }
  for (const p of [...people, ...guests.values()])
    p.orders.sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  return [...people, ...guests.values()];
}

export const entryIdOf = (member: MemberRecord, e: StoredLedgerEntry, index: number): string =>
  e.id ?? `${memberId(member)}-l${index}`;

export const claimIdOf = (member: MemberRecord, c: StoredClaim): string =>
  c.id ?? `${memberId(member)}-${c.code}`;

/** Lines the owner made at the counter; older lines without the flag count by their kind. */
const isByOwner = (e: StoredLedgerEntry): boolean =>
  e.byOwner ?? (e.kind === 'given' || e.kind === 'removed');

export function counterEntries(member: MemberRecord): CounterEntry[] {
  return member.ledger.map((e) => ({
    kind: e.kind,
    at: e.at,
    byOwner: isByOwner(e),
    undone: e.undone ?? false,
    reasonCategory: e.reasonCategory,
  }));
}

export function ownerLedger(member: MemberRecord): OwnerLedgerEntry[] {
  return member.ledger
    .map((e, index) => ({
      id: entryIdOf(member, e, index),
      kind: e.kind,
      delta: e.delta,
      reasonCategory: e.reasonCategory,
      orderNo: e.orderNo,
      at: e.at,
      note: e.note ?? null,
      byOwner: isByOwner(e),
      undone: e.undone ?? false,
    }))
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function ownerClaim(member: MemberRecord, c: StoredClaim): OwnerClaim {
  return OwnerClaimSchema.parse({
    id: claimIdOf(member, c),
    code: c.code,
    status: c.status,
    title: c.title,
    createdAt: c.createdAt,
    givenAt: c.givenAt ?? null,
    cancelledAt: c.cancelledAt ?? null,
    cancelReason: c.cancelReason ?? null,
    customerId: memberId(member),
    memberName: member.name,
  });
}

interface Stats {
  visits: number;
  spent: number;
  lastOrderAt: string | null;
  firstOrderAt: string | null;
}

function statsOf(p: Person): Stats {
  const done = p.orders.filter((o) => o.status === 'completed');
  return {
    visits: done.length,
    spent: done.reduce((sum, o) => sum + o.total, 0),
    lastOrderAt: done[0]?.placedAt ?? null,
    firstOrderAt: done[done.length - 1]?.placedAt ?? null,
  };
}

export function customerRow(s: ShopState, p: Person, now: Date): CustomerRow {
  const card = s.shop.storefront.stampCard;
  const goal = card.rule.stampsNeeded;
  const stats = statsOf(p);
  const m = p.member;
  const balance = m ? Math.max(0, memberBalance(m)) : 0;
  return CustomerRowSchema.parse({
    id: p.id,
    isMember: m !== null,
    name: p.name,
    phone: formatPhPhone(p.phone),
    memberCode: m?.memberCode ?? null,
    balance,
    goal,
    segments: m
      ? memberSegments(
          {
            balance,
            goal,
            cardStatus: card.status,
            completedOrders: stats.visits,
            lastOrderAt: stats.lastOrderAt,
            joinedAt: m.joinedAt,
          },
          now,
        )
      : [],
    visits: stats.visits,
    spent: stats.spent,
    lastOrderAt: stats.lastOrderAt,
    joinedAt: m?.joinedAt ?? null,
    prizeToGive: m?.claims.some((c) => c.status === 'pending') ?? false,
  });
}

export function memberDetail(s: ShopState, p: Person, now: Date): MemberDetail {
  const row = customerRow(s, p, now);
  const stats = statsOf(p);
  const m = p.member;
  const since = now.getTime() - USUALLY_BUYS_DAYS * DAY_MS;
  const recentLines = p.orders
    .filter((o) => o.status === 'completed' && new Date(o.placedAt).getTime() >= since)
    .flatMap((o) => o.lines);
  const pendingStamps = m
    ? s.orders.filter(
        (o) => o.memberEmail === m.email && o.stamp === 'pending' && !isFinal(o.receipt.status),
      ).length
    : 0;
  return MemberDetailSchema.parse({
    ...row,
    email: p.email,
    pendingStamps,
    averageOrder: stats.visits > 0 ? Math.round(stats.spent / stats.visits) : 0,
    usuallyBuys: usuallyBuys(recentLines),
    firstOrderAt: stats.firstOrderAt,
    note: m?.note ?? null,
    changesLeftToday: m ? changesLeftToday(counterEntries(m), now) : 0,
    lastCounterStampAt: m ? recentCounterStamp(counterEntries(m), now) : null,
    history: m ? ownerLedger(m) : [],
    orders: p.orders.slice(0, ORDERS_SHOWN).map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      placedAt: o.placedAt,
      status: o.status,
      total: o.total,
      itemsSummary: o.lines.map((l) => `${l.qty} × ${l.name}`).join(', '),
    })),
    claims: m
      ? [...m.claims]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((c) => ownerClaim(m, c))
      : [],
  });
}

const inFilter = (row: CustomerRow, filter: CustomerFilter): boolean => {
  if (filter === 'guests') return !row.isMember;
  if (!row.isMember) return false;
  if (filter === 'all') return true;
  return row.segments.includes(filter);
};

function matchesQuery(row: CustomerRow, q: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  if (row.name.toLowerCase().includes(query)) return true;
  const digits = query.replace(/\D/g, '');
  // "0917 000 2001", "9170002001" and "+63 917…" all find the same number.
  const phoneDigits = row.phone.replace(/\D/g, '');
  const wanted = digits.startsWith('63') ? `0${digits.slice(2)}` : digits;
  if (digits.length >= 4 && (phoneDigits.includes(wanted) || `0${phoneDigits}`.includes(wanted)))
    return true;
  return row.memberCode !== null && memberCodeMatches(row.memberCode, q);
}

const byName = (a: CustomerRow, b: CustomerRow): number => a.name.localeCompare(b.name);

function sortRows(rows: CustomerRow[], sort: ListCustomersInput['sort']): CustomerRow[] {
  return [...rows].sort((a, b) => {
    switch (sort) {
      case 'stamps':
        return b.balance - a.balance || byName(a, b);
      case 'spent':
        return b.spent - a.spent || byName(a, b);
      case 'name':
        return byName(a, b);
      default:
        return (b.lastOrderAt ?? '').localeCompare(a.lastOrderAt ?? '') || byName(a, b);
    }
  });
}

export function listPage(rows: CustomerRow[], input: ListCustomersInput): CustomerPage {
  const goal = rows[0]?.goal ?? 1;
  const filtered = sortRows(
    rows.filter(
      (r) =>
        inFilter(r, input.filter) &&
        matchesQuery(r, input.q) &&
        (input.stamps === null ||
          (input.stamps >= goal ? r.balance >= goal : r.balance === input.stamps)),
    ),
    input.sort,
  );
  const page = filtered.slice(input.cursor, input.cursor + input.limit);
  const next = input.cursor + page.length;
  return CustomerPageSchema.parse({
    rows: page,
    total: filtered.length,
    nextCursor: next < filtered.length ? next : null,
  });
}

export function overview(s: ShopState, rows: CustomerRow[], now: Date): MembersOverview {
  const card = s.shop.storefront.stampCard;
  const goal = card.rule.stampsNeeded;
  const members = rows.filter((r) => r.isMember);
  const month = manilaDate(now).slice(0, 7);
  const progress = Array.from({ length: goal + 1 }, () => 0);
  for (const r of members) {
    const at = Math.min(r.balance, goal);
    progress[at] = (progress[at] ?? 0) + 1;
  }
  const counts = Object.fromEntries(
    CUSTOMER_FILTERS.map((f) => [f, rows.filter((r) => inFilter(r, f)).length]),
  );
  const rewardsGiven = s.members.reduce(
    (sum, m) =>
      sum +
      m.ledger.filter((e) => e.kind === 'used' && !(e.undone ?? false)).length +
      m.claims.filter((c) => c.status === 'given').length,
    0,
  );
  return MembersOverviewSchema.parse({
    cardStatus: card.status,
    goal,
    members: members.length,
    guests: rows.length - members.length,
    joinedThisMonth: members.filter(
      (r) => r.joinedAt && manilaDate(r.joinedAt).slice(0, 7) === month,
    ).length,
    rewardsGiven,
    counts,
    progress,
    prizesToGive: members.filter((r) => r.prizeToGive).length,
    near:
      card.status === 'off'
        ? []
        : sortRows(
            members.filter((r) => r.segments.includes('almost')),
            'last_order',
          ).slice(0, NEAR_LIMIT),
  });
}
