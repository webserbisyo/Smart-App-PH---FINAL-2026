import { randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  LedgerKindEnum,
  ManualReasonEnum,
  MemberAccountSchema,
  memberQrUrl,
  OwnerAvatarSchema,
  RewardClaimSchema,
  ClaimStatusEnum,
  type MemberAccount,
  type PublicStampCard,
  type RewardClaim,
} from '@smartapp/core';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { Db } from '../db/db.service.js';
import { members, rewardClaims } from '../db/generated/schema.js';

export type MemberRow = typeof members.$inferSelect;

// Statuses an order is still moving through (its stamp is "on the way").
const OPEN = ['placed', 'preparing', 'ready', 'out_for_delivery'] as const;

function iso(value: string): string {
  return new Date(value).toISOString();
}

/**
 * One member as their own phone sees them (`MemberAccount`): the balance is the sum of the stamp history, the
 * pending stamps are their open orders that will earn one, and the history hides a counter change and its
 * Undo (T58). Read in the request's transaction, so RLS keeps it to the shop.
 */
@Injectable()
export class MemberAccounts {
  constructor(@Inject(Db) private readonly db: Db) {}

  /** The shop's member for a signed-in account, or null (never a removed member). */
  async byUser(userId: string): Promise<MemberRow | null> {
    const [row] = await this.db.tx
      .select()
      .from(members)
      .where(
        and(
          eq(members.tenantId, this.db.shopId),
          eq(members.userId, userId),
          isNull(members.erasedAt),
        ),
      );
    return row ?? null;
  }

  async byId(memberId: string): Promise<MemberRow | null> {
    const [row] = await this.db.tx
      .select()
      .from(members)
      .where(and(eq(members.tenantId, this.db.shopId), eq(members.id, memberId)));
    return row ?? null;
  }

  /** A name tag that is free in this shop: two letters of the shop's link and four digits ("KS-4100"). */
  async newCode(slug: string): Promise<string> {
    const letters = (slug.replace(/[^a-z]/g, '').slice(0, 2) || 'mb').toUpperCase().padEnd(2, 'X');
    for (let attempt = 0; attempt < 20; attempt++) {
      const digits = attempt < 10 ? randomInt(1000, 10000) : randomInt(100000, 1000000);
      const code = `${letters}-${digits}`;
      const taken = await this.db.tx.execute(sql`
        select 1 from public.members
        where tenant_id = ${this.db.shopId}
          and (member_code_norm = ${`${letters}${digits}`} or member_code_digits = ${String(digits)})`);
      if (taken.rows.length === 0) return code;
    }
    throw new Error('No free member code.');
  }

  /** The member's balance (no lock: for reads). */
  async balance(memberId: string): Promise<number> {
    const result = await this.db.tx.execute<{ n: number }>(sql`
      select coalesce(sum(delta), 0)::int as n from public.stamp_entries
      where tenant_id = ${this.db.shopId} and member_id = ${memberId}::uuid`);
    return Number(result.rows[0]?.n ?? 0);
  }

  async account(member: MemberRow, card: PublicStampCard): Promise<MemberAccount> {
    const shopId = this.db.shopId;
    const entries = await this.db.tx.execute<{
      id: string;
      kind: string;
      delta: number;
      reason_category: string | null;
      undoes_id: string | null;
      order_no: number | null;
      created_at: string;
    }>(sql`
      select e.id, e.kind, e.delta, e.reason_category, e.undoes_id, o.order_no, e.created_at
      from public.stamp_entries e
      left join public.orders o on o.tenant_id = e.tenant_id and o.id = e.order_id
      where e.tenant_id = ${shopId} and e.member_id = ${member.id}
      order by e.created_at desc, e.id desc`);
    const undone = new Set(entries.rows.flatMap((e) => (e.undoes_id ? [e.undoes_id] : [])));
    const balance = entries.rows.reduce((sum, e) => sum + Number(e.delta), 0);

    const pending =
      card.status === 'on'
        ? (
            await this.db.tx.execute<{ order_no: number; placed_at: string }>(sql`
            select o.order_no, o.placed_at from public.orders o
            where o.tenant_id = ${shopId} and o.member_id = ${member.id}
              and o.status in (${sql.join(
                OPEN.map((s) => sql`${s}`),
                sql`, `,
              )})
              and o.subtotal >= ${card.rule.minOrderTotal}
              and not exists (
                select 1 from public.stamp_entries e
                where e.tenant_id = o.tenant_id and e.order_id = o.id and e.kind = 'earned')
            order by o.placed_at desc`)
          ).rows
        : [];

    const history = [
      ...entries.rows
        .filter((e) => e.kind !== 'undone' && !undone.has(e.id))
        .map((e) => ({
          kind: LedgerKindEnum.parse(e.kind),
          delta: Number(e.delta),
          reasonCategory: e.reason_category ? ManualReasonEnum.parse(e.reason_category) : null,
          orderNo: e.order_no === null ? null : Number(e.order_no),
          at: iso(e.created_at),
        })),
      ...pending.map((o) => ({
        kind: 'pending' as const,
        delta: 1,
        reasonCategory: null,
        orderNo: Number(o.order_no),
        at: iso(o.placed_at),
      })),
    ].sort((a, b) => b.at.localeCompare(a.at));

    const avatar = OwnerAvatarSchema.safeParse(member.avatar);
    return MemberAccountSchema.parse({
      name: member.name,
      phone: member.phone ?? '',
      email: member.email ?? '',
      balance: Math.max(0, balance),
      pendingStamps: pending.length,
      rewardReady: card.status !== 'off' && balance >= card.rule.stampsNeeded,
      memberCode: member.memberCode,
      joinedAt: iso(member.joinedAt),
      history,
      claims: await this.claims(member.id),
      avatar: avatar.success ? avatar.data : null,
    });
  }

  async claims(memberId: string): Promise<RewardClaim[]> {
    const rows = await this.db.tx
      .select({
        code: rewardClaims.code,
        status: rewardClaims.status,
        title: rewardClaims.title,
        createdAt: rewardClaims.createdAt,
      })
      .from(rewardClaims)
      .where(and(eq(rewardClaims.tenantId, this.db.shopId), eq(rewardClaims.memberId, memberId)))
      .orderBy(desc(rewardClaims.createdAt));
    return rows.map((c) =>
      RewardClaimSchema.parse({
        code: c.code,
        status: ClaimStatusEnum.parse(c.status),
        // Member and prize QR both open /m/<code> (M13).
        qrUrl: memberQrUrl(c.code),
        title: c.title,
        createdAt: iso(c.createdAt),
      }),
    );
  }
}
