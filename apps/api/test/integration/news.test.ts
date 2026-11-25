import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  addDays,
  manilaDate,
  manilaToDate,
  NewsOverviewSchema,
  OwnerNewsSchema,
  ShopNewsItemSchema,
  type SaveNewsInput,
} from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { Db } from '../../src/db/db.service.js';
import { NewsSender } from '../../src/members/news-sender.js';
import { PushSender, RecordingPushSender } from '../../src/push/push-sender.js';
import { integrationApp, latestCode, liveShop, nextPhone, phone, uniqueEmail } from './support.js';

type Shop = Awaited<ReturnType<typeof liveShop>>;

const MessageSchema = z.object({
  notification: z.object({ title: z.string(), body: z.string(), navigate: z.string() }),
});
const ADMIN = { userId: null, shopId: null, role: 'admin' } as const;

function subscription() {
  return {
    endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`,
    expirationTime: null,
    keys: { p256dh: `B${'a'.repeat(86)}`, auth: 'abcdefghijklmnopqrstuv' },
  };
}

/** Noon Manila, `days` from today: never in quiet hours. */
function noonIn(days: number): Date {
  return manilaToDate(addDays(manilaDate(new Date()), days), '12:00');
}

describe('Push News (phase 6)', () => {
  let app: NestExpressApplication;
  let pushes: RecordingPushSender;
  let sender: NewsSender;
  let db: Db;

  beforeAll(async () => {
    app = await integrationApp();
    const recording = app.get(PushSender);
    if (!(recording instanceof RecordingPushSender))
      throw new Error('Tests run without push keys.');
    pushes = recording;
    sender = app.get(NewsSender);
    db = app.get(Db);
  });

  afterAll(async () => {
    await app.close();
  });

  function news(shop: Shop, over: Partial<SaveNewsInput> = {}): SaveNewsInput {
    return {
      id: null,
      title: 'Smash burger is back',
      body: 'Order today and taste the new sauce.',
      imageUrl: null,
      link: { kind: 'item', itemId: shop.itemId },
      audience: 'everyone',
      mode: 'now',
      sendAt: null,
      copiedFromId: null,
      ...over,
    };
  }

  async function overview(shop: Shop) {
    return NewsOverviewSchema.parse((await shop.agent.get('/owner/news').expect(200)).body);
  }

  async function memberAgent(shop: Shop, name: string) {
    const email = uniqueEmail(name.toLowerCase());
    const agent = phone(app);
    await agent.post('/auth/member/code').send({ email }).expect(200);
    const code = await latestCode(email, /code/i);
    await agent.post('/auth/member/verify').send({ email, code }).expect(200);
    await agent.post(`/s/${shop.slug}/members`).send({ name, phone: nextPhone() }).expect(200);
    return agent;
  }

  it('keeps the limits, sends to phones with news on, and counts opens, orders and stops', async () => {
    const shop = await liveShop(app, 'news');
    const empty = await overview(shop);
    expect(empty.phones).toBe(0);
    expect(empty.news).toEqual([]);
    // Nobody to send to yet; a draft needs a body (the database keeps one on every news).
    await shop.agent
      .post('/owner/news')
      .send(news(shop))
      .expect(422)
      .expect((res) => expect(res.body.code).toBe('news_no_audience'));
    await shop.agent
      .post('/owner/news')
      .send(news(shop, { mode: 'draft', body: '  ' }))
      .expect(422)
      .expect((res) => expect(res.body.fieldErrors.body).toBeDefined());
    const draft = OwnerNewsSchema.parse(
      (
        await shop.agent
          .post('/owner/news')
          .send(news(shop, { mode: 'draft' }))
          .expect(200)
      ).body,
    );
    expect(draft.status).toBe('draft');
    expect(draft.itemName).toBe('Smash burger');

    // A guest's phone and a member's phone turn news on.
    const guest = phone(app);
    const guestSub = subscription();
    await guest
      .put(`/s/${shop.slug}/push/news`)
      .send({ subscription: guestSub, news: true })
      .expect(200);
    const checked = await guest
      .post(`/s/${shop.slug}/push/news/check`)
      .send({ endpoint: guestSub.endpoint })
      .expect(200);
    expect(checked.body.news).toBe(true);
    const member = await memberAgent(shop, 'Bea');
    await member
      .put(`/s/${shop.slug}/push/news`)
      .send({ subscription: subscription(), news: true })
      .expect(200);
    // A phone that never subscribed has news off.
    const unknown = await phone(app)
      .post(`/s/${shop.slug}/push/news/check`)
      .send({ endpoint: subscription().endpoint })
      .expect(200);
    expect(unknown.body.news).toBe(false);

    const counted = await overview(shop);
    expect(counted.phones).toBe(2);
    expect(counted.memberPhones).toBe(1);
    expect(counted.newThisWeek).toBe(2);
    expect(counted.audiences.find((a) => a.audience === 'members')?.phones).toBe(1);

    // The draft goes now (or at 8 AM in quiet hours); a second one the same day waits for tomorrow.
    const first = OwnerNewsSchema.parse(
      (await shop.agent.patch(`/owner/news/${draft.id}`).send(news(shop)).expect(200)).body,
    );
    expect(first.status).toBe('scheduled');
    expect(first.phones).toBe(2);
    await shop.agent
      .post('/owner/news')
      .send(news(shop))
      .expect(422)
      .expect((res) => expect(res.body.code).toBe('news_day_limit'));
    const later = OwnerNewsSchema.parse(
      (
        await shop.agent
          .post('/owner/news')
          .send(news(shop, { mode: 'later', sendAt: noonIn(3).toISOString(), audience: 'members' }))
          .expect(200)
      ).body,
    );
    expect(later.phones).toBe(1);
    // Two in 7 days is the most; nothing goes from 9 PM to 8 AM.
    await shop.agent
      .post('/owner/news')
      .send(news(shop, { mode: 'later', sendAt: noonIn(5).toISOString() }))
      .expect(422)
      .expect((res) => expect(res.body.code).toBe('news_week_limit'));
    const night = manilaToDate(addDays(manilaDate(new Date()), 5), '22:00');
    await shop.agent
      .post('/owner/news')
      .send(news(shop, { mode: 'later', sendAt: night.toISOString() }))
      .expect(422)
      .expect((res) => expect(res.body.code).toBe('news_quiet_hours'));
    // Cancelled, it is a draft again and can be deleted.
    const cancelled = await shop.agent.post(`/owner/news/${later.id}/cancel`).expect(200);
    expect(cancelled.body.status).toBe('draft');
    await shop.agent.delete(`/owner/news/${later.id}`).expect(200);
    await shop.agent.get(`/owner/news/${later.id}`).expect(404);

    // The send job (a clock past the due time) sends one push per phone, then marks it sent.
    const before = pushes.sent.length;
    for (let i = 0; i < 5; i++) {
      await sender.runOnce(noonIn(1));
      const now = OwnerNewsSchema.parse(
        (await shop.agent.get(`/owner/news/${first.id}`).expect(200)).body,
      );
      if (now.status === 'sent') break;
    }
    const went = pushes.sent
      .slice(before)
      .map((p) => MessageSchema.parse(JSON.parse(p.body)).notification)
      .filter((n) => n.title === 'Smash burger is back');
    expect(went).toHaveLength(2);
    const link = went[0]?.navigate ?? '';
    expect(link).toContain(`/${shop.slug}/menu?item=${shop.itemId}&from=news&d=`);
    const deliveries = went.map((n) => new URL(n.navigate).searchParams.get('d') ?? '');

    // Taps count once each; the member orders within the day; the guest turns news off.
    for (const d of deliveries) {
      await phone(app).post(`/s/${shop.slug}/news/opened`).send({ deliveryId: d }).expect(200);
    }
    await member
      .post(`/s/${shop.slug}/orders`)
      .send({
        type: 'pickup',
        scheduledAt: null,
        lines: [
          { itemId: shop.itemId, variantId: shop.variantId, optionIds: [], qty: 2, note: '' },
        ],
        customer: { name: 'Bea', phone: nextPhone(), email: null },
        delivery: null,
        paymentMethod: 'cash',
        paymentAccountId: null,
        note: null,
        useReward: false,
        clientKey: randomUUID(),
      })
      .expect(200);
    await guest
      .put(`/s/${shop.slug}/push/news`)
      .send({ subscription: guestSub, news: false })
      .expect(200);

    const sent = OwnerNewsSchema.parse(
      (await shop.agent.get(`/owner/news/${first.id}`).expect(200)).body,
    );
    expect(sent.status).toBe('sent');
    expect(sent.results).toMatchObject({
      sent: 2,
      opened: 2,
      ordered: 1,
      sales: 30000,
      stopped: 1,
    });
    // Sent news stay for the results.
    await shop.agent
      .delete(`/owner/news/${first.id}`)
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('news_already_sent'));
    const after = await overview(shop);
    expect(after.phones).toBe(1);
    expect(after.last30).toMatchObject({ news: 1, ordered: 1, sales: 30000 });

    // The customer's inbox shows it with the shop path.
    const inbox = z
      .array(ShopNewsItemSchema)
      .parse((await phone(app).get(`/s/${shop.slug}/news`).expect(200)).body);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]?.path).toBe(`/${shop.slug}/menu?item=${shop.itemId}&from=news`);

    // The two automatic pushes can be turned off; a test goes only to the owner's own devices.
    const auto = await shop.agent
      .put('/owner/push-settings')
      .send({ stampAdded: false, rewardReady: true })
      .expect(200);
    expect(auto.body).toEqual({ stampAdded: false, rewardReady: true });
    await shop.agent
      .post('/owner/news/test')
      .send({ title: 'Test', body: 'Hello', imageUrl: null })
      .expect(200);
  });

  it('holds a news whose item is gone, and another shop never sees it', async () => {
    const shop = await liveShop(app, 'news-wait');
    await phone(app)
      .put(`/s/${shop.slug}/push/news`)
      .send({ subscription: subscription(), news: true })
      .expect(200);
    const set = OwnerNewsSchema.parse(
      (
        await shop.agent
          .post('/owner/news')
          .send(news(shop, { mode: 'later', sendAt: noonIn(2).toISOString() }))
          .expect(200)
      ).body,
    );
    await db.run(ADMIN, async () => {
      await db.tx.execute(
        sql`update public.items set status = 'hidden' where id = ${shop.itemId}::uuid`,
      );
    });
    await sender.runOnce(noonIn(2));
    const held = OwnerNewsSchema.parse(
      (await shop.agent.get(`/owner/news/${set.id}`).expect(200)).body,
    );
    expect(held.status).toBe('waiting');
    expect(held.waitReason).toBe('link_gone');

    const other = await liveShop(app, 'news-other');
    await other.agent.get(`/owner/news/${set.id}`).expect(404);
    await other.agent.post(`/owner/news/${set.id}/cancel`).expect(404);
  });
});
