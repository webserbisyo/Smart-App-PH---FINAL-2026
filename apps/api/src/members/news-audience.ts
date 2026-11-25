import { Inject, Injectable } from '@nestjs/common';
import { NEWS_AUDIENCES, type NewsAudience } from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { Db } from '../db/db.service.js';
import { OwnerMembersService } from './owner-members.service.js';

/** A phone with news on: its row, and the member on it (null for a guest's phone). */
export interface NewsPhone {
  id: string;
  memberId: string | null;
  platform: string;
}

/**
 * Who a news goes to (T106, P5): phones with news on, in the shop of the transaction. Members only and the
 * member groups (T57) use the groups as Members works them out on each read, so the counts and the send
 * always agree.
 */
@Injectable()
export class NewsAudiences {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(OwnerMembersService) private readonly members: OwnerMembersService,
  ) {}

  /** Every phone with news on, and each member's groups. */
  async load(): Promise<{
    phones: NewsPhone[];
    segments: Map<string, readonly string[]>;
  }> {
    const result = await this.db.tx.execute<{
      id: string;
      member_id: string | null;
      platform: string;
    }>(sql`
      select s.id, m.id as member_id, s.platform
      from public.push_subscriptions s
      left join public.members m
        on m.tenant_id = s.tenant_id and m.id = s.member_id and m.erased_at is null
      where s.tenant_id = ${this.db.shopId} and s.news`);
    const phones = result.rows.map((r) => ({
      id: r.id,
      memberId: r.member_id,
      platform: r.platform,
    }));
    const segments = phones.some((p) => p.memberId)
      ? await this.members.memberSegmentsNow()
      : new Map<string, readonly string[]>();
    return { phones, segments };
  }

  /** The phones one audience reaches. */
  static pick(
    all: { phones: readonly NewsPhone[]; segments: Map<string, readonly string[]> },
    audience: NewsAudience,
  ): NewsPhone[] {
    if (audience === 'everyone') return [...all.phones];
    return all.phones.filter((p) => {
      if (!p.memberId) return false;
      if (audience === 'members') return true;
      return all.segments.get(p.memberId)?.includes(audience) === true;
    });
  }

  /** Phones per audience, for the overview and the compose screen. */
  static counts(all: {
    phones: readonly NewsPhone[];
    segments: Map<string, readonly string[]>;
  }): Record<NewsAudience, number> {
    const counts: Record<NewsAudience, number> = {
      everyone: 0,
      members: 0,
      ready: 0,
      almost: 0,
      regulars: 0,
      quiet: 0,
      new: 0,
    };
    for (const audience of NEWS_AUDIENCES)
      counts[audience] = NewsAudiences.pick(all, audience).length;
    return counts;
  }
}
