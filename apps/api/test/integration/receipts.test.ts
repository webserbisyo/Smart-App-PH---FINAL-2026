import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  CategorySchema,
  OrderRatingSchema,
  OrderReceiptSchema,
  OrderRowSchema,
  OwnerItemSchema,
  PaymentSchema,
  type OrderPayload,
} from '@smartapp/core';
import { Db } from '../../src/db/db.service.js';
import { integrationApp, ownerWithShop, phone, WEBP } from './support.js';

const PlacedSchema = z.object({ orderId: z.string(), orderNo: z.number(), token: z.string() });
const UploadSchema = z.object({ uploadUrl: z.string(), path: z.string() });

let phoneSeq = 2000000;
function nextPhone(): string {
  phoneSeq += 1;
  return `0918${String(phoneSeq).slice(-7)}`;
}

describe('receipts (phase 5)', () => {
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

  /** A live shop open all day, taking cash and GCash, with one ₱150 item. */
  async function liveShop(name: string) {
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
          .send({
            categoryId: cat.id,
            name: 'Smash burger',
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
            dailyLimit: null,
          })
          .expect(201)
      ).body,
    );
    await asAdmin(async () => {
      const id = owner.shopId;
      await db.tx.execute(
        sql`update public.tenants set stage = 'live', asked_at = now(), live_at = now() where id = ${id}::uuid`,
      );
      await db.tx.execute(sql`delete from public.opening_hours where tenant_id = ${id}::uuid`);
      await db.tx.execute(sql`
        insert into public.opening_hours (tenant_id, weekday, opens, closes)
        select ${id}::uuid, d, '00:00', '23:59' from generate_series(0, 6) d`);
      await db.tx.execute(sql`
        insert into public.payment_accounts (tenant_id, method, account_name, account_number, sort)
        values (${id}::uuid, 'cash', null, null, 0), (${id}::uuid, 'gcash', 'Ana Cruz', '09171234567', 1)`);
    });
    return { ...owner, itemId: item.id, variantId: item.variants[0]?.id ?? '' };
  }

  function payload(
    shop: { itemId: string; variantId: string },
    paymentMethod: OrderPayload['paymentMethod'],
  ): OrderPayload {
    return {
      type: 'pickup',
      scheduledAt: null,
      lines: [{ itemId: shop.itemId, variantId: shop.variantId, optionIds: [], qty: 1, note: '' }],
      customer: { name: 'Ana', phone: nextPhone(), email: null },
      delivery: null,
      paymentMethod,
      paymentAccountId: null,
      note: null,
      useReward: false,
    };
  }

  async function place(
    slug: string,
    shop: { itemId: string; variantId: string },
    method: OrderPayload['paymentMethod'],
  ) {
    return PlacedSchema.parse(
      (
        await phone(app)
          .post(`/s/${slug}/orders`)
          .send({ ...payload(shop, method), clientKey: randomUUID() })
          .expect(200)
      ).body,
    );
  }

  /** The two steps a phone takes for a payment photo: room, then the file to the signed link. */
  async function proofFile(slug: string, token: string): Promise<string> {
    const room = UploadSchema.parse(
      (await phone(app).post(`/s/${slug}/o/${token}/proof-upload`).send({}).expect(200)).body,
    );
    const sent = await fetch(room.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/webp' },
      body: WEBP,
    });
    expect(sent.ok).toBe(true);
    return room.path;
  }

  it('the receipt link reads one order, and only in its own shop', async () => {
    const shop = await liveShop('rc-read');
    const other = await liveShop('rc-other');
    const placed = await place(shop.slug, shop, 'cash');
    const guest = phone(app);
    const receipt = OrderReceiptSchema.parse(
      (await guest.get(`/s/${shop.slug}/o/${placed.token}`).expect(200)).body,
    );
    expect(receipt.orderNo).toBe(placed.orderNo);
    expect(receipt.totals.total).toBe(15000);
    expect(receipt.status).toBe('placed');
    expect(receipt.pickupCode).toMatch(/^[2-9A-HJKMNP-Z]{4}$/);

    await guest.get(`/s/${other.slug}/o/${placed.token}`).expect(404);
    await guest.get(`/s/${shop.slug}/o/not-a-real-token-at-all`).expect(404);

    const second = await place(shop.slug, shop, 'cash');
    const rows = z.array(OrderRowSchema).parse(
      (
        await guest
          .post(`/s/${shop.slug}/my-orders`)
          .send({ tokens: [placed.token, second.token, 'x'.repeat(20)] })
          .expect(200)
      ).body,
    );
    expect(rows.map((r) => r.orderNo)).toEqual([second.orderNo, placed.orderNo]);
    expect(rows[0]?.summary).toBe('1 × Smash burger');
  });

  it('a GCash order takes a payment photo once, waits for the owner, and blocks a reused reference', async () => {
    const shop = await liveShop('rc-proof');
    const placed = await place(shop.slug, shop, 'gcash');
    const receipt = OrderReceiptSchema.parse(
      (await phone(app).get(`/s/${shop.slug}/o/${placed.token}`).expect(200)).body,
    );
    expect(receipt.expiresAt).not.toBeNull();

    const path = await proofFile(shop.slug, placed.token);
    const paid = PaymentSchema.parse(
      (
        await phone(app)
          .post(`/s/${shop.slug}/o/${placed.token}/proof`)
          .send({ method: 'gcash', referenceNo: '1012 345 678', path })
          .expect(200)
      ).body,
    );
    expect(paid.status).toBe('pending');
    expect(paid.proofs).toHaveLength(1);
    expect(paid.proofs[0]?.status).toBe('pending');

    // Waiting for the owner's check: no second photo.
    await phone(app)
      .post(`/s/${shop.slug}/o/${placed.token}/proof-upload`)
      .send({})
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('order_not_payable'));

    // The same reference on another order.
    const next = await place(shop.slug, shop, 'gcash');
    const path2 = await proofFile(shop.slug, next.token);
    await phone(app)
      .post(`/s/${shop.slug}/o/${next.token}/proof`)
      .send({ method: 'gcash', referenceNo: '1012345678', path: path2 })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('duplicate_reference'));

    // Another order's photo path is Not found here.
    const third = await place(shop.slug, shop, 'gcash');
    await phone(app)
      .post(`/s/${shop.slug}/o/${third.token}/proof`)
      .send({ method: 'gcash', referenceNo: '', path })
      .expect(404);

    // A cash order has nothing to send.
    const cash = await place(shop.slug, shop, 'cash');
    await phone(app)
      .post(`/s/${shop.slug}/o/${cash.token}/proof-upload`)
      .send({})
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('order_not_payable'));
  });

  it('rates a finished order once', async () => {
    const shop = await liveShop('rc-rate');
    const placed = await place(shop.slug, shop, 'cash');
    const guest = phone(app);
    await guest
      .post(`/s/${shop.slug}/o/${placed.token}/rating`)
      .send({ stars: 5, comment: null })
      .expect(409);
    await asAdmin(() =>
      db.tx.execute(
        sql`update public.orders set status = 'completed' where id = ${placed.orderId}::uuid`,
      ),
    );
    const rating = OrderRatingSchema.parse(
      (
        await guest
          .post(`/s/${shop.slug}/o/${placed.token}/rating`)
          .send({ stars: 4, comment: '  Sarap!  ' })
          .expect(200)
      ).body,
    );
    expect(rating).toMatchObject({ stars: 4, comment: 'Sarap!' });
    await guest
      .post(`/s/${shop.slug}/o/${placed.token}/rating`)
      .send({ stars: 1, comment: null })
      .expect(409);
    const receipt = OrderReceiptSchema.parse(
      (await guest.get(`/s/${shop.slug}/o/${placed.token}`).expect(200)).body,
    );
    expect(receipt.rating?.stars).toBe(4);
  });
});
