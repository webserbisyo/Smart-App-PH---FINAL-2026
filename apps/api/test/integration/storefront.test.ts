import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  CategorySchema,
  OwnerItemSchema,
  PublicShopSchema,
  QuoteSchema,
  ScheduleSchema,
  type ItemDraft,
  type OrderPayload,
} from '@smartapp/core';
import { Db } from '../../src/db/db.service.js';
import { integrationApp, ownerWithShop, phone } from './support.js';

type Owner = Awaited<ReturnType<typeof ownerWithShop>>;

const PlacedSchema = z.object({ orderId: z.string(), orderNo: z.number(), token: z.string() });

function itemDraft(categoryId: string, name: string, dailyLimit: number | null = null): ItemDraft {
  return {
    categoryId,
    name,
    description: null,
    photos: [],
    basePrice: 15000,
    axes: [],
    variants: [
      {
        id: 'new',
        values: [],
        price: 15000,
        priceOverride: null,
        availability: 'available',
        soldOutUntil: null,
      },
    ],
    optionGroupIds: [],
    pairingIds: [],
    featured: false,
    isNew: false,
    status: 'active',
    noticeDays: 0,
    dailyLimit,
  };
}

/** A different phone number for every order, so the per-phone limit stays out of the way. */
let phoneSeq = 1000000;
function nextPhone(): string {
  phoneSeq += 1;
  return `0917${String(phoneSeq).slice(-7)}`;
}

function payload(
  itemId: string,
  variantId: string,
  over: Partial<OrderPayload> = {},
  qty = 1,
): OrderPayload {
  return {
    type: 'pickup',
    scheduledAt: null,
    lines: [{ itemId, variantId, optionIds: [], qty, note: '' }],
    customer: { name: 'Ana', phone: nextPhone(), email: null },
    delivery: null,
    paymentMethod: 'cash',
    paymentAccountId: null,
    note: null,
    useReward: false,
    ...over,
  };
}

describe('storefront ordering (phase 5)', () => {
  let app: NestExpressApplication;
  let db: Db;

  beforeAll(async () => {
    app = await integrationApp();
    db = app.get(Db);
  });

  afterAll(async () => {
    await app.close();
  });

  const asAdmin = <T>(fn: () => Promise<T>) =>
    db.run({ userId: null, shopId: null, role: 'admin' }, fn);

  /** A live shop open all day every day, with one item (and its first variant). */
  async function liveShop(
    name: string,
    dailyLimit: number | null = null,
  ): Promise<Owner & { itemId: string; variantId: string }> {
    const owner = await ownerWithShop(app, name);
    const cat = CategorySchema.parse(
      (
        await owner.agent
          .post('/owner/categories')
          .send({ name: 'Mains', icon: 'burger' })
          .expect(201)
      ).body,
    );
    const item = OwnerItemSchema.parse(
      (
        await owner.agent
          .post('/owner/items')
          .send(itemDraft(cat.id, 'Smash burger', dailyLimit))
          .expect(201)
      ).body,
    );
    const variantId = item.variants[0]?.id ?? '';
    await asAdmin(async () => {
      await db.tx.execute(
        sql`update public.tenants set stage = 'live', asked_at = now(), live_at = now(), trial_ends_at = now() + interval '14 days' where id = ${owner.shopId}::uuid`,
      );
      await db.tx.execute(
        sql`delete from public.opening_hours where tenant_id = ${owner.shopId}::uuid`,
      );
      await db.tx.execute(sql`
        insert into public.opening_hours (tenant_id, weekday, opens, closes)
        select ${owner.shopId}::uuid, d, '00:00', '23:59' from generate_series(0, 6) d`);
    });
    return { ...owner, itemId: item.id, variantId };
  }

  async function settings(shopId: string, set: ReturnType<typeof sql>): Promise<void> {
    await asAdmin(async () => {
      await db.tx.execute(
        sql`update public.shop_settings set ${set} where tenant_id = ${shopId}::uuid`,
      );
    });
  }

  it('a shop that is not live is Not found, then reads like the mock once live', async () => {
    const owner = await ownerWithShop(app, 'sf-hidden');
    const guest = phone(app);
    await guest
      .get(`/s/${owner.slug}`)
      .expect(404)
      .expect((res) => expect(res.body.code).toBe('shop_not_found'));
    await guest.get('/s/no-such-shop-here').expect(404);

    const shop = await liveShop('sf-live');
    const read = PublicShopSchema.parse((await guest.get(`/s/${shop.slug}`).expect(200)).body);
    expect(read.storefront.slug).toBe(shop.slug);
    expect(read.catalog.items.map((i) => i.name)).toEqual(['Smash burger']);
    // No way to pay yet: cash at the counter.
    expect(read.storefront.payments.map((p) => p.method)).toEqual(['cash']);
  });

  it('quotes on the server and places an order once per tap', async () => {
    const shop = await liveShop('sf-place');
    const guest = phone(app);
    const body = payload(shop.itemId, shop.variantId, {}, 2);
    const q = QuoteSchema.parse(
      (await guest.post(`/s/${shop.slug}/quote`).send(body).expect(200)).body,
    );
    expect(q.subtotal).toBe(30000);
    expect(q.total).toBe(30000);
    expect(q.problems).toEqual([]);

    const clientKey = randomUUID();
    const first = PlacedSchema.parse(
      (
        await guest
          .post(`/s/${shop.slug}/orders`)
          .send({ ...body, clientKey })
          .expect(200)
      ).body,
    );
    expect(first.orderNo).toBe(1);
    expect(first.token.length).toBeGreaterThanOrEqual(16);
    // A double tap answers with the same order.
    const again = PlacedSchema.parse(
      (
        await guest
          .post(`/s/${shop.slug}/orders`)
          .send({ ...body, clientKey })
          .expect(200)
      ).body,
    );
    expect(again).toEqual(first);
    const next = PlacedSchema.parse(
      (
        await guest
          .post(`/s/${shop.slug}/orders`)
          .send({ ...payload(shop.itemId, shop.variantId), clientKey: randomUUID() })
          .expect(200)
      ).body,
    );
    expect(next.orderNo).toBe(2);

    const rows = await asAdmin(() =>
      db.tx.execute<{ total: number; lines: number; events: number; phone: string }>(sql`
        select o.total, o.customer_phone as phone,
          (select count(*)::int from public.order_lines l where l.order_id = o.id) as lines,
          (select count(*)::int from public.order_events e where e.order_id = o.id) as events
        from public.orders o where o.id = ${first.orderId}::uuid`),
    );
    expect(rows.rows[0]).toMatchObject({ total: 30000, lines: 1, events: 1 });
    expect(rows.rows[0]?.phone).toMatch(/^\+639/);
  });

  it('refuses a price-free payload that names another shop item or a bad phone', async () => {
    const shop = await liveShop('sf-bad');
    const other = await liveShop('sf-other');
    const guest = phone(app);
    await guest
      .post(`/s/${shop.slug}/orders`)
      .send({ ...payload(other.itemId, other.variantId), clientKey: randomUUID() })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('item_unavailable'));
    await guest
      .post(`/s/${shop.slug}/orders`)
      .send({
        ...payload(shop.itemId, shop.variantId, {
          customer: { name: 'Ana', phone: '12345', email: null },
        }),
        clientKey: randomUUID(),
      })
      .expect(422)
      .expect((res) => expect(res.body.code).toBe('invalid_input'));
    // Prices never come from the phone.
    await guest
      .post(`/s/${shop.slug}/orders`)
      .send({ ...payload(shop.itemId, shop.variantId), total: 1, clientKey: randomUUID() })
      .expect(400);
  });

  it('allows 3 unpaid orders per phone in 30 minutes', async () => {
    const shop = await liveShop('sf-limit');
    const guest = phone(app);
    const same = nextPhone();
    const place = () =>
      guest.post(`/s/${shop.slug}/orders`).send({
        ...payload(shop.itemId, shop.variantId, {
          customer: { name: 'Ana', phone: same, email: null },
        }),
        clientKey: randomUUID(),
      });
    for (let i = 0; i < 3; i++) await place().expect(200);
    await place()
      .expect(429)
      .expect((res) => expect(res.body.code).toBe('rate_limited'));
  });

  it('takes the daily limit once, even across orders', async () => {
    const shop = await liveShop('sf-daily', 2);
    const guest = phone(app);
    await guest
      .post(`/s/${shop.slug}/orders`)
      .send({ ...payload(shop.itemId, shop.variantId, {}, 2), clientKey: randomUUID() })
      .expect(200);
    const res = await guest
      .post(`/s/${shop.slug}/orders`)
      .send({ ...payload(shop.itemId, shop.variantId), clientKey: randomUUID() })
      .expect(409);
    expect(['daily_limit_reached', 'out_of_stock']).toContain(res.body.code);
  });

  it('twenty phones racing for the last place in a time slot: one wins', async () => {
    const shop = await liveShop('sf-race');
    await settings(shop.shopId, sql`orders_per_slot = 1, days_ahead = 3, slot_minutes = 30`);
    const guest = phone(app);
    const lines = [{ itemId: shop.itemId, qty: 1 }];
    const schedule = ScheduleSchema.parse(
      (await guest.post(`/s/${shop.slug}/schedule`).send({ type: 'pickup', lines }).expect(200))
        .body,
    );
    const day = schedule.days.find(
      (d) => d.state === 'open' && d.slots.some((s) => s.state === 'open'),
    );
    const at = day?.slots.find((s) => s.state === 'open')?.at;
    expect(at).toBeDefined();

    const tries = await Promise.all(
      Array.from({ length: 20 }, () =>
        phone(app)
          .post(`/s/${shop.slug}/orders`)
          .send({
            ...payload(shop.itemId, shop.variantId, { scheduledAt: at ?? null }),
            clientKey: randomUUID(),
          }),
      ),
    );
    const won = tries.filter((r) => r.status === 200);
    expect(won).toHaveLength(1);
    for (const lost of tries.filter((r) => r.status !== 200)) {
      expect(lost.status).toBe(409);
      expect(lost.body.code).toBe('slot_full');
    }

    // The schedule now shows that time as full.
    const after = ScheduleSchema.parse(
      (await guest.post(`/s/${shop.slug}/schedule`).send({ type: 'pickup', lines }).expect(200))
        .body,
    );
    const slot = after.days.flatMap((d) => d.slots).find((s) => s.at === at);
    expect(slot?.state).toBe('full');
  });

  it("the owner's preview link reads the draft before the shop is live", async () => {
    const owner = await ownerWithShop(app, 'sf-preview');
    const made = z
      .object({ token: z.string() })
      .parse((await owner.agent.post('/owner/storefront/preview-token').send({}).expect(200)).body);
    const guest = phone(app);
    const read = PublicShopSchema.parse(
      (await guest.get(`/s/${owner.slug}/preview`).query({ token: made.token }).expect(200)).body,
    );
    expect(read.storefront.slug).toBe(owner.slug);
    await guest
      .get(`/s/${owner.slug}/preview`)
      .query({ token: `${made.token}x` })
      .expect(410)
      .expect((res) => expect(res.body.code).toBe('preview_expired'));
    // Another shop's link with this token is Not found.
    const other = await ownerWithShop(app, 'sf-preview-b');
    await guest.get(`/s/${other.slug}/preview`).query({ token: made.token }).expect(404);
  });
});
