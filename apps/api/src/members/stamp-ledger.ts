import { Inject, Injectable } from '@nestjs/common';
import { earnsStamp, periodStart, type ManualReason, type PublicStampCard } from '@smartapp/core';
import { and, eq, gte, sql } from 'drizzle-orm';
import { ApiFailure } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { stampEntries } from '../db/generated/schema.js';

/** The kinds a stored entry may have (LEDGER_KINDS without `pending`, which is counted from open orders). */
export type StoredKind =
  | 'welcome'
  | 'earned'
  | 'used'
  | 'claimed'
  | 'returned'
  | 'reversed'
  | 'given'
  | 'removed'
  | 'undone';

export interface NewEntry {
  memberId: string;
  kind: StoredKind;
  delta: number;
  orderId?: string | null;
  claimId?: string | null;
  undoesId?: string | null;
  reasonCategory?: ManualReason | null;
  privateNote?: string | null;
  clientKey?: string | null;
  byUserId?: string | null;
}

/** What earning a stamp for an order did: the member's balance after it, or why it did not earn. */
export type EarnResult =
  { earned: true; memberId: string; balance: number } | { earned: false; memberId: string | null };

/**
 * The stamp history (database step 6): append-only, the balance is the sum of the deltas. Every change locks
 * the member first (`lock_stamp_balance`), so two changes at once queue up and the balance never goes below
 * zero. Each order earns once and uses a reward once (unique indexes); mistakes get a new entry.
 */
@Injectable()
export class StampLedger {
  constructor(@Inject(Db) private readonly db: Db) {}

  /** The member's balance, with the member row held until the commit. */
  async lock(memberId: string): Promise<number> {
    const result = await this.db.tx.execute<{ balance: number }>(
      sql`select private.lock_stamp_balance(${memberId}::uuid) as balance`,
    );
    return Number(result.rows[0]?.balance ?? 0);
  }

  /** Adds one entry after the lock; a change that would go below zero is `stamps_insufficient`. */
  async add(entry: NewEntry, balance?: number): Promise<{ id: string; balance: number }> {
    const before = balance ?? (await this.lock(entry.memberId));
    const after = before + entry.delta;
    if (after < 0) throw new ApiFailure('stamps_insufficient', 409);
    const [row] = await this.db.tx
      .insert(stampEntries)
      .values({
        tenantId: this.db.shopId,
        memberId: entry.memberId,
        kind: entry.kind,
        delta: entry.delta,
        orderId: entry.orderId ?? null,
        claimId: entry.claimId ?? null,
        undoesId: entry.undoesId ?? null,
        reasonCategory: entry.reasonCategory ?? null,
        privateNote: entry.privateNote ?? null,
        clientKey: entry.clientKey ?? null,
        byUserId: entry.byUserId ?? null,
      })
      .returning({ id: stampEntries.id });
    if (!row) throw new ApiFailure('unknown', 500);
    return { id: row.id, balance: after };
  }

  /**
   * A finished order's stamp (S20): the member on the order, an On card, the subtotal at the card's minimum
   * and under the period's cap. Once per order: a second call (Undo, then Complete again) adds nothing.
   */
  async earnForOrder(
    order: { id: string; memberId: string | null; subtotal: number },
    card: PublicStampCard,
    now: Date,
  ): Promise<EarnResult> {
    const memberId = order.memberId;
    if (!memberId || card.status !== 'on') return { earned: false, memberId };
    const balance = await this.lock(memberId);
    const [already] = await this.db.tx
      .select({ id: stampEntries.id })
      .from(stampEntries)
      .where(
        and(
          eq(stampEntries.tenantId, this.db.shopId),
          eq(stampEntries.orderId, order.id),
          eq(stampEntries.kind, 'earned'),
        ),
      );
    if (already) return { earned: false, memberId };
    const from = card.rule.period ? periodStart(card.rule.period, now) : new Date(0).toISOString();
    const [count] = await this.db.tx
      .select({ n: sql<number>`count(*)::int` })
      .from(stampEntries)
      .where(
        and(
          eq(stampEntries.tenantId, this.db.shopId),
          eq(stampEntries.memberId, memberId),
          eq(stampEntries.kind, 'earned'),
          gte(stampEntries.createdAt, from),
        ),
      );
    if (!earnsStamp(card.rule, order.subtotal, Number(count?.n ?? 0)).earns) {
      return { earned: false, memberId };
    }
    const added = await this.add(
      { memberId, kind: 'earned', delta: 1, orderId: order.id },
      balance,
    );
    return { earned: true, memberId, balance: added.balance };
  }

  /** The reward an order used comes back when the order is cancelled or expires (once); true when it did. */
  async giveBackUsed(orderId: string): Promise<boolean> {
    const rows = await this.db.tx.execute<{ member_id: string; used: number; back: number }>(sql`
      select e.member_id,
        coalesce(sum(-e.delta) filter (where e.kind = 'used'), 0)::int as used,
        coalesce(sum(e.delta) filter (where e.kind = 'returned'), 0)::int as back
      from public.stamp_entries e
      where e.tenant_id = ${this.db.shopId} and e.order_id = ${orderId}::uuid
        and e.kind in ('used', 'returned')
      group by e.member_id`);
    let gave = false;
    for (const row of rows.rows) {
      const owed = Number(row.used) - Number(row.back);
      if (owed > 0) {
        await this.add({ memberId: row.member_id, kind: 'returned', delta: owed, orderId });
        gave = true;
      }
    }
    return gave;
  }
}
