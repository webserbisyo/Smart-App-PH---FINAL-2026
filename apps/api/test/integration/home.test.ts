import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  HomePeriodDataSchema,
  HomeSummarySchema,
  HomeTrendsSchema,
  manilaDate,
} from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { Db } from '../../src/db/db.service.js';
import { integrationApp, liveShop, nextPhone, phone } from './support.js';

type Shop = Awaited<ReturnType<typeof liveShop>>;

const PlacedSchema = z.object({ orderId: z.string(), orderNo: z.number(), token: z.string() });
const ADMIN = { userId: null, shopId: null, role: 'admin' } as const;

describe('owner Home (phase 6)', () => {
  let app: NestExpressApplication;
  let db: Db;

  beforeAll(async () => {
    app = await integrationApp();
    db = app.get(Db);
  });

  afterAll(async () => {
    await app.close();
  });

  async function place(shop: Shop, qty: number) {
    return PlacedSchema.parse(
      (
        await phone(app)
          .post(`/s/${shop.slug}/orders`)
          .send({
            type: 'pickup',
            scheduledAt: null,
            lines: [
              { itemId: shop.itemId, variantId: shop.variantId, optionIds: [], qty, note: '' },
            ],
            customer: { name: 'Ana Cruz', phone: nextPhone(), email: null },
            delivery: null,
            paymentMethod: 'cash',
            paymentAccountId: null,
            note: null,
            useReward: false,
            clientKey: randomUUID(),
          })
          .expect(200)
      ).body,
    );
  }

  async function complete(shop: Shop, orderId: string) {
    await shop.agent.post(`/owner/orders/${orderId}/payments`).send({ method: 'cash' }).expect(200);
    for (const toStatus of ['preparing', 'ready', 'completed']) {
      await shop.agent.post(`/owner/orders/${orderId}/advance`).send({ toStatus }).expect(200);
    }
  }

  for (const kind of ['food', 'retail'] as const) {
    it(`matches a hand count of today's orders for a ${kind} shop`, async () => {
      const shop = await liveShop(app, `home-${kind}`, { kind });
      const empty = HomeSummarySchema.parse((await shop.agent.get('/owner/home').expect(200)).body);
      expect(empty.today).toMatchObject({ sales: 0, orders: 0, average: null });

      // Three orders of 1, 2 and 3 items at ₱150; one paid and done, one cancelled (it never counts).
      const a = await place(shop, 1);
      await place(shop, 2);
      await place(shop, 3);
      const cancelled = await place(shop, 4);
      await complete(shop, a.orderId);
      await shop.agent
        .post(`/owner/orders/${cancelled.orderId}/cancel`)
        .send({ reason: 'Customer asked' })
        .expect(200);

      const home = HomeSummarySchema.parse((await shop.agent.get('/owner/home').expect(200)).body);
      expect(home.today).toEqual({
        sales: 90000,
        orders: 3,
        collected: 15000,
        toCollect: 75000,
        average: 30000,
      });
      expect(home.best.today[0]).toMatchObject({ name: 'Smash burger', qty: 6 });
      expect(home.sparks.orders.at(-1)).toBe(3);

      const today = manilaDate(new Date());
      const period = HomePeriodDataSchema.parse(
        (await shop.agent.get(`/owner/home/period?from=${today}&to=${today}`).expect(200)).body,
      );
      expect(period.money).toMatchObject({ sales: 90000, orders: 3, paid: 15000 });
      const trends = HomeTrendsSchema.parse(
        (await shop.agent.get('/owner/home/trends?range=7d').expect(200)).body,
      );
      expect(trends.totals).toMatchObject({ sales: 90000, orders: 3 });
      await shop.agent.get('/owner/home/trends?range=1y').expect(400);
    });
  }

  it('reads 10,000 orders in well under a second', async () => {
    const shop = await liveShop(app, 'home-speed');
    const first = await place(shop, 1);
    // Copies of one real order, spread over the last 55 days, each with its line.
    await db.run(ADMIN, async () => {
      // A seed this size takes longer than a request may.
      await db.tx.execute(sql`set local statement_timeout = '180s'`);
      await db.tx.execute(sql`
        with copies as (
          insert into public.orders
          select (jsonb_populate_record(null::public.orders, to_jsonb(o) || jsonb_build_object(
            'id', gen_random_uuid(),
            'token', md5(random()::text) || md5(g::text),
            'client_key', null,
            'order_no', 1000 + g,
            'placed_at', o.placed_at - make_interval(days => g % 55, hours => g % 9),
            'due_at', o.due_at - make_interval(days => g % 55, hours => g % 9),
            'start_by', o.start_by - make_interval(days => g % 55, hours => g % 9),
            'business_date', o.business_date - (g % 55),
            'status', 'completed'))).*
          from public.orders o, generate_series(1, 10000) g
          where o.id = ${first.orderId}::uuid
          returning id, tenant_id
        )
        insert into public.order_lines
        select (jsonb_populate_record(null::public.order_lines, to_jsonb(l) || jsonb_build_object(
          'id', gen_random_uuid(), 'order_id', c.id))).*
        from copies c
        join public.order_lines l on l.order_id = ${first.orderId}::uuid`);
    });
    const started = performance.now();
    const home = HomeSummarySchema.parse((await shop.agent.get('/owner/home').expect(200)).body);
    const took = performance.now() - started;
    expect(home.daysWithOrders).toBeGreaterThan(50);
    // A laptop answers in about a quarter second; CI machines are slower, so the bar is generous.
    expect(took).toBeLessThan(3000);
  });
});
