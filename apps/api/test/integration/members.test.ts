import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { Db } from '../../src/db/db.service.js';
import { integrationApp, latestCode, liveShop, nextPhone, phone, uniqueEmail } from './support.js';

describe('members on the storefront (phase 6)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await integrationApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs a customer in with the emailed code, in the member cookies only', async () => {
    const email = uniqueEmail('mila');
    const agent = phone(app);

    const sent = await agent.post('/auth/member/code').send({ email }).expect(200);
    expect(sent.body.devCode).toBeNull();
    expect(Date.parse(sent.body.resendAt) - Date.parse(sent.body.sentAt)).toBe(60_000);

    await agent
      .post('/auth/member/verify')
      .send({ email, code: '000000' })
      .expect(400)
      .expect((res) => expect(res.body.code).toBe('invalid_code'));

    const code = await latestCode(email, /code/i);
    const verified = await agent.post('/auth/member/verify').send({ email, code }).expect(200);
    expect(verified.body).toEqual({ email });
    const cookies = String(verified.headers['set-cookie'] ?? '');
    expect(cookies).toContain('sa_member_at');
    expect(cookies).not.toContain('sa_owner_at');

    // A member is not an owner: the dashboard still sees nobody.
    expect((await agent.get('/auth/session').expect(200)).body).toEqual({ session: null });

    await agent.post('/auth/member/sign-out').send({}).expect(200);
  });
});

const ADMIN = { userId: null, shopId: null, role: 'admin' } as const;
const Placed = z.object({ orderId: z.string(), orderNo: z.number(), token: z.string() });

describe('joining, stamps and prizes (phase 6)', () => {
  let app: NestExpressApplication;
  let db: Db;

  beforeAll(async () => {
    app = await integrationApp();
    db = app.get(Db);
  });

  afterAll(async () => {
    await app.close();
  });

  async function member(email: string) {
    const agent = phone(app);
    await agent.post('/auth/member/code').send({ email }).expect(200);
    const code = await latestCode(email, /code/i);
    await agent.post('/auth/member/verify').send({ email, code }).expect(200);
    return agent;
  }

  async function card(shopId: string, set: string) {
    await db.run(ADMIN, async () => {
      await db.tx.execute(sql`
        insert into public.stamp_cards (tenant_id, status, stamps_needed, welcome_stamps, max_earned, period,
          reward_kind, reward_amount, reward_title)
        values (${shopId}::uuid, 'on', 4, 1, null, null, 'discount', 5000, '₱50 off')
        on conflict (tenant_id) do nothing`);
      await db.tx.execute(
        sql.raw(`update public.stamp_cards set ${set} where tenant_id = '${shopId}'`),
      );
    });
  }

  function order(shop: Awaited<ReturnType<typeof liveShop>>, over: Record<string, unknown> = {}) {
    return {
      type: 'pickup',
      scheduledAt: null,
      lines: [{ itemId: shop.itemId, variantId: shop.variantId, optionIds: [], qty: 1, note: '' }],
      customer: { name: 'Mila Reyes', phone: nextPhone(), email: null },
      delivery: null,
      paymentMethod: 'cash',
      paymentAccountId: null,
      note: null,
      useReward: false,
      clientKey: randomUUID(),
      ...over,
    };
  }

  /** Cash taken at the counter, then each step to Completed. */
  async function complete(shop: Awaited<ReturnType<typeof liveShop>>, orderId: string) {
    await shop.agent.post(`/owner/orders/${orderId}/payments`).send({ method: 'cash' }).expect(200);
    for (const toStatus of ['preparing', 'ready', 'completed']) {
      await shop.agent.post(`/owner/orders/${orderId}/advance`).send({ toStatus }).expect(200);
    }
  }

  it('joins with a welcome stamp, links the guest order, earns on Complete and uses the reward', async () => {
    const shop = await liveShop(app, 'stamps');
    await card(shop.shopId, "status = 'on'");
    const email = uniqueEmail('mila');
    const mobile = nextPhone();

    // A guest order first, with the same email: it joins the card on Join.
    const guest = Placed.parse(
      (
        await phone(app)
          .post(`/s/${shop.slug}/orders`)
          .send(order(shop, { customer: { name: 'Mila Reyes', phone: mobile, email } }))
          .expect(200)
      ).body,
    );

    const agent = await member(email);
    // Signed in, not a member yet.
    expect((await agent.get(`/s/${shop.slug}/me`).expect(200)).body).toBeNull();
    await phone(app).post(`/s/${shop.slug}/me/claims`).send({}).expect(401);

    const joined = await agent
      .post(`/s/${shop.slug}/members`)
      .send({ name: 'Mila Reyes', phone: mobile, avatar: { kind: 'initials', theme: 'sky' } })
      .expect(200);
    expect(joined.body).toMatchObject({
      name: 'Mila Reyes',
      email,
      phone: `+63${mobile.slice(1)}`,
      balance: 1,
      pendingStamps: 1,
      rewardReady: false,
      avatar: { kind: 'initials', theme: 'sky' },
    });
    expect(joined.body.memberCode).toMatch(/^[A-Z]{2}-\d{4,6}$/);
    expect(joined.body.history.map((h: { kind: string }) => h.kind)).toEqual([
      'welcome',
      'pending',
    ]);

    // Joining again gives the same card; another account with this phone is refused.
    const again = await agent
      .post(`/s/${shop.slug}/members`)
      .send({ name: 'Other', phone: mobile })
      .expect(200);
    expect(again.body.memberCode).toBe(joined.body.memberCode);
    const other = await member(uniqueEmail('lito'));
    await other
      .post(`/s/${shop.slug}/members`)
      .send({ name: 'Lito', phone: mobile })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('phone_in_use'));

    // My orders shows the member's order without any token kept on the phone.
    const mine = await agent.post(`/s/${shop.slug}/my-orders`).send({ tokens: [] }).expect(200);
    expect(mine.body.map((o: { token: string }) => o.token)).toEqual([guest.token]);

    // Complete earns one stamp (a finished order can't be taken back, so it earns once).
    await complete(shop, guest.orderId);
    const after = await agent.get(`/s/${shop.slug}/me`).expect(200);
    expect(after.body).toMatchObject({ balance: 2, pendingStamps: 0 });

    // Two more finished orders fill the card (4).
    for (let i = 0; i < 2; i++) {
      const placed = Placed.parse(
        (await agent.post(`/s/${shop.slug}/orders`).send(order(shop)).expect(200)).body,
      );
      // This phone asked for order updates on the receipt.
      await agent
        .post(`/s/${shop.slug}/o/${placed.token}/push`)
        .send({
          subscription: {
            endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`,
            expirationTime: null,
            keys: { p256dh: `B${'a'.repeat(86)}`, auth: 'abcdefghijklmnopqrstuv' },
          },
        })
        .expect(200);
      await complete(shop, placed.orderId);
    }
    const full = await agent.get(`/s/${shop.slug}/me`).expect(200);
    expect(full.body).toMatchObject({ balance: 4, rewardReady: true });
    const done = await db.run(ADMIN, async () =>
      z
        .array(z.object({ kind: z.string() }))
        .parse(
          (
            await db.tx.execute(
              sql`select kind from public.push_outbox where tenant_id = ${shop.shopId}::uuid and kind in ('stamp_added', 'reward_ready') order by created_at`,
            )
          ).rows,
        ),
    );
    // Completed is one push with the stamp, then with the reward when the card is full (T106).
    expect(done.map((d) => d.kind)).toEqual(['stamp_added', 'reward_ready']);

    // Use the reward at checkout: ₱50 off, the stamps go; a cancel gives them back.
    const quote = await agent
      .post(`/s/${shop.slug}/quote`)
      .send({ ...order(shop, { useReward: true }), clientKey: undefined })
      .expect(200);
    expect(quote.body.discount).toBe(5000);
    const used = Placed.parse(
      (
        await agent
          .post(`/s/${shop.slug}/orders`)
          .send(order(shop, { useReward: true }))
          .expect(200)
      ).body,
    );
    expect((await agent.get(`/s/${shop.slug}/me`).expect(200)).body.balance).toBe(0);
    const receipt = await phone(app).get(`/s/${shop.slug}/o/${used.token}`).expect(200);
    expect(receipt.body.totals.discount).toBe(5000);
    await shop.agent
      .post(`/owner/orders/${used.orderId}/cancel`)
      .send({ reason: 'Out of buns' })
      .expect(200);
    const back = await agent.get(`/s/${shop.slug}/me`).expect(200);
    expect(back.body.balance).toBe(4);
    expect(back.body.history[0]).toMatchObject({ kind: 'returned', delta: 4 });
  });

  it('claims a limited custom prize once, and keeps the picture and addresses', async () => {
    const shop = await liveShop(app, 'prize');
    await card(
      shop.shopId,
      "status = 'on', reward_kind = 'custom', reward_amount = null, reward_title = 'Tote bag', quantity_total = 1, quantity_left = 1",
    );
    const give = async (agent: Awaited<ReturnType<typeof member>>, mobile: string) => {
      const joined = await agent
        .post(`/s/${shop.slug}/members`)
        .send({ name: 'Ana', phone: mobile })
        .expect(200);
      await db.run(ADMIN, async () => {
        await db.tx.execute(sql`
          insert into public.stamp_entries (tenant_id, member_id, kind, delta, reason_category)
          select tenant_id, id, 'given', 3, 'goodwill' from public.members
          where tenant_id = ${shop.shopId}::uuid and member_code = ${joined.body.memberCode}`);
      });
    };

    const ana = await member(uniqueEmail('ana'));
    await ana.post(`/s/${shop.slug}/members`).send({ name: 'Ana', phone: nextPhone() }).expect(200);
    await ana
      .post(`/s/${shop.slug}/me/claims`)
      .send({})
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('stamps_insufficient'));
    await db.run(ADMIN, async () => {
      await db.tx.execute(sql`
        insert into public.stamp_entries (tenant_id, member_id, kind, delta, reason_category)
        select tenant_id, id, 'given', 3, 'goodwill' from public.members
        where tenant_id = ${shop.shopId}::uuid and name = 'Ana'`);
    });
    const claim = await ana.post(`/s/${shop.slug}/me/claims`).send({}).expect(200);
    expect(claim.body).toMatchObject({ status: 'pending', title: 'Tote bag' });
    expect(claim.body.qrUrl).toContain(`/m/${claim.body.code}`);
    const me = await ana.get(`/s/${shop.slug}/me`).expect(200);
    expect(me.body.balance).toBe(0);
    expect(me.body.claims).toHaveLength(1);

    // The last piece is gone for the next member.
    const ben = await member(uniqueEmail('ben'));
    await give(ben, nextPhone());
    await ben
      .post(`/s/${shop.slug}/me/claims`)
      .send({})
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('reward_all_claimed'));

    // Picture: a face, then back to the shop's Fun face.
    const face = await ana
      .put(`/s/${shop.slug}/me/avatar`)
      .send({ avatar: { kind: 'face', style: 'soft', face: 3, theme: 'sky' } })
      .expect(200);
    expect(face.body.avatar).toMatchObject({ kind: 'face', face: 3 });
    const cleared = await ana.put(`/s/${shop.slug}/me/avatar`).send({ avatar: null }).expect(200);
    expect(cleared.body.avatar).toBeNull();

    // Addresses: add, change, remove.
    const added = await ana
      .put(`/s/${shop.slug}/me/addresses`)
      .send({
        id: 'new',
        label: 'Home',
        addressLine: '12 Mabini St, Quezon City',
        houseNo: null,
        floor: null,
        landmark: 'Blue gate',
        spot: { lat: 14.6, lng: 121.0 },
        zoneId: null,
      })
      .expect(200);
    expect(added.body).toHaveLength(1);
    const id: string = added.body[0].id;
    const changed = await ana
      .put(`/s/${shop.slug}/me/addresses`)
      .send({ ...added.body[0], label: 'Work' })
      .expect(200);
    expect(changed.body).toEqual([expect.objectContaining({ id, label: 'Work' })]);
    const removed = await ana.delete(`/s/${shop.slug}/me/addresses/${id}`).expect(200);
    expect(removed.body).toEqual([]);
  });
});
