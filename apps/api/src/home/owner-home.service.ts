import { Inject, Injectable } from '@nestjs/common';
import {
  addDays,
  buildHomePeriod,
  buildHomeSummary,
  buildHomeTrends,
  countsAsSale,
  HOME_HISTORY_DAYS,
  HomePeriodDataSchema,
  homePayState,
  HomeSummarySchema,
  HomeTrendsSchema,
  isFinal,
  manilaDate,
  OrderStatusEnum,
  OrderTypeEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  setupSteps,
  sharePercent,
  variantAvailability,
  type HomeBooking,
  type HomeItem,
  type HomeMembers,
  type HomePeriodData,
  type HomeRange,
  type HomeSale,
  type HomeSummary,
  type HomeTrends,
  type PublicShop,
} from '@smartapp/core';
import { and, asc, eq, gt, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { Db } from '../db/db.service.js';
import { members, orders } from '../db/generated/schema.js';
import { OwnerMembersService } from '../members/owner-members.service.js';
import { OrderReader } from '../orders/order-reader.js';
import { ShopReader } from '../public/shop-reader.js';

const UPCOMING_MAX = 5;
const FINAL = ['completed', 'cancelled', 'expired'];

const LineSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  qty: z.number(),
  lineTotal: z.number(),
});

const OrderSchema = z.object({
  placed_at: z.string(),
  due_at: z.string(),
  pay_by: z.string().nullable(),
  total: z.number(),
  type: OrderTypeEnum,
  status: OrderStatusEnum,
  payment_method: PaymentMethodEnum,
  payment_status: PaymentStatusEnum,
  payment_account_id: z.string().nullable(),
  member: z.boolean(),
  lines: z.array(LineSchema),
});
type OrderRead = z.infer<typeof OrderSchema>;

interface Read {
  now: Date;
  shop: PublicShop;
  sales: HomeSale[];
  bookings: HomeBooking[];
  items: HomeItem[];
}

const iso = (value: string) => new Date(value).toISOString();

/**
 * The owner's Home (api.md "Home (owner)", T69 to T71, R16): the shop's last 60 days of orders are read in
 * one query on the business-date index and handed to the same rules in core the sample data uses, so the
 * two always agree. Nothing is stored (H14).
 */
@Injectable()
export class OwnerHomeService {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(ShopReader) private readonly shops: ShopReader,
    @Inject(OrderReader) private readonly reader: OrderReader,
    @Inject(OwnerMembersService) private readonly members: OwnerMembersService,
  ) {}

  async getHome(): Promise<HomeSummary> {
    const r = await this.read();
    const sf = r.shop.storefront;
    const upcoming = await this.upcoming(r.now);
    return HomeSummarySchema.parse({
      ...buildHomeSummary({
        now: r.now,
        storefront: sf,
        sales: r.sales,
        bookings: r.bookings,
        items: r.items,
        members: await this.membersToday(r),
        joinedAt: await this.joinedAt(),
        setup: setupSteps({
          activeItems: r.items.filter((i) => i.status === 'active').length,
          hasLogo: sf.info.logo !== null,
          hasBrandColour: sf.look.brandColor.length > 0,
          hours: sf.hours.length,
          payments: sf.payments.length,
          stampCardOn: sf.stampCard.status !== 'off',
          anyOrder: r.sales.length > 0 || (await this.anyOrder()),
        }),
      }),
      upcoming: upcoming.list,
      upcomingCount: upcoming.count,
    });
  }

  async getHomeTrends(range: HomeRange): Promise<HomeTrends> {
    const r = await this.read();
    return HomeTrendsSchema.parse(
      buildHomeTrends({ now: r.now, range, sales: r.sales, joinedAt: await this.joinedAt() }),
    );
  }

  async getHomePeriod(from: string, to: string): Promise<HomePeriodData> {
    const r = await this.read();
    return HomePeriodDataSchema.parse(
      buildHomePeriod({
        now: r.now,
        dates: { from, to },
        storefront: r.shop.storefront,
        sales: r.sales,
        items: r.items,
        accounts: r.shop.storefront.payments,
      }),
    );
  }

  private async read(): Promise<Read> {
    const now = new Date();
    const shop = await this.shops.read('published');
    const today = manilaDate(now);
    const since = addDays(today, -HOME_HISTORY_DAYS);
    // One pass: the kept history by business date, and open orders due later (bookings).
    const result = await this.db.tx.execute(sql`
      select o.placed_at, o.due_at, o.pay_by, o.total, o.type, o.status, o.payment_method,
        o.payment_status, o.payment_account_id, o.member_id is not null as member,
        coalesce((
          select json_agg(json_build_object('itemId', coalesce(l.item_id::text, ''), 'name', l.name,
            'qty', l.qty, 'lineTotal', l.line_total) order by l.sort)
          from public.order_lines l where l.tenant_id = o.tenant_id and l.order_id = o.id), '[]') as lines
      from public.orders o
      where o.tenant_id = ${this.db.shopId}
        and o.status not in ('cancelled', 'expired')
        and (o.business_date >= ${since}::date
          or (o.status not in ('completed') and o.due_at > now()))`);
    const rows = z.array(OrderSchema).parse(result.rows);
    const live = rows.filter((o) => countsAsSale(saleCheck(o), now));
    const sales = live
      .filter((o) => manilaDate(o.placed_at) >= since && iso(o.placed_at) <= now.toISOString())
      .map(saleOf);
    const notice = new Set(shop.catalog.items.filter((i) => i.noticeDays > 0).map((i) => i.id));
    const bookings = live
      .filter((o) => !isFinal(o.status) && manilaDate(o.due_at) > today)
      .map((o) => ({
        dueAt: iso(o.due_at),
        total: o.total,
        needsNotice: o.lines.some((l) => notice.has(l.itemId)),
      }));
    const items: HomeItem[] = shop.catalog.items.map((i) => ({
      id: i.id,
      name: i.name,
      photo: i.photos[0] ?? null,
      status: i.status,
      isNew: i.isNew,
      addedAt: null,
      soldOut: i.variants.every((v) => variantAvailability(v, now) !== 'available'),
    }));
    return { now, shop, sales, bookings, items };
  }

  /** Today's member numbers: joined, stamps given, rewards used, and the member share of sales. */
  private async membersToday(r: Read): Promise<HomeMembers> {
    const overview = await this.members.getMembersOverview();
    const today = manilaDate(r.now);
    const counts = await this.db.tx.execute<{
      joined: number;
      stamps: number;
      used: number;
      given: number;
    }>(sql`
      select
        (select count(*) from public.members m where m.tenant_id = ${this.db.shopId}
          and m.erased_at is null
          and (m.joined_at at time zone 'Asia/Manila')::date = ${today}::date)::int as joined,
        (select coalesce(sum(e.delta), 0) from public.stamp_entries e
          where e.tenant_id = ${this.db.shopId} and e.kind in ('earned', 'given') and e.delta > 0
            and (e.created_at at time zone 'Asia/Manila')::date = ${today}::date
            and not exists (select 1 from public.stamp_entries u where u.undoes_id = e.id))::int as stamps,
        (select count(*) from public.stamp_entries e
          where e.tenant_id = ${this.db.shopId} and e.kind = 'used'
            and (e.created_at at time zone 'Asia/Manila')::date = ${today}::date
            and not exists (select 1 from public.stamp_entries u where u.undoes_id = e.id))::int as used,
        (select count(*) from public.reward_claims c
          where c.tenant_id = ${this.db.shopId} and c.status = 'given'
            and (c.given_at at time zone 'Asia/Manila')::date = ${today}::date)::int as given`);
    const c = counts.rows[0];
    const todaySales = r.sales.filter((s) => manilaDate(s.placedAt) === today);
    const total = todaySales.reduce((n, s) => n + s.total, 0);
    const memberSales = todaySales.reduce((n, s) => (s.member ? n + s.total : n), 0);
    return {
      cardOn: r.shop.storefront.stampCard.status !== 'off',
      joined: Number(c?.joined ?? 0),
      stamps: Number(c?.stamps ?? 0),
      rewardsUsed: Number(c?.used ?? 0) + Number(c?.given ?? 0),
      ready: overview.counts.ready ?? 0,
      prizesToGive: overview.prizesToGive,
      memberShare: sharePercent(memberSales, total),
    };
  }

  private async joinedAt(): Promise<string[]> {
    const rows = await this.db.tx
      .select({ joinedAt: members.joinedAt })
      .from(members)
      .where(and(eq(members.tenantId, this.db.shopId), sql`${members.erasedAt} is null`));
    return rows.map((r) => iso(r.joinedAt));
  }

  private async anyOrder(): Promise<boolean> {
    const [row] = await this.db.tx
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.tenantId, this.db.shopId))
      .limit(1);
    return row !== undefined;
  }

  /** Upcoming (T113): open orders due after today, soonest first. */
  private async upcoming(now: Date) {
    const tomorrow = addDays(manilaDate(now), 1);
    const start = new Date(`${tomorrow}T00:00:00+08:00`).toISOString();
    const where = and(
      eq(orders.tenantId, this.db.shopId),
      notInArray(orders.status, FINAL),
      gt(orders.dueAt, start),
    );
    const rows = await this.db.tx
      .select()
      .from(orders)
      .where(where)
      .orderBy(asc(orders.dueAt))
      .limit(UPCOMING_MAX * 4);
    const views = (await this.reader.views(rows)).filter((v) =>
      countsAsSale(
        {
          status: v.receipt.status,
          paymentStatus: v.receipt.paymentStatus,
          paymentMethod: v.receipt.paymentMethod,
          expiresAt: v.receipt.expiresAt,
        },
        now,
      ),
    );
    const [count] = await this.db.tx
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .where(where);
    return {
      list: views.slice(0, UPCOMING_MAX).map((v) => this.reader.board(v)),
      count: Number(count?.n ?? 0),
    };
  }
}

function saleCheck(o: OrderRead) {
  return {
    status: o.status,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    expiresAt: o.status === 'placed' && o.payment_status === 'unpaid' && o.pay_by ? o.pay_by : null,
  };
}

function saleOf(o: OrderRead): HomeSale {
  return {
    placedAt: iso(o.placed_at),
    total: o.total,
    type: o.type,
    method: o.payment_method,
    pay: homePayState(o.payment_status, o.payment_method),
    accountId: o.payment_account_id,
    member: o.member,
    lines: o.lines,
  };
}
