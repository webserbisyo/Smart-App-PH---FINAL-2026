import { randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  ACTIVITY_SHOWN,
  canUndo,
  changesLeftToday,
  ClaimCancelReasonEnum,
  ClaimStatusEnum,
  CounterChangeSchema,
  CUSTOMER_FILTERS,
  CustomerPageSchema,
  CustomerRowSchema,
  defaultMemberFace,
  FoundMemberSchema,
  formatPhPhone,
  LedgerKindEnum,
  ManualReasonEnum,
  MemberActivityKindEnum,
  MemberDetailSchema,
  memberSegments,
  MembersOverviewSchema,
  membersWords,
  normaliseMemberCode,
  OrderStatusEnum,
  OwnerAvatarSchema,
  OwnerClaimSchema,
  PULSE_DAYS,
  recentCounterStamp,
  STAMP_WEEK_DAYS,
  StampCardImpactSchema,
  stampImpact,
  TOP_SUKI,
  UNDO_SECONDS,
  usuallyBuys,
  USUALLY_BUYS_DAYS,
  type AdjustStampsInput,
  type ClaimCancelReason,
  type CounterChange,
  type CounterEntry,
  type CustomerFilter,
  type CustomerPage,
  type CustomerRow,
  type FoundMember,
  type ListCustomersInput,
  type MemberActivity,
  type MemberDetail,
  type MemberSegment,
  type MembersOverview,
  type MemberSales,
  type OwnerClaim,
  type OwnerLedgerEntry,
  type StampCardImpact,
  type StampCardSettings,
  type StampCardStatus,
} from '@smartapp/core';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { members, rewardClaims, stampCards, stampEntries } from '../db/generated/schema.js';
import { MediaService } from '../media/media.service.js';
import { uuidOrNull } from '../orders/order-book.js';
import { ShopReader } from '../public/shop-reader.js';
import { MemberAccounts, type MemberRow } from './member-accounts.js';
import { StampLedger } from './stamp-ledger.js';

const DAY_MS = 86_400_000;
const NEAR_LIMIT = 20;
const ORDERS_SHOWN = 20;
const CLAIM_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const GUEST_PREFIX = 'g-';

/** One person on Members: a member, or a guest grouped by mobile number for display only (M12). */
interface Person {
  id: string;
  member: MemberRow | null;
  name: string;
  phone: string;
  balance: number;
  prizeToGive: boolean;
  visits: number;
  spent: number;
  lastOrderAt: string | null;
  firstOrderAt: string | null;
  recentVisits: number;
  recentSpent: number;
}

interface Entry {
  id: string;
  kind: string;
  delta: number;
  reasonCategory: string | null;
  privateNote: string | null;
  orderNo: number | null;
  undoesId: string | null;
  byUserId: string | null;
  clientKey: string | null;
  claimId: string | null;
  at: string;
}

function iso(value: string | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

function num(value: unknown): number {
  return Number(value ?? 0);
}

/**
 * The owner's Members area (api.md "Members (owner)", launch phase 6): the stamp card, the list of members
 * and guests, a member's panel, counter stamps with Undo, prizes. Numbers are worked out from orders and the
 * stamp history on each read (T60): nothing is stored twice. The shop comes from the owner's login.
 */
@Injectable()
export class OwnerMembersService {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(ShopReader) private readonly shops: ShopReader,
    @Inject(MemberAccounts) private readonly accounts: MemberAccounts,
    @Inject(StampLedger) private readonly ledger: StampLedger,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  // ---- The stamp card --------------------------------------------------------------------------

  getStampCard(): Promise<StampCardSettings> {
    return this.shops.stampCard();
  }

  /** What a change would do before it is saved, both ways (M9). */
  async previewStampCardChange(next: StampCardSettings): Promise<StampCardImpact> {
    const card = await this.shops.stampCard();
    const balances = await this.balances();
    const pending = await this.db.tx.execute<{ n: number }>(sql`
      select count(*)::int as n from public.reward_claims
      where tenant_id = ${this.db.shopId} and status = 'pending'`);
    return StampCardImpactSchema.parse({
      ...stampImpact(balances, card.rule.stampsNeeded, next.rule.stampsNeeded),
      pendingClaims: num(pending.rows[0]?.n),
    });
  }

  /**
   * Saves the card. A free item must be on the menu; pieces can be added, never set below what claims already
   * hold (M7), and only a custom prize has pieces.
   */
  async saveStampCard(next: StampCardSettings): Promise<StampCardSettings> {
    const shopId = this.db.shopId;
    await this.db.tx.execute(
      sql`select 1 from public.stamp_cards where tenant_id = ${shopId} for update`,
    );
    const card = await this.shops.stampCard();
    const reward = next.reward;
    let itemId: string | null = null;
    let variantId: string | null = null;
    if (reward.kind === 'free_item') {
      itemId = uuidOrNull(reward.itemId ?? undefined);
      variantId = uuidOrNull(reward.variantId ?? undefined);
      const found =
        itemId && variantId
          ? await this.db.tx.execute(sql`
              select 1 from public.items i join public.item_variants v on v.item_id = i.id
              where i.tenant_id = ${shopId} and i.id = ${itemId}::uuid and v.id = ${variantId}::uuid
                and i.status = 'active'`)
          : { rows: [] };
      if (found.rows.length === 0) throw new ApiFailure('item_unavailable', 409);
    }
    const held =
      card.reward.quantityTotal !== null && card.reward.quantityLeft !== null
        ? card.reward.quantityTotal - card.reward.quantityLeft
        : 0;
    const total = reward.kind === 'custom' ? reward.quantityTotal : null;
    if (total !== null && total < held) {
      throw new ApiFailure('invalid_input', 422, {
        quantityTotal: [membersWords.piecesBelowHeld(held)],
      });
    }
    const image = reward.image ? await this.media.fileOf(reward.image, ['item']) : null;
    const values = {
      status: next.status,
      minOrderTotal: next.rule.minOrderTotal,
      stampsNeeded: next.rule.stampsNeeded,
      welcomeStamps: next.rule.welcomeStamps,
      maxEarned: next.rule.maxEarned,
      period: next.rule.period,
      rewardKind: reward.kind,
      rewardAmount: reward.kind === 'discount' ? reward.amount : null,
      rewardItemId: itemId,
      rewardVariantId: variantId,
      rewardTitle: reward.title.trim().slice(0, 60),
      rewardDescription: reward.description?.trim()
        ? reward.description.trim().slice(0, 200)
        : null,
      rewardMediaId: image?.id ?? null,
      quantityTotal: total,
      quantityLeft: total === null ? null : total - held,
      onePerCustomer: reward.onePerCustomer,
      updatedAt: new Date().toISOString(),
    };
    await this.db.tx
      .insert(stampCards)
      .values({ tenantId: shopId, ...values })
      .onConflictDoUpdate({ target: stampCards.tenantId, set: values });
    return this.shops.stampCard();
  }

  async setStampCardStatus(status: StampCardStatus): Promise<StampCardSettings> {
    const card = await this.shops.stampCard();
    const updated = await this.db.tx
      .update(stampCards)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(stampCards.tenantId, this.db.shopId))
      .returning({ status: stampCards.status });
    // A shop that never saved its card saves the starting one with this status.
    if (updated.length === 0) return this.saveStampCard({ ...card, status });
    return this.shops.stampCard();
  }

  // ---- The list and the overview ---------------------------------------------------------------

  async getMembersOverview(): Promise<MembersOverview> {
    const now = new Date();
    const card = await this.shops.stampCard();
    const people = await this.people();
    const rows = people.map((p) => this.row(p, card, now));
    const memberRows = rows.filter((r) => r.isMember);
    const goal = card.rule.stampsNeeded;
    const progress = Array.from({ length: goal + 1 }, () => 0);
    for (const r of memberRows) {
      const at = Math.min(r.balance, goal);
      progress[at] = (progress[at] ?? 0) + 1;
    }
    const counts = Object.fromEntries(
      CUSTOMER_FILTERS.map((f) => [f, rows.filter((r) => inFilter(r, f)).length]),
    );
    const given = await this.db.tx.execute<{ n: number }>(sql`
      select
        (select count(*) from public.stamp_entries e
          where e.tenant_id = ${this.db.shopId} and e.kind = 'used'
            and not exists (select 1 from public.stamp_entries u where u.undoes_id = e.id))
        + (select count(*) from public.reward_claims c
          where c.tenant_id = ${this.db.shopId} and c.status = 'given') as n`);
    return MembersOverviewSchema.parse({
      cardStatus: card.status,
      goal,
      members: memberRows.length,
      guests: rows.length - memberRows.length,
      rewardsGiven: num(given.rows[0]?.n),
      counts,
      progress,
      prizesToGive: memberRows.filter((r) => r.prizeToGive).length,
      near:
        card.status === 'off'
          ? []
          : sortRows(
              memberRows.filter((r) => r.segments.includes('almost')),
              'last_order',
            ).slice(0, NEAR_LIMIT),
      pulse: await this.pulse(people, rows, now),
    });
  }

  /** Each member's groups right now (T57), for the News audiences. Guests have none. */
  async memberSegmentsNow(): Promise<Map<string, readonly MemberSegment[]>> {
    const now = new Date();
    const card = await this.shops.stampCard();
    const people = await this.people();
    return new Map(
      people.filter((p) => p.member !== null).map((p) => [p.id, this.row(p, card, now).segments]),
    );
  }

  async listCustomers(input: ListCustomersInput): Promise<CustomerPage> {
    const now = new Date();
    const card = await this.shops.stampCard();
    const rows = (await this.people()).map((p) => this.row(p, card, now));
    const goal = card.rule.stampsNeeded;
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

  async getMember(customerId: string): Promise<MemberDetail> {
    const now = new Date();
    const card = await this.shops.stampCard();
    const person = await this.person(customerId);
    const row = this.row(person, card, now);
    const m = person.member;
    const orders = await this.ordersOf(person);
    const since = now.getTime() - USUALLY_BUYS_DAYS * DAY_MS;
    const recentIds = orders
      .filter((o) => o.status === 'completed' && new Date(o.placedAt).getTime() >= since)
      .map((o) => o.id);
    const lines = await this.linesOf(recentIds);
    const entries = m ? await this.entries(m.id) : [];
    const counter = counterEntries(entries);
    const account = m ? await this.accounts.account(m, card) : null;
    return MemberDetailSchema.parse({
      ...row,
      email: m?.email ?? null,
      pendingStamps: account?.pendingStamps ?? 0,
      averageOrder: person.visits > 0 ? Math.round(person.spent / person.visits) : 0,
      usuallyBuys: usuallyBuys(lines),
      firstOrderAt: person.firstOrderAt,
      note: null,
      changesLeftToday: m ? changesLeftToday(counter, now) : 0,
      lastCounterStampAt: m ? recentCounterStamp(counter, now) : null,
      history: ownerLedger(entries),
      orders: orders.slice(0, ORDERS_SHOWN).map((o) => ({
        id: o.id,
        orderNo: o.orderNo,
        placedAt: o.placedAt,
        status: o.status,
        total: o.total,
        itemsSummary: o.summary,
      })),
      claims: m ? await this.claimsOf(m.id) : [],
    });
  }

  /** A prize code opens its member with the claim to give (M13); a member code matches exactly (D7). */
  async findMember(code: string): Promise<FoundMember> {
    const typed = normaliseMemberCode(code);
    if (typed.length < 4) throw notFound();
    const claim = await this.db.tx.execute<{ id: string; member_id: string; status: string }>(sql`
      select c.id, c.member_id, c.status from public.reward_claims c
      where c.tenant_id = ${this.db.shopId}
        and regexp_replace(upper(c.code), '[^A-Z0-9]', '', 'g') = ${typed}
      limit 1`);
    const hit = claim.rows[0];
    if (hit) {
      return FoundMemberSchema.parse({
        customerId: hit.member_id,
        claimId: hit.status === 'pending' ? hit.id : null,
      });
    }
    const digits = /^\d+$/.test(typed) ? typed : null;
    const found = await this.db.tx.execute<{ id: string }>(sql`
      select m.id from public.members m
      where m.tenant_id = ${this.db.shopId} and m.erased_at is null
        and (m.member_code_norm = ${typed} or (${digits}::text is not null and m.member_code_digits = ${digits}))
      limit 1`);
    const member = found.rows[0];
    if (!member) throw notFound();
    return FoundMemberSchema.parse({ customerId: member.id, claimId: null });
  }

  // ---- Counter changes -------------------------------------------------------------------------

  /** One stamp at the counter (D2): the same tap again gives the first result; a second within 2 minutes asks. */
  async giveStamp(
    customerId: string,
    clientKey: string,
    confirmRecent: boolean,
  ): Promise<CounterChange> {
    const member = await this.memberOf(customerId);
    const balance = await this.ledger.lock(member.id);
    const again = await this.byClientKey(clientKey, member.id);
    if (again) return this.counterChange(member.id, again);
    const card = await this.shops.stampCard();
    if (card.status !== 'on') throw new ApiFailure('stamp_card_off', 409);
    const counter = counterEntries(await this.entries(member.id));
    if (changesLeftToday(counter, new Date()) <= 0) throw new ApiFailure('stamp_cap_reached', 429);
    if (!confirmRecent && recentCounterStamp(counter, new Date()) !== null) {
      throw new ApiFailure('stamp_recent', 409);
    }
    const added = await this.ledger.add(
      {
        memberId: member.id,
        kind: 'given',
        delta: 1,
        reasonCategory: 'counter_purchase',
        clientKey,
        byUserId: this.db.scope.userId,
      },
      balance,
    );
    return this.counterChange(member.id, added.id);
  }

  /** Takes back a counter change within 15 seconds (T58); a prize handed over goes back on the shelf. */
  async undoChange(customerId: string, entryId: string): Promise<MemberDetail> {
    const member = await this.memberOf(customerId);
    const balance = await this.ledger.lock(member.id);
    const entries = await this.entries(member.id);
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) throw notFound();
    const undone = entries.some((e) => e.undoesId === entry.id);
    const undoable =
      entry.byUserId !== null &&
      !undone &&
      (entry.kind === 'given' || entry.kind === 'used' || entry.kind === 'claimed');
    if (!undoable || !canUndo(entry.at, new Date())) throw new ApiFailure('undo_expired', 409);
    if (balance - entry.delta < 0) throw new ApiFailure('undo_expired', 409);
    if (entry.kind === 'claimed' && entry.claimId) {
      await this.db.tx
        .update(rewardClaims)
        .set({ status: 'cancelled', cancelReason: 'other', givenAt: null, givenBy: null })
        .where(and(eq(rewardClaims.tenantId, this.db.shopId), eq(rewardClaims.id, entry.claimId)));
      await this.db.tx.execute(sql`select private.give_back_prize()`);
    }
    await this.ledger.add(
      {
        memberId: member.id,
        kind: 'undone',
        delta: -entry.delta,
        undoesId: entry.id,
        byUserId: this.db.scope.userId,
      },
      balance,
    );
    return this.getMember(member.id);
  }

  /** A manual +1 or −1 with a reason (M6): at most 3 a day, never below 0. */
  async adjustStamps(input: AdjustStampsInput): Promise<MemberDetail> {
    const member = await this.memberOf(input.customerId);
    const balance = await this.ledger.lock(member.id);
    const card = await this.shops.stampCard();
    if (input.delta > 0 && card.status !== 'on') throw new ApiFailure('stamp_card_off', 409);
    const counter = counterEntries(await this.entries(member.id));
    if (changesLeftToday(counter, new Date()) <= 0) throw new ApiFailure('stamp_cap_reached', 429);
    const note = input.note?.trim() ? input.note.trim().slice(0, 120) : null;
    await this.ledger.add(
      {
        memberId: member.id,
        kind: input.delta > 0 ? 'given' : 'removed',
        delta: input.delta,
        reasonCategory: input.reason,
        privateNote: note,
        byUserId: this.db.scope.userId,
      },
      balance,
    );
    return this.getMember(member.id);
  }

  /**
   * The reward at the counter (D8): a discount or free item is used now; a custom prize is handed over now
   * (a claim marked given, holding one piece). Paused keeps ready rewards usable (M1); Off stops them (M2).
   */
  async useReward(customerId: string, clientKey: string): Promise<CounterChange> {
    const member = await this.memberOf(customerId);
    const balance = await this.ledger.lock(member.id);
    const again = await this.byClientKey(clientKey, member.id);
    if (again) return this.counterChange(member.id, again);
    const card = await this.shops.stampCard();
    if (card.status === 'off') throw new ApiFailure('reward_unavailable', 409);
    const goal = card.rule.stampsNeeded;
    if (balance < goal) throw new ApiFailure('stamps_insufficient', 409);
    let claimId: string | null = null;
    if (card.reward.kind === 'custom') {
      if (card.reward.onePerCustomer && (await this.hasClaim(member.id))) {
        throw new ApiFailure('reward_unavailable', 409);
      }
      const took = await this.db.tx.execute<{ ok: boolean }>(
        sql`select private.take_prize() as ok`,
      );
      if (took.rows[0]?.ok !== true) throw new ApiFailure('reward_all_claimed', 409);
      const at = new Date().toISOString();
      const [claim] = await this.db.tx
        .insert(rewardClaims)
        .values({
          tenantId: this.db.shopId,
          memberId: member.id,
          code: await this.claimCode(),
          status: 'given',
          title: card.reward.title,
          givenAt: at,
          givenBy: this.db.scope.userId,
        })
        .returning({ id: rewardClaims.id });
      claimId = claim?.id ?? null;
    }
    const added = await this.ledger.add(
      {
        memberId: member.id,
        kind: claimId ? 'claimed' : 'used',
        delta: -goal,
        claimId,
        clientKey,
        byUserId: this.db.scope.userId,
      },
      balance,
    );
    return this.counterChange(member.id, added.id);
  }

  /** The counter note ("less ice") needs its column first; until then the note is not kept. */
  async saveMemberNote(customerId: string): Promise<MemberDetail> {
    const member = await this.memberOf(customerId);
    return this.getMember(member.id);
  }

  // ---- Prizes ----------------------------------------------------------------------------------

  /** Waiting longest first, then the rest newest first. */
  async listRewardClaims(): Promise<OwnerClaim[]> {
    const rows = await this.claimRows(null);
    return rows.sort((a, b) =>
      a.status === 'pending' && b.status === 'pending'
        ? a.createdAt.localeCompare(b.createdAt)
        : a.status === 'pending'
          ? -1
          : b.status === 'pending'
            ? 1
            : b.createdAt.localeCompare(a.createdAt),
    );
  }

  async giveClaim(claimId: string): Promise<OwnerClaim> {
    const claim = await this.lockClaim(claimId);
    await this.db.tx
      .update(rewardClaims)
      .set({ status: 'given', givenAt: new Date().toISOString(), givenBy: this.db.scope.userId })
      .where(and(eq(rewardClaims.tenantId, this.db.shopId), eq(rewardClaims.id, claim.id)));
    return this.claimById(claim.id);
  }

  /** The stamps and the piece come back (M7). */
  async cancelClaim(claimId: string, reason: ClaimCancelReason): Promise<OwnerClaim> {
    const claim = await this.lockClaim(claimId);
    const balance = await this.ledger.lock(claim.memberId);
    await this.db.tx
      .update(rewardClaims)
      .set({ status: 'cancelled', cancelReason: reason })
      .where(and(eq(rewardClaims.tenantId, this.db.shopId), eq(rewardClaims.id, claim.id)));
    const taken = await this.db.tx.execute<{ n: number }>(sql`
      select coalesce(sum(-delta), 0)::int as n from public.stamp_entries
      where tenant_id = ${this.db.shopId} and claim_id = ${claim.id}::uuid and kind = 'claimed'`);
    const back = num(taken.rows[0]?.n);
    if (back > 0) {
      await this.ledger.add(
        {
          memberId: claim.memberId,
          kind: 'returned',
          delta: back,
          claimId: claim.id,
          byUserId: this.db.scope.userId,
        },
        balance,
      );
    }
    await this.db.tx.execute(sql`select private.give_back_prize()`);
    return this.claimById(claim.id);
  }

  // ---- Reading ---------------------------------------------------------------------------------

  private async balances(): Promise<number[]> {
    const result = await this.db.tx.execute<{ n: number }>(sql`
      select coalesce(sum(e.delta), 0)::int as n
      from public.members m
      left join public.stamp_entries e on e.tenant_id = m.tenant_id and e.member_id = m.id
      where m.tenant_id = ${this.db.shopId} and m.erased_at is null
      group by m.id`);
    return result.rows.map((r) => num(r.n));
  }

  /** Members and guests with their order numbers, in one pass over the shop's orders. */
  private async people(onlyId?: { member: string } | { phone: string }): Promise<Person[]> {
    const shopId = this.db.shopId;
    const memberWhere =
      onlyId && 'member' in onlyId ? sql`and m.id = ${onlyId.member}::uuid` : sql``;
    const memberRows =
      onlyId && 'phone' in onlyId
        ? []
        : await this.db.tx
            .select()
            .from(members)
            .where(
              and(
                eq(members.tenantId, shopId),
                isNull(members.erasedAt),
                onlyId && 'member' in onlyId ? eq(members.id, onlyId.member) : undefined,
              ),
            );
    const extra = await this.db.tx.execute<{
      member_id: string;
      balance: number;
      prize: boolean;
    }>(sql`
      select m.id as member_id,
        coalesce((select sum(e.delta) from public.stamp_entries e
          where e.tenant_id = m.tenant_id and e.member_id = m.id), 0)::int as balance,
        exists (select 1 from public.reward_claims c
          where c.tenant_id = m.tenant_id and c.member_id = m.id and c.status = 'pending') as prize
      from public.members m
      where m.tenant_id = ${shopId} and m.erased_at is null ${memberWhere}`);
    const recent = new Date(Date.now() - PULSE_DAYS * DAY_MS).toISOString();
    const orderWhere =
      onlyId && 'member' in onlyId
        ? sql`and o.member_id = ${onlyId.member}::uuid`
        : onlyId && 'phone' in onlyId
          ? sql`and o.member_id is null and o.customer_phone = ${onlyId.phone}`
          : sql``;
    const stats = await this.db.tx.execute<{
      member_id: string | null;
      phone: string | null;
      name: string;
      visits: number;
      spent: number;
      last_at: string | null;
      first_at: string | null;
      recent_visits: number;
      recent_spent: number;
    }>(sql`
      select o.member_id,
        case when o.member_id is null then o.customer_phone end as phone,
        (array_agg(o.customer_name order by o.placed_at desc))[1] as name,
        count(*) filter (where o.status = 'completed')::int as visits,
        coalesce(sum(o.total) filter (where o.status = 'completed'), 0)::int as spent,
        max(o.placed_at) filter (where o.status = 'completed') as last_at,
        min(o.placed_at) filter (where o.status = 'completed') as first_at,
        count(*) filter (where o.status = 'completed' and o.placed_at > ${recent}::timestamptz)::int as recent_visits,
        coalesce(sum(o.total) filter (where o.status = 'completed' and o.placed_at > ${recent}::timestamptz), 0)::int as recent_spent
      from public.orders o
      where o.tenant_id = ${shopId} and (o.member_id is not null or o.customer_phone is not null)
        ${orderWhere}
      group by 1, 2`);
    const extraOf = new Map(extra.rows.map((r) => [r.member_id, r]));
    const statOf = new Map(stats.rows.map((r) => [r.member_id ?? `${GUEST_PREFIX}${r.phone}`, r]));
    const toStats = (s: (typeof stats.rows)[number] | undefined) => ({
      visits: num(s?.visits),
      spent: num(s?.spent),
      lastOrderAt: iso(s?.last_at ?? null),
      firstOrderAt: iso(s?.first_at ?? null),
      recentVisits: num(s?.recent_visits),
      recentSpent: num(s?.recent_spent),
    });
    const people: Person[] = memberRows.map((m) => ({
      id: m.id,
      member: m,
      name: m.name,
      phone: m.phone ?? '',
      balance: Math.max(0, num(extraOf.get(m.id)?.balance)),
      prizeToGive: extraOf.get(m.id)?.prize === true,
      ...toStats(statOf.get(m.id)),
    }));
    for (const s of stats.rows) {
      if (s.member_id !== null || !s.phone) continue;
      people.push({
        id: guestIdOf(s.phone),
        member: null,
        name: s.name,
        phone: s.phone,
        balance: 0,
        prizeToGive: false,
        ...toStats(s),
      });
    }
    return people;
  }

  /** One person by the id the list gave: a member's id, or a guest's "g-" and mobile digits. */
  private async person(customerId: string): Promise<Person> {
    if (customerId.startsWith(GUEST_PREFIX)) {
      const digits = customerId.slice(GUEST_PREFIX.length);
      if (!/^639\d{9}$/.test(digits)) throw notFound();
      const [guest] = await this.people({ phone: `+${digits}` });
      if (!guest) throw notFound();
      return guest;
    }
    const id = uuidOrNull(customerId);
    if (!id) throw notFound();
    const [member] = await this.people({ member: id });
    if (!member) throw notFound();
    return member;
  }

  private async memberOf(customerId: string): Promise<MemberRow> {
    const id = uuidOrNull(customerId);
    const member = id ? await this.accounts.byId(id) : null;
    if (!member || member.erasedAt) throw notFound();
    return member;
  }

  private row(p: Person, card: StampCardSettings, now: Date): CustomerRow {
    const goal = card.rule.stampsNeeded;
    const m = p.member;
    const avatar = m ? OwnerAvatarSchema.safeParse(m.avatar) : null;
    return CustomerRowSchema.parse({
      id: p.id,
      isMember: m !== null,
      avatar: m ? (avatar?.success ? avatar.data : defaultMemberFace(m.email ?? m.id)) : null,
      name: p.name,
      phone: p.phone ? formatPhPhone(p.phone) : '—',
      memberCode: m?.memberCode ?? null,
      balance: p.balance,
      goal,
      segments: m
        ? memberSegments(
            {
              balance: p.balance,
              goal,
              cardStatus: card.status,
              completedOrders: p.visits,
              lastOrderAt: p.lastOrderAt,
              joinedAt: iso(m.joinedAt) ?? now.toISOString(),
            },
            now,
          )
        : [],
      visits: p.visits,
      spent: p.spent,
      lastOrderAt: p.lastOrderAt,
      joinedAt: m ? iso(m.joinedAt) : null,
      prizeToGive: p.prizeToGive,
    });
  }

  private async ordersOf(p: Person) {
    const where = p.member
      ? sql`o.member_id = ${p.member.id}::uuid`
      : sql`o.member_id is null and o.customer_phone = ${p.phone}`;
    const result = await this.db.tx.execute<{
      id: string;
      order_no: number;
      placed_at: string;
      status: string;
      total: number;
      summary: string | null;
    }>(sql`
      select o.id, o.order_no, o.placed_at, o.status, o.total,
        (select string_agg(l.qty || ' × ' || l.name, ', ' order by l.sort, l.id)
           from public.order_lines l where l.order_id = o.id) as summary
      from public.orders o
      where o.tenant_id = ${this.db.shopId} and ${where}
      order by o.placed_at desc
      limit 200`);
    return result.rows.map((o) => ({
      id: o.id,
      orderNo: num(o.order_no),
      placedAt: iso(o.placed_at) ?? '',
      status: OrderStatusEnum.parse(o.status),
      total: num(o.total),
      summary: o.summary ?? '',
    }));
  }

  private async linesOf(orderIds: readonly string[]): Promise<{ name: string; qty: number }[]> {
    if (orderIds.length === 0) return [];
    const result = await this.db.tx.execute<{ name: string; qty: number }>(sql`
      select l.name, l.qty from public.order_lines l
      where l.tenant_id = ${this.db.shopId} and l.order_id in (${sql.join(
        orderIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})`);
    return result.rows.map((l) => ({ name: l.name, qty: num(l.qty) }));
  }

  private async entries(memberId: string): Promise<Entry[]> {
    const result = await this.db.tx.execute<{
      id: string;
      kind: string;
      delta: number;
      reason_category: string | null;
      private_note: string | null;
      order_no: number | null;
      undoes_id: string | null;
      by_user_id: string | null;
      client_key: string | null;
      claim_id: string | null;
      created_at: string;
    }>(sql`
      select e.id, e.kind, e.delta, e.reason_category, e.private_note, o.order_no, e.undoes_id,
        e.by_user_id, e.client_key, e.claim_id, e.created_at
      from public.stamp_entries e
      left join public.orders o on o.tenant_id = e.tenant_id and o.id = e.order_id
      where e.tenant_id = ${this.db.shopId} and e.member_id = ${memberId}::uuid
      order by e.created_at desc, e.id desc`);
    return result.rows.map((e) => ({
      id: e.id,
      kind: e.kind,
      delta: num(e.delta),
      reasonCategory: e.reason_category,
      privateNote: e.private_note,
      orderNo: e.order_no === null ? null : num(e.order_no),
      undoesId: e.undoes_id,
      byUserId: e.by_user_id,
      clientKey: e.client_key,
      claimId: e.claim_id,
      at: iso(e.created_at) ?? '',
    }));
  }

  private async byClientKey(clientKey: string, memberId: string): Promise<string | null> {
    const [hit] = await this.db.tx
      .select({ id: stampEntries.id, memberId: stampEntries.memberId })
      .from(stampEntries)
      .where(and(eq(stampEntries.tenantId, this.db.shopId), eq(stampEntries.clientKey, clientKey)));
    if (!hit) return null;
    // A key is one tap on one member's card.
    if (hit.memberId !== memberId) throw new ApiFailure('invalid_input', 422);
    return hit.id;
  }

  private async counterChange(memberId: string, entryId: string): Promise<CounterChange> {
    const [entry] = await this.db.tx
      .select({ at: stampEntries.createdAt })
      .from(stampEntries)
      .where(and(eq(stampEntries.tenantId, this.db.shopId), eq(stampEntries.id, entryId)));
    const at = new Date(entry?.at ?? Date.now());
    return CounterChangeSchema.parse({
      member: await this.getMember(memberId),
      entryId,
      undoUntil: new Date(at.getTime() + UNDO_SECONDS * 1000).toISOString(),
    });
  }

  private async hasClaim(memberId: string): Promise<boolean> {
    const [had] = await this.db.tx
      .select({ id: rewardClaims.id })
      .from(rewardClaims)
      .where(
        and(
          eq(rewardClaims.tenantId, this.db.shopId),
          eq(rewardClaims.memberId, memberId),
          sql`${rewardClaims.status} <> 'cancelled'`,
        ),
      )
      .limit(1);
    return had !== undefined;
  }

  private async claimRows(memberId: string | null): Promise<OwnerClaim[]> {
    const where = memberId ? sql`and c.member_id = ${memberId}::uuid` : sql``;
    const result = await this.db.tx.execute<{
      id: string;
      code: string;
      status: string;
      title: string;
      created_at: string;
      given_at: string | null;
      cancel_reason: string | null;
      member_id: string;
      name: string;
    }>(sql`
      select c.id, c.code, c.status, c.title, c.created_at, c.given_at, c.cancel_reason,
        c.member_id, m.name
      from public.reward_claims c
      join public.members m on m.tenant_id = c.tenant_id and m.id = c.member_id
      where c.tenant_id = ${this.db.shopId} ${where}
      order by c.created_at desc`);
    return result.rows.map((c) => {
      const reason = ClaimCancelReasonEnum.safeParse(c.cancel_reason);
      const status = ClaimStatusEnum.parse(c.status);
      return OwnerClaimSchema.parse({
        id: c.id,
        code: c.code,
        status,
        title: c.title,
        createdAt: iso(c.created_at),
        givenAt: iso(c.given_at),
        // The cancel time is not stored (reward_claims keeps the reason only).
        cancelledAt: null,
        cancelReason: status === 'cancelled' && reason.success ? reason.data : null,
        customerId: c.member_id,
        memberName: c.name,
      });
    });
  }

  private claimsOf(memberId: string): Promise<OwnerClaim[]> {
    return this.claimRows(memberId);
  }

  private async claimById(claimId: string): Promise<OwnerClaim> {
    const claims = await this.claimRows(null);
    const claim = claims.find((c) => c.id === claimId);
    if (!claim) throw notFound();
    return claim;
  }

  private async lockClaim(claimId: string): Promise<{ id: string; memberId: string }> {
    const id = uuidOrNull(claimId);
    if (!id) throw notFound();
    const result = await this.db.tx.execute<{ id: string; member_id: string; status: string }>(sql`
      select id, member_id, status from public.reward_claims
      where tenant_id = ${this.db.shopId} and id = ${id}::uuid for update`);
    const claim = result.rows[0];
    if (!claim) throw notFound();
    if (claim.status !== 'pending') throw new ApiFailure('claim_not_pending', 409);
    return { id: claim.id, memberId: claim.member_id };
  }

  private async claimCode(): Promise<string> {
    const [shop] = await this.db.tx
      .execute<{ slug: string }>(sql`select slug from public.tenants where id = ${this.db.shopId}`)
      .then((r) => r.rows);
    const letters = ((shop?.slug ?? '').replace(/[^a-z]/g, '').slice(0, 2) || 'pr')
      .toUpperCase()
      .padEnd(2, 'X');
    for (let attempt = 0; attempt < 10; attempt++) {
      let tail = '';
      for (let i = 0; i < 6; i++) tail += CLAIM_LETTERS[randomInt(CLAIM_LETTERS.length)];
      const code = `${letters}-${tail}`;
      const taken = await this.db.tx.execute(sql`
        select 1 from public.reward_claims where tenant_id = ${this.db.shopId} and code = ${code}`);
      if (taken.rows.length === 0) return code;
    }
    throw new Error('No free claim code.');
  }

  // ---- The pulse (T61, T63) --------------------------------------------------------------------

  private async pulse(people: readonly Person[], rows: readonly CustomerRow[], now: Date) {
    const shopId = this.db.shopId;
    const end = now.toISOString();
    const before = new Date(now.getTime() - PULSE_DAYS * DAY_MS).toISOString();
    const twoBefore = new Date(now.getTime() - 2 * PULSE_DAYS * DAY_MS).toISOString();
    const week = new Date(now.getTime() - STAMP_WEEK_DAYS * DAY_MS).toISOString();
    const twoWeeks = new Date(now.getTime() - 2 * STAMP_WEEK_DAYS * DAY_MS).toISOString();
    const nums = await this.db.tx.execute<Record<string, number>>(sql`
      select
        (select count(*) from public.members m where m.tenant_id = ${shopId} and m.erased_at is null
          and m.joined_at > ${before}::timestamptz and m.joined_at <= ${end}::timestamptz)::int as joined,
        (select count(*) from public.members m where m.tenant_id = ${shopId} and m.erased_at is null
          and m.joined_at > ${twoBefore}::timestamptz and m.joined_at <= ${before}::timestamptz)::int as joined_before,
        (select coalesce(sum(e.delta), 0) from public.stamp_entries e
          where e.tenant_id = ${shopId} and e.kind in ('earned', 'given')
            and not exists (select 1 from public.stamp_entries u where u.undoes_id = e.id)
            and e.created_at > ${week}::timestamptz and e.created_at <= ${end}::timestamptz)::int as stamps,
        (select coalesce(sum(e.delta), 0) from public.stamp_entries e
          where e.tenant_id = ${shopId} and e.kind in ('earned', 'given')
            and not exists (select 1 from public.stamp_entries u where u.undoes_id = e.id)
            and e.created_at > ${twoWeeks}::timestamptz and e.created_at <= ${week}::timestamptz)::int as stamps_before`);
    const n = nums.rows[0] ?? {};
    const sales = async (from: string, to: string): Promise<MemberSales> => {
      const result = await this.db.tx.execute<Record<string, number>>(sql`
        select
          coalesce(sum(total) filter (where member_id is not null), 0)::int as members,
          coalesce(sum(total) filter (where member_id is null), 0)::int as guests,
          count(*) filter (where member_id is not null)::int as member_orders,
          count(*) filter (where member_id is null)::int as guest_orders
        from public.orders
        where tenant_id = ${shopId} and status = 'completed'
          and (member_id is not null or customer_phone is not null)
          and placed_at > ${from}::timestamptz and placed_at <= ${to}::timestamptz`);
      const r = result.rows[0] ?? {};
      return {
        members: num(r['members']),
        guests: num(r['guests']),
        memberOrders: num(r['member_orders']),
        guestOrders: num(r['guest_orders']),
      };
    };
    const rowById = new Map(rows.map((r) => [r.id, r]));
    const top = people
      .filter((p) => p.member !== null && p.recentVisits > 0)
      .sort(
        (a, b) =>
          b.recentVisits - a.recentVisits ||
          b.recentSpent - a.recentSpent ||
          a.name.localeCompare(b.name),
      )
      .slice(0, TOP_SUKI)
      .flatMap((p) => {
        const row = rowById.get(p.id);
        return row ? [{ row, visits: p.recentVisits }] : [];
      });
    return {
      joined: num(n['joined']),
      joinedBefore: num(n['joined_before']),
      stamps: num(n['stamps']),
      stampsBefore: num(n['stamps_before']),
      sales: await sales(before, end),
      salesBefore: await sales(twoBefore, before),
      top,
      activity: await this.activity(end),
    };
  }

  /** "Latest at the counter": joins, stamps, rewards used and prizes given, newest first (T63). */
  private async activity(end: string): Promise<MemberActivity[]> {
    const shopId = this.db.shopId;
    const result = await this.db.tx.execute<{
      id: string;
      kind: string;
      member_id: string;
      name: string;
      at: string;
      stamps: number;
    }>(sql`
      select * from (
        select m.id || '-joined' as id, 'joined' as kind, m.id as member_id, m.name, m.joined_at as at, 0 as stamps
        from public.members m where m.tenant_id = ${shopId} and m.erased_at is null
        union all
        select e.id::text, case when e.kind = 'used' then 'reward' else 'stamp' end, m.id, m.name, e.created_at,
          case when e.kind = 'used' then 0 else e.delta end
        from public.stamp_entries e
        join public.members m on m.tenant_id = e.tenant_id and m.id = e.member_id and m.erased_at is null
        where e.tenant_id = ${shopId} and (e.kind = 'used' or (e.kind in ('earned', 'given') and e.delta > 0))
          and not exists (select 1 from public.stamp_entries u where u.undoes_id = e.id)
        union all
        select c.id::text, 'prize', m.id, m.name, c.given_at, 0
        from public.reward_claims c
        join public.members m on m.tenant_id = c.tenant_id and m.id = c.member_id and m.erased_at is null
        where c.tenant_id = ${shopId} and c.status = 'given' and c.given_at is not null
      ) feed
      where at <= ${end}::timestamptz
      order by at desc
      limit ${ACTIVITY_SHOWN}`);
    return result.rows.map((a) => ({
      id: a.id,
      kind: MemberActivityKindEnum.parse(a.kind),
      customerId: a.member_id,
      name: a.name,
      at: iso(a.at) ?? end,
      stamps: num(a.stamps),
    }));
  }
}

/** A guest's id: "g-" and the mobile number's digits (the same person on the list and the panel). */
function guestIdOf(phone: string): string {
  return `${GUEST_PREFIX}${phone.replace(/\D/g, '')}`;
}

function counterEntries(entries: readonly Entry[]): CounterEntry[] {
  const undone = new Set(entries.flatMap((e) => (e.undoesId ? [e.undoesId] : [])));
  return entries.map((e) => ({
    kind: LedgerKindEnum.parse(e.kind),
    at: e.at,
    byOwner: e.byUserId !== null,
    undone: e.kind === 'undone' || undone.has(e.id),
    reasonCategory: e.reasonCategory,
  }));
}

function ownerLedger(entries: readonly Entry[]): OwnerLedgerEntry[] {
  const undone = new Set(entries.flatMap((e) => (e.undoesId ? [e.undoesId] : [])));
  return entries.map((e) => {
    const reason = ManualReasonEnum.safeParse(e.reasonCategory);
    return {
      id: e.id,
      kind: LedgerKindEnum.parse(e.kind),
      delta: e.delta,
      reasonCategory: reason.success ? reason.data : null,
      orderNo: e.orderNo,
      at: e.at,
      note: e.privateNote ? e.privateNote.slice(0, 120) : null,
      byOwner: e.byUserId !== null,
      undone: e.kind === 'undone' || undone.has(e.id),
    };
  });
}

const inFilter = (row: CustomerRow, filter: CustomerFilter): boolean => {
  if (filter === 'guests') return !row.isMember;
  if (!row.isMember) return false;
  if (filter === 'all') return true;
  return row.segments.includes(filter);
};

/** Name, mobile number in any form, or the member code (exact only, D7). */
function matchesQuery(row: CustomerRow, q: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  if (row.name.toLowerCase().includes(query)) return true;
  const digits = query.replace(/\D/g, '');
  const phoneDigits = row.phone.replace(/\D/g, '');
  const wanted = digits.startsWith('63') ? `0${digits.slice(2)}` : digits;
  if (digits.length >= 4 && (phoneDigits.includes(wanted) || `0${phoneDigits}`.includes(wanted))) {
    return true;
  }
  if (row.memberCode === null) return false;
  const want = normaliseMemberCode(q);
  const have = normaliseMemberCode(row.memberCode);
  return (
    want.length >= 4 &&
    (have === want || (/^\d+$/.test(want) && have.replace(/^[A-Z]+/, '') === want))
  );
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
