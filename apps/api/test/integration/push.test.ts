import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import type { OrderPayload } from '@smartapp/core';
import { Db } from '../../src/db/db.service.js';
import { EmailSender, RecordingEmailSender } from '../../src/email/email-sender.js';
import { OrderJobs } from '../../src/orders/order-jobs.js';
import { PushDelivery } from '../../src/push/push-delivery.service.js';
import { PushSender, RecordingPushSender } from '../../src/push/push-sender.js';
import { integrationApp, liveShop, nextPhone, phone, WEBP } from './support.js';

type Shop = Awaited<ReturnType<typeof liveShop>>;

const PlacedSchema = z.object({ orderId: z.string(), orderNo: z.number(), token: z.string() });
const MessageSchema = z.object({
  web_push: z.literal(8030),
  notification: z.object({ title: z.string(), body: z.string(), navigate: z.string() }),
});
const ADMIN = { userId: null, shopId: null, role: 'admin' } as const;

/** A subscription the way a phone's browser gives it, on a real push service's address. */
function subscription(host = 'fcm.googleapis.com') {
  return {
    endpoint: `https://${host}/fcm/send/${randomUUID()}`,
    expirationTime: null,
    keys: { p256dh: `B${'a'.repeat(86)}`, auth: 'abcdefghijklmnopqrstuv' },
  };
}

describe('pushes and owner emails (phase 5)', () => {
  let app: NestExpressApplication;
  let pushes: RecordingPushSender;
  let emails: RecordingEmailSender;
  let delivery: PushDelivery;
  let db: Db;

  beforeAll(async () => {
    app = await integrationApp();
    const sender = app.get(PushSender);
    const mail = app.get(EmailSender);
    if (!(sender instanceof RecordingPushSender) || !(mail instanceof RecordingEmailSender)) {
      throw new Error('The tests run without push and email keys.');
    }
    pushes = sender;
    emails = mail;
    delivery = app.get(PushDelivery);
    db = app.get(Db);
  });

  afterAll(async () => {
    await app.close();
  });

  function payload(shop: Shop, over: Partial<OrderPayload> = {}) {
    return {
      type: 'pickup',
      scheduledAt: null,
      lines: [{ itemId: shop.itemId, variantId: shop.variantId, optionIds: [], qty: 1, note: '' }],
      customer: { name: 'Ana Cruz', phone: nextPhone(), email: null },
      delivery: null,
      paymentMethod: 'cash',
      paymentAccountId: null,
      note: null,
      useReward: false,
      clientKey: randomUUID(),
      ...over,
    };
  }

  async function place(shop: Shop, over: Partial<OrderPayload> = {}) {
    return PlacedSchema.parse(
      (await phone(app).post(`/s/${shop.slug}/orders`).send(payload(shop, over)).expect(200)).body,
    );
  }

  /** Waits for the after-commit send, which does not hold up the answer. */
  async function until(check: () => boolean): Promise<void> {
    for (let i = 0; i < 40 && !check(); i++) await new Promise((r) => setTimeout(r, 50));
    expect(check()).toBe(true);
  }

  /** The order steps wait out the 10-second Undo; a test moves them to now. */
  async function dueNow(shopId: string): Promise<void> {
    await db.run(ADMIN, async () => {
      await db.tx.execute(
        sql`update public.push_outbox set send_after = now() where tenant_id = ${shopId}::uuid and status = 'queued'`,
      );
    });
  }

  async function outbox(shopId: string) {
    return db.run(ADMIN, async () => {
      const result = await db.tx.execute(
        sql`select kind, status, dedupe_key from public.push_outbox where tenant_id = ${shopId}::uuid order by created_at`,
      );
      return z
        .array(z.object({ kind: z.string(), status: z.string(), dedupe_key: z.string() }))
        .parse(result.rows);
    });
  }

  it('serves no key on a laptop, and refuses an address that is not a push service', async () => {
    const key = await phone(app).get('/push/key').expect(200);
    expect(key.body).toEqual({ key: null });

    const shop = await liveShop(app, 'push-bad');
    const placed = await place(shop);
    for (const endpoint of [
      'http://fcm.googleapis.com/fcm/send/x1234567',
      'https://127.0.0.1/fcm/send/x1234567',
      'https://evil.example.com/fcm/send/x1234567',
    ]) {
      await phone(app)
        .post(`/s/${shop.slug}/o/${placed.token}/push`)
        .send({ subscription: { ...subscription(), endpoint } })
        .expect(400);
    }
    // A wrong token is Not found, like the receipt itself.
    await phone(app)
      .post(`/s/${shop.slug}/o/${'x'.repeat(24)}/push`)
      .send({ subscription: subscription() })
      .expect(404);
  });

  it("stops the order's steps on a phone that turned Notify me off", async () => {
    const shop = await liveShop(app, 'push-off');
    const placed = await place(shop);
    const customer = subscription();
    const other = await place(shop);
    for (const order of [placed, other]) {
      await phone(app)
        .post(`/s/${shop.slug}/o/${order.token}/push`)
        .send({ subscription: customer })
        .expect(200);
    }
    await phone(app)
      .post(`/s/${shop.slug}/o/${placed.token}/push/off`)
      .send({ endpoint: customer.endpoint })
      .expect(200);
    // A wrong token is Not found, like the receipt.
    await phone(app)
      .post(`/s/${shop.slug}/o/${'x'.repeat(24)}/push/off`)
      .send({ endpoint: customer.endpoint })
      .expect(404);

    for (const order of [placed, other]) {
      await shop.agent
        .post(`/owner/orders/${order.orderId}/advance`)
        .send({ toStatus: 'preparing' })
        .expect(200);
    }
    await dueNow(shop.shopId);
    const before = pushes.sent.length;
    await delivery.sendDue();
    const sent = pushes.sent
      .slice(before)
      .filter((p) => p.target.endpoint === customer.endpoint)
      .map((p) => MessageSchema.parse(JSON.parse(p.body)).notification.navigate);
    // Only the order that still has Notify me on.
    expect(sent).toEqual([`http://localhost:3000/${shop.slug}/o/${other.token}`]);
  });

  it("tells the owner's device and email about a new order, then the customer about each step", async () => {
    const shop = await liveShop(app, 'push-steps');
    const ownerDevice = subscription('web.push.apple.com');
    await shop.agent.post('/owner/push').send({ subscription: ownerDevice }).expect(200);
    const check = await shop.agent
      .post('/owner/push/check')
      .send({ endpoint: ownerDevice.endpoint })
      .expect(200);
    expect(check.body).toEqual({ on: true });

    const placed = await place(shop);
    await until(() => pushes.sent.some((p) => p.target.endpoint === ownerDevice.endpoint));
    const alert = pushes.sent.find((p) => p.target.endpoint === ownerDevice.endpoint);
    const alertMessage = MessageSchema.parse(JSON.parse(alert?.body ?? '{}'));
    expect(alertMessage.notification.title).toMatch(/^New order #\d{3} · ₱150$/);
    // First name only: never the full name, phone or address.
    expect(alertMessage.notification.body).toContain('Ana ·');
    expect(alertMessage.notification.body).not.toContain('Cruz');
    expect(alertMessage.notification.navigate).toBe(
      `http://localhost:5173/orders/${placed.orderId}`,
    );
    expect(alert?.options.urgency).toBe('high');
    await until(() => emails.sent.some((m) => m.to === shop.email.toLowerCase()));
    const mail = emails.sent.find((m) => m.to === shop.email.toLowerCase());
    expect(mail?.subject).toContain(`new order #${String(placed.orderNo).padStart(3, '0')}`);
    expect(mail?.text).toContain(`/orders/${placed.orderId}`);
    expect(mail?.text).not.toContain('Ana');

    // Notify me on the receipt; asking twice keeps one row.
    const customer = subscription();
    for (let i = 0; i < 2; i++) {
      await phone(app)
        .post(`/s/${shop.slug}/o/${placed.token}/push`)
        .set('User-Agent', 'Mozilla/5.0 (Linux; Android 14)')
        .send({ subscription: customer })
        .expect(200);
    }

    await shop.agent
      .post(`/owner/orders/${placed.orderId}/advance`)
      .send({ toStatus: 'preparing' })
      .expect(200);
    // Not yet: the push waits out the owner's 10-second Undo.
    expect(await delivery.sendDue()).toBe(0);
    await dueNow(shop.shopId);
    const before = pushes.sent.length;
    await delivery.sendDue();
    const step = pushes.sent.slice(before).find((p) => p.target.endpoint === customer.endpoint);
    const stepMessage = MessageSchema.parse(JSON.parse(step?.body ?? '{}'));
    expect(stepMessage.notification.body).toMatch(/^Order #\d{3} was accepted/);
    expect(stepMessage.notification.navigate).toBe(
      `http://localhost:3000/${shop.slug}/o/${placed.token}`,
    );
    expect(step?.options).toEqual({
      ttl: 3600,
      urgency: 'high',
      topic: placed.orderId.replace(/-/g, ''),
    });

    // A step taken back within 10 seconds never sends.
    await shop.agent
      .post(`/owner/orders/${placed.orderId}/advance`)
      .send({ toStatus: 'ready' })
      .expect(200);
    await shop.agent.post(`/owner/orders/${placed.orderId}/recall`).send({}).expect(200);
    await dueNow(shop.shopId);
    const beforeUndo = pushes.sent.length;
    await delivery.sendDue();
    expect(pushes.sent.length).toBe(beforeUndo);
    const rows = await outbox(shop.shopId);
    expect(rows.map((r) => [r.kind, r.status])).toEqual([
      ['owner_new_order', 'sent'],
      ['order_status', 'sent'],
      ['order_status', 'failed'],
    ]);

    // The phone dropped the subscription (410): it goes, and so does its link to the order.
    pushes.answer = 'gone';
    try {
      await shop.agent
        .post(`/owner/orders/${placed.orderId}/advance`)
        .send({ toStatus: 'ready' })
        .expect(200);
      await dueNow(shop.shopId);
      await delivery.sendDue();
    } finally {
      pushes.answer = 'sent';
    }
    const left = await db.run(ADMIN, async () => {
      const result = await db.tx.execute(
        sql`select count(*)::int as n from public.push_subscriptions where endpoint = ${customer.endpoint}`,
      );
      return z.array(z.object({ n: z.number() })).parse(result.rows)[0]?.n;
    });
    expect(left).toBe(0);

    // Alerts off on this device.
    await shop.agent.post('/owner/push/off').send({ endpoint: ownerDevice.endpoint }).expect(200);
    const off = await shop.agent
      .post('/owner/push/check')
      .send({ endpoint: ownerDevice.endpoint })
      .expect(200);
    expect(off.body).toEqual({ on: false });
  });

  it('tells the owner about a payment photo and the customer about a No', async () => {
    const shop = await liveShop(app, 'push-pay', { gcash: true });
    const ownerDevice = subscription();
    await shop.agent.post('/owner/push').send({ subscription: ownerDevice }).expect(200);
    const placed = await place(shop, { paymentMethod: 'gcash' });
    const customer = subscription('updates.push.services.mozilla.com');
    await phone(app)
      .post(`/s/${shop.slug}/o/${placed.token}/push`)
      .send({ subscription: customer })
      .expect(200);

    const room = z
      .object({ uploadUrl: z.string(), path: z.string() })
      .parse(
        (
          await phone(app)
            .post(`/s/${shop.slug}/o/${placed.token}/proof-upload`)
            .send({})
            .expect(200)
        ).body,
      );
    await fetch(room.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/webp' },
      body: WEBP,
    });
    await phone(app)
      .post(`/s/${shop.slug}/o/${placed.token}/proof`)
      .send({ method: 'gcash', referenceNo: '5551112222', path: room.path })
      .expect(200);
    await until(() =>
      pushes.sent.some(
        (p) =>
          p.target.endpoint === ownerDevice.endpoint && p.body.includes('Payment photo to check'),
      ),
    );
    await until(() => emails.sent.some((m) => m.subject.includes('payment photo to check')));

    await shop.agent
      .post(`/owner/payments/${placed.orderId}/review`)
      .send({ approve: false, rejectReason: 'Amount is short' })
      .expect(200);
    await until(() =>
      pushes.sent.some(
        (p) => p.target.endpoint === customer.endpoint && p.body.includes('was not approved'),
      ),
    );
  });

  it('expires an unpaid transfer past its time and tells the phone', async () => {
    const shop = await liveShop(app, 'push-expire', { gcash: true });
    const placed = await place(shop, { paymentMethod: 'gcash' });
    const customer = subscription();
    await phone(app)
      .post(`/s/${shop.slug}/o/${placed.token}/push`)
      .send({ subscription: customer })
      .expect(200);
    await db.run(ADMIN, async () => {
      await db.tx.execute(
        sql`update public.orders set pay_by = now() - interval '1 minute' where id = ${placed.orderId}::uuid`,
      );
    });
    await app.get(OrderJobs).expireUnpaid();
    const receipt = await phone(app).get(`/s/${shop.slug}/o/${placed.token}`).expect(200);
    expect(receipt.body.status).toBe('expired');
    // Once only: a second run finds nothing to do.
    expect(await app.get(OrderJobs).expireUnpaid()).toBe(0);
    await dueNow(shop.shopId);
    await delivery.sendDue();
    expect(
      pushes.sent.some(
        (p) => p.target.endpoint === customer.endpoint && p.body.includes('did not come in time'),
      ),
    ).toBe(true);
  });
});
