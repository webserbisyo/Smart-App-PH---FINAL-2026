import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { z } from 'zod';
import {
  BoardOrderSchema,
  ChatSummarySchema,
  MemberDetailSchema,
  OpenStateSchema,
  OrderReceiptSchema,
  OwnerOrderCreatedSchema,
  OwnerOrderSchema,
  PaymentSchema,
  ScheduleSchema,
  type OrderPayload,
  type OwnerOrderPayload,
  type StampCardSettings,
} from '@smartapp/core';
import {
  integrationApp,
  latestCode,
  liveShop,
  nextPhone,
  phone,
  uniqueEmail,
  WEBP,
} from './support.js';

type Shop = Awaited<ReturnType<typeof liveShop>>;

const PlacedSchema = z.object({ orderId: z.string(), orderNo: z.number(), token: z.string() });
const BoardSchema = z.array(BoardOrderSchema);

describe('owner Orders (phase 5)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await integrationApp();
  });

  afterAll(async () => {
    await app.close();
  });

  function payload(
    shop: Shop,
    over: Partial<OrderPayload> = {},
  ): OrderPayload & { clientKey: string } {
    return {
      type: 'pickup',
      scheduledAt: null,
      lines: [{ itemId: shop.itemId, variantId: shop.variantId, optionIds: [], qty: 1, note: '' }],
      customer: { name: 'Ana', phone: nextPhone(), email: null },
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

  function ownerPayload(shop: Shop, over: Partial<OwnerOrderPayload> = {}): OwnerOrderPayload {
    return {
      type: 'walk_in',
      scheduledAt: null,
      lines: [{ itemId: shop.itemId, variantId: shop.variantId, optionIds: [], qty: 1, note: '' }],
      customer: { kind: 'guest', name: '', phone: null },
      delivery: null,
      deliveryFee: null,
      paymentMethod: 'cash',
      paymentAccountId: null,
      note: null,
      useReward: false,
      override: false,
      ...over,
    };
  }

  it("shows the shop's open orders, and nothing of another shop", async () => {
    const shop = await liveShop(app, 'oo-board');
    const other = await liveShop(app, 'oo-board-b');
    const placed = await place(shop);

    const board = BoardSchema.parse(
      (await shop.agent.get('/owner/orders').query({ open: 'true' }).expect(200)).body,
    );
    expect(board.map((o) => o.orderNo)).toEqual([placed.orderNo]);
    expect(board[0]?.seenAt).toBeNull();
    const theirs = BoardSchema.parse(
      (await other.agent.get('/owner/orders').query({ open: 'true' }).expect(200)).body,
    );
    expect(theirs).toEqual([]);
    await other.agent.get(`/owner/orders/${placed.orderId}`).expect(404);
    await other.agent
      .post(`/owner/orders/${placed.orderId}/advance`)
      .send({ toStatus: 'preparing' })
      .expect(404);

    const seen = BoardOrderSchema.parse(
      (await shop.agent.post(`/owner/orders/${placed.orderId}/seen`).send({}).expect(200)).body,
    );
    expect(seen.seenAt).not.toBeNull();

    // Find by number, "#01" style, and by the scanned token.
    const found = BoardSchema.parse(
      (
        await shop.agent
          .get('/owner/orders/find')
          .query({ code: `#0${placed.orderNo}` })
          .expect(200)
      ).body,
    );
    expect(found.map((o) => o.id)).toEqual([placed.orderId]);
    const byToken = BoardSchema.parse(
      (await shop.agent.get('/owner/orders/find').query({ code: placed.token }).expect(200)).body,
    );
    expect(byToken).toHaveLength(1);

    // Today's list by business day.
    const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
    const list = BoardSchema.parse(
      (
        await shop.agent
          .get('/owner/orders')
          .query({ from: today, to: today, q: 'ana' })
          .expect(200)
      ).body,
    );
    expect(list).toHaveLength(1);
  });

  it('search finds a cancelled order on any day, with the phone typed any way (T126)', async () => {
    const shop = await liveShop(app, 'oo-search');
    const typed = nextPhone(); // 0919XXXXXXX, saved as +63919XXXXXXX
    const placed = await place(shop, {
      customer: { name: 'Bea', phone: typed, email: null },
    });
    await shop.agent
      .post(`/owner/orders/${placed.orderId}/cancel`)
      .send({ reason: 'Customer asked' })
      .expect(200);

    // The open-orders search no longer has it; the any-day search does, however the phone is typed.
    const open = BoardSchema.parse(
      (await shop.agent.get('/owner/orders').query({ open: 'true', q: 'bea' }).expect(200)).body,
    );
    expect(open).toEqual([]);
    const spaced = `${typed.slice(0, 4)} ${typed.slice(4, 7)} ${typed.slice(7)}`;
    for (const q of [typed, spaced, `+63 ${typed.slice(1)}`, typed.slice(1), 'Bea']) {
      const found = BoardSchema.parse(
        (await shop.agent.get('/owner/orders').query({ any: 'true', q }).expect(200)).body,
      );
      expect(found.map((o) => o.id)).toEqual([placed.orderId]);
    }
    // Any day needs something to search for.
    await shop.agent.get('/owner/orders').query({ any: 'true' }).expect(400);
  });

  it('moves an order forward, takes it back within 10 seconds, and needs payment to finish', async () => {
    const shop = await liveShop(app, 'oo-steps');
    const placed = await place(shop);
    const step = (to: string) =>
      shop.agent.post(`/owner/orders/${placed.orderId}/advance`).send({ toStatus: to });

    const preparing = OwnerOrderSchema.parse((await step('preparing').expect(200)).body);
    expect(preparing.status).toBe('preparing');
    const back = OwnerOrderSchema.parse(
      (await shop.agent.post(`/owner/orders/${placed.orderId}/recall`).send({}).expect(200)).body,
    );
    expect(back.status).toBe('placed');

    await step('ready').expect(200);
    await step('preparing')
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('invalid_transition'));
    await step('completed')
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('not_paid'));
    const paid = PaymentSchema.parse(
      (
        await shop.agent
          .post(`/owner/orders/${placed.orderId}/payments`)
          .send({ method: 'cash' })
          .expect(200)
      ).body,
    );
    expect(paid.status).toBe('paid');
    await shop.agent
      .post(`/owner/orders/${placed.orderId}/payments`)
      .send({ method: 'cash' })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('already_paid'));
    const done = OwnerOrderSchema.parse((await step('completed').expect(200)).body);
    expect(done.status).toBe('completed');

    const receipt = OrderReceiptSchema.parse(
      (await phone(app).get(`/s/${shop.slug}/o/${placed.token}`).expect(200)).body,
    );
    expect(receipt.status).toBe('completed');
    expect(receipt.events.map((e) => e.status)).toEqual(['placed', 'ready', 'completed']);
  });

  it('a cancel gives the daily limit back once', async () => {
    const shop = await liveShop(app, 'oo-cancel', { dailyLimit: 1 });
    const first = await place(shop);
    await phone(app).post(`/s/${shop.slug}/orders`).send(payload(shop)).expect(409);
    await shop.agent
      .post(`/owner/orders/${first.orderId}/cancel`)
      .send({ reason: '  ' })
      .expect(422);
    const cancelled = OwnerOrderSchema.parse(
      (
        await shop.agent
          .post(`/owner/orders/${first.orderId}/cancel`)
          .send({ reason: 'Ran out of buns' })
          .expect(200)
      ).body,
    );
    expect(cancelled.status).toBe('cancelled');
    await shop.agent
      .post(`/owner/orders/${first.orderId}/cancel`)
      .send({ reason: 'Again' })
      .expect(409);
    await place(shop);
  });

  it('checks a payment photo: No with a reason, then Yes', async () => {
    const shop = await liveShop(app, 'oo-pay', { gcash: true });
    const placed = await place(shop, { paymentMethod: 'gcash' });
    const sendPhoto = async (referenceNo: string) => {
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
      const sent = await fetch(room.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/webp' },
        body: WEBP,
      });
      expect(sent.ok).toBe(true);
      await phone(app)
        .post(`/s/${shop.slug}/o/${placed.token}/proof`)
        .send({ method: 'gcash', referenceNo, path: room.path })
        .expect(200);
      return room.path;
    };

    // An unpaid transfer can't start.
    await shop.agent
      .post(`/owner/orders/${placed.orderId}/advance`)
      .send({ toStatus: 'preparing' })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('not_paid'));

    const path = await sendPhoto('5551112222');
    const link = z
      .object({ url: z.string().url() })
      .parse((await shop.agent.get('/owner/proofs').query({ path }).expect(200)).body);
    expect(link.url).toContain('/proofs/');

    const chats = z
      .array(ChatSummarySchema)
      .parse((await shop.agent.get('/owner/chats').expect(200)).body);
    expect(chats[0]?.orderId).toBe(placed.orderId);
    expect(chats[0]?.waitingSince).not.toBeNull();

    await shop.agent
      .post(`/owner/payments/${placed.orderId}/review`)
      .send({ approve: false })
      .expect(422);
    const rejected = PaymentSchema.parse(
      (
        await shop.agent
          .post(`/owner/payments/${placed.orderId}/review`)
          .send({ approve: false, rejectReason: 'Amount is short' })
          .expect(200)
      ).body,
    );
    expect(rejected.status).toBe('unpaid');
    expect(rejected.proofs[0]?.status).toBe('rejected');

    // A turned-down reference may be sent again.
    await sendPhoto('5551112222');
    const approved = PaymentSchema.parse(
      (
        await shop.agent
          .post(`/owner/payments/${placed.orderId}/review`)
          .send({ approve: true })
          .expect(200)
      ).body,
    );
    expect(approved.status).toBe('paid');
    expect(approved.paidAmount).toBe(15000);
    await shop.agent
      .post(`/owner/payments/${placed.orderId}/review`)
      .send({ approve: true })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('payment_not_pending'));

    const seen = ChatSummarySchema.parse(
      (await shop.agent.post(`/owner/chats/${placed.orderId}/seen`).send({}).expect(200)).body,
    );
    expect(seen.unseen).toBe(0);
  });

  it('New order: a handed-over walk-in is done at once, and a retry gives the same order', async () => {
    const shop = await liveShop(app, 'oo-new');
    const clientKey = randomUUID();
    const body = {
      payload: ownerPayload(shop),
      pay: { kind: 'paid', amount: null },
      handedOver: true,
      clientKey,
    };
    const made = OwnerOrderCreatedSchema.parse(
      (await shop.agent.post('/owner/orders').send(body).expect(200)).body,
    );
    expect(made.status).toBe('completed');
    const again = OwnerOrderCreatedSchema.parse(
      (await shop.agent.post('/owner/orders').send(body).expect(200)).body,
    );
    expect(again).toEqual(made);
    const detail = OwnerOrderSchema.parse(
      (await shop.agent.get(`/owner/orders/${made.orderId}`).expect(200)).body,
    );
    expect(detail).toMatchObject({
      source: 'owner',
      paidAmount: 15000,
      paymentStatus: 'paid',
      customerName: 'Walk-in',
      customerPhone: null,
    });

    // A part payment must be more than 0 and less than the total.
    await shop.agent
      .post('/owner/orders')
      .send({
        ...body,
        pay: { kind: 'part', amount: 15000 },
        handedOver: false,
        clientKey: randomUUID(),
      })
      .expect(422);
  });

  it('New order: a member uses their prize at the counter, and the handed-over order earns its stamp', async () => {
    const shop = await liveShop(app, 'oo-prize');
    const card: StampCardSettings = {
      status: 'on',
      rule: { minOrderTotal: 0, stampsNeeded: 4, welcomeStamps: 1, maxEarned: 1, period: 'day' },
      reward: {
        kind: 'discount',
        amount: 5000,
        itemId: null,
        variantId: null,
        title: '₱50 off',
        description: null,
        image: null,
        quantityTotal: null,
        quantityLeft: null,
        onePerCustomer: false,
      },
    };
    await shop.agent.put('/owner/stamp-card').send(card).expect(200);
    const email = uniqueEmail('prize');
    const member = phone(app);
    await member.post('/auth/member/code').send({ email }).expect(200);
    const code = await latestCode(email, /code/i);
    await member.post('/auth/member/verify').send({ email, code }).expect(200);
    const joined = await member
      .post(`/s/${shop.slug}/members`)
      .send({ name: 'Rosa', phone: nextPhone() })
      .expect(200);
    const found = await shop.agent
      .get(`/owner/members/find?code=${encodeURIComponent(String(joined.body.memberCode))}`)
      .expect(200);
    const id = z.string().parse(found.body.customerId);
    // The welcome stamp and three from the counter make the card full.
    for (let i = 0; i < 3; i++) {
      await shop.agent
        .post(`/owner/members/${id}/adjust`)
        .send({ delta: 1, reason: 'goodwill', note: null })
        .expect(200);
    }

    const made = OwnerOrderCreatedSchema.parse(
      (
        await shop.agent
          .post('/owner/orders')
          .send({
            payload: ownerPayload(shop, {
              customer: { kind: 'member', memberId: id },
              useReward: true,
            }),
            pay: { kind: 'paid', amount: null },
            handedOver: true,
            clientKey: randomUUID(),
          })
          .expect(200)
      ).body,
    );
    expect(made.status).toBe('completed');
    const detail = OwnerOrderSchema.parse(
      (await shop.agent.get(`/owner/orders/${made.orderId}`).expect(200)).body,
    );
    expect(detail.totals).toMatchObject({ subtotal: 15000, discount: 5000, total: 10000 });
    expect(detail.rewardTitle).toBe('₱50 off');
    // 4 used for the prize, 1 earned by the finished order.
    const after = MemberDetailSchema.parse(
      (await shop.agent.get(`/owner/members/${id}`).expect(200)).body,
    );
    expect(after.balance).toBe(1);
  });

  it('Edit order: a new price, a chat line, and order_changed for an old version', async () => {
    const shop = await liveShop(app, 'oo-edit');
    const made = OwnerOrderCreatedSchema.parse(
      (
        await shop.agent
          .post('/owner/orders')
          .send({
            payload: ownerPayload(shop, {
              type: 'pickup',
              customer: { kind: 'guest', name: 'Ben', phone: '0917 555 1234' },
            }),
            pay: { kind: 'unpaid', amount: null },
            handedOver: false,
            clientKey: randomUUID(),
          })
          .expect(200)
      ).body,
    );
    const quote = await shop.agent
      .post('/owner/orders/quote')
      .send({
        payload: ownerPayload(shop, {
          type: 'pickup',
          lines: [
            { itemId: shop.itemId, variantId: shop.variantId, optionIds: [], qty: 3, note: '' },
          ],
        }),
        orderId: made.orderId,
      })
      .expect(200);
    expect(quote.body.total).toBe(45000);

    const edited = OwnerOrderSchema.parse(
      (
        await shop.agent
          .put(`/owner/orders/${made.orderId}`)
          .send({
            version: 1,
            payload: ownerPayload(shop, {
              type: 'pickup',
              customer: { kind: 'guest', name: 'Ben', phone: '0917 555 1234' },
              lines: [
                { itemId: shop.itemId, variantId: shop.variantId, optionIds: [], qty: 3, note: '' },
              ],
            }),
          })
          .expect(200)
      ).body,
    );
    expect(edited.version).toBe(2);
    expect(edited.totals.total).toBe(45000);
    expect(edited.lines[0]?.qty).toBe(3);
    expect(edited.messages.some((m) => m.kind === 'changed' && m.text?.includes('₱450'))).toBe(
      true,
    );
    await shop.agent
      .put(`/owner/orders/${made.orderId}`)
      .send({ version: 1, payload: ownerPayload(shop, { type: 'pickup' }) })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('order_changed'));
  });

  it('changes the time of a booked pickup and words it for the customer', async () => {
    const shop = await liveShop(app, 'oo-move');
    const lines = [{ itemId: shop.itemId, qty: 1 }];
    const schedule = ScheduleSchema.parse(
      (
        await phone(app)
          .post(`/s/${shop.slug}/schedule`)
          .send({ type: 'pickup', lines })
          .expect(200)
      ).body,
    );
    const open = schedule.days.flatMap((d) => d.slots.filter((s) => s.state === 'open'));
    const first = open[0]?.at ?? null;
    const later = open[3]?.at ?? '';
    const placed = await place(shop, { scheduledAt: first });

    const moved = OwnerOrderSchema.parse(
      (
        await shop.agent
          .post(`/owner/orders/${placed.orderId}/reschedule`)
          .send({ scheduledAt: later })
          .expect(200)
      ).body,
    );
    expect(moved.scheduledAt).toBe(later);
    expect(moved.messages.at(-1)?.text).toMatch(/^Time changed to \w{3}, \w{3} \d{1,2}, /);
    const own = ScheduleSchema.parse(
      (await shop.agent.get(`/owner/orders/${placed.orderId}/schedule`).expect(200)).body,
    );
    expect(own.days.length).toBeGreaterThan(0);
  });

  it('busy and paused reach the storefront at once', async () => {
    const shop = await liveShop(app, 'oo-pause');
    const busy = OpenStateSchema.parse(
      (await shop.agent.post('/owner/pause').send({ mode: 'busy_15' }).expect(200)).body,
    );
    expect(busy.state).toBe('busy');
    const q = await phone(app)
      .post(`/s/${shop.slug}/quote`)
      .send({ ...payload(shop), clientKey: undefined })
      .expect(200);
    expect(q.body.problems.map((p: { code: string }) => p.code)).toContain('shop_busy');
    const open = OpenStateSchema.parse(
      (await shop.agent.post('/owner/pause').send({ mode: 'resume' }).expect(200)).body,
    );
    expect(open.state).toBe('open');

    const rules = await shop.agent.get('/owner/booking-rules').expect(200);
    const saved = await shop.agent
      .put('/owner/booking-rules')
      .send({ ...rules.body, ordersPerSlot: 4 })
      .expect(200);
    expect(saved.body.ordersPerSlot).toBe(4);
  });
});
