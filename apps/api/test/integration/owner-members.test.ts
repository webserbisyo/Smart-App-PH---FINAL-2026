import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  CounterChangeSchema,
  CustomerPageSchema,
  MemberDetailSchema,
  MembersOverviewSchema,
  OwnerClaimSchema,
  StampCardSettingsSchema,
  type StampCardSettings,
} from '@smartapp/core';
import { z } from 'zod';
import { integrationApp, latestCode, liveShop, nextPhone, phone, uniqueEmail } from './support.js';

type Shop = Awaited<ReturnType<typeof liveShop>>;

const CARD: StampCardSettings = {
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

describe('owner Members (phase 6)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await integrationApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function join(shop: Shop, name: string, mobile = nextPhone()) {
    const email = uniqueEmail(name.toLowerCase());
    const agent = phone(app);
    await agent.post('/auth/member/code').send({ email }).expect(200);
    const code = await latestCode(email, /code/i);
    await agent.post('/auth/member/verify').send({ email, code }).expect(200);
    const joined = await agent
      .post(`/s/${shop.slug}/members`)
      .send({ name, phone: mobile })
      .expect(200);
    return { agent, code: z.string().parse(joined.body.memberCode) };
  }

  it('saves the card, gives counter stamps with Undo, and keeps the daily limit', async () => {
    const shop = await liveShop(app, 'owner-members');
    // A new shop's card is Off until the owner saves one.
    const blank = StampCardSettingsSchema.parse(
      (await shop.agent.get('/owner/stamp-card').expect(200)).body,
    );
    expect(blank.status).toBe('off');
    const saved = await shop.agent.put('/owner/stamp-card').send(CARD).expect(200);
    expect(saved.body.rule.stampsNeeded).toBe(4);

    const ana = await join(shop, 'Ana');
    // A guest with an order shows on the list too.
    await phone(app)
      .post(`/s/${shop.slug}/orders`)
      .send({
        type: 'pickup',
        scheduledAt: null,
        lines: [
          { itemId: shop.itemId, variantId: shop.variantId, optionIds: [], qty: 1, note: '' },
        ],
        customer: { name: 'Gina Guest', phone: nextPhone(), email: null },
        delivery: null,
        paymentMethod: 'cash',
        paymentAccountId: null,
        note: null,
        useReward: false,
        clientKey: randomUUID(),
      })
      .expect(200);

    const found = await shop.agent
      .get(`/owner/members/find?code=${encodeURIComponent(ana.code.toLowerCase())}`)
      .expect(200);
    const id: string = found.body.customerId;
    expect(found.body.claimId).toBeNull();
    // Only an exact code opens a card.
    await shop.agent.get('/owner/members/find?code=ZZ-0000').expect(404);

    const key = randomUUID();
    const first = CounterChangeSchema.parse(
      (
        await shop.agent
          .post(`/owner/members/${id}/stamp`)
          .send({ clientKey: key, confirmRecent: false })
          .expect(200)
      ).body,
    );
    expect(first.member.balance).toBe(2);
    // The same tap again gives the same result; a new tap within 2 minutes asks first.
    const again = await shop.agent
      .post(`/owner/members/${id}/stamp`)
      .send({ clientKey: key, confirmRecent: false })
      .expect(200);
    expect(again.body.entryId).toBe(first.entryId);
    await shop.agent
      .post(`/owner/members/${id}/stamp`)
      .send({ clientKey: randomUUID(), confirmRecent: false })
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('stamp_recent'));

    // Undo within the window takes it back; the member never sees either line.
    const undone = MemberDetailSchema.parse(
      (
        await shop.agent
          .post(`/owner/members/${id}/undo`)
          .send({ entryId: first.entryId })
          .expect(200)
      ).body,
    );
    expect(undone.balance).toBe(1);
    expect(undone.history.filter((h) => h.undone).length).toBe(2);
    const mine = await ana.agent.get(`/s/${shop.slug}/me`).expect(200);
    expect(mine.body.history.map((h: { kind: string }) => h.kind)).toEqual(['welcome']);
    await shop.agent.post(`/owner/members/${id}/undo`).send({ entryId: first.entryId }).expect(409);

    // Three manual changes a day (the undone one counts as none).
    for (let i = 0; i < 3; i++) {
      await shop.agent
        .post(`/owner/members/${id}/adjust`)
        .send({ delta: 1, reason: 'goodwill', note: 'Birthday' })
        .expect(200);
    }
    await shop.agent
      .post(`/owner/members/${id}/adjust`)
      .send({ delta: 1, reason: 'goodwill', note: null })
      .expect(429)
      .expect((res) => expect(res.body.code).toBe('stamp_cap_reached'));

    const detail = MemberDetailSchema.parse(
      (await shop.agent.get(`/owner/members/${id}`).expect(200)).body,
    );
    expect(detail).toMatchObject({ balance: 4, changesLeftToday: 0, isMember: true });
    expect(detail.history[0]?.note).toBe('Birthday');

    // The reward at the counter.
    const used = CounterChangeSchema.parse(
      (
        await shop.agent
          .post(`/owner/members/${id}/use-reward`)
          .send({ clientKey: randomUUID() })
          .expect(200)
      ).body,
    );
    expect(used.member.balance).toBe(0);

    const list = CustomerPageSchema.parse(
      (await shop.agent.get('/owner/members?filter=all&q=&sort=name&cursor=0&limit=20').expect(200))
        .body,
    );
    expect(list.rows.map((r) => r.name)).toEqual(['Ana']);
    const guests = CustomerPageSchema.parse(
      (
        await shop.agent
          .get('/owner/members?filter=guests&q=gina&sort=last_order&cursor=0&limit=20')
          .expect(200)
      ).body,
    );
    expect(guests.rows).toHaveLength(1);
    const guest = MemberDetailSchema.parse(
      (await shop.agent.get(`/owner/members/${guests.rows[0]?.id ?? ''}`).expect(200)).body,
    );
    expect(guest).toMatchObject({ isMember: false, name: 'Gina Guest' });
    expect(guest.orders[0]?.itemsSummary).toBe('1 × Smash burger');

    const overview = MembersOverviewSchema.parse(
      (await shop.agent.get('/owner/members/overview').expect(200)).body,
    );
    expect(overview).toMatchObject({ members: 1, guests: 1, rewardsGiven: 1, goal: 4 });
    expect(overview.pulse.joined).toBe(1);
    expect(overview.pulse.activity[0]?.kind).toBe('reward');

    // Another shop's member is Not found here (rule 12).
    const other = await liveShop(app, 'owner-members-other');
    await other.agent.get(`/owner/members/${id}`).expect(404);
  });

  it('hands a custom prize over at the counter, or cancels a claim and gives everything back', async () => {
    const shop = await liveShop(app, 'owner-prize');
    await shop.agent
      .put('/owner/stamp-card')
      .send({
        ...CARD,
        rule: { ...CARD.rule, maxEarned: null, period: null },
        reward: {
          ...CARD.reward,
          kind: 'custom',
          amount: null,
          title: 'Tote bag',
          quantityTotal: 2,
          quantityLeft: 2,
        },
      })
      .expect(200);
    const preview = await shop.agent
      .post('/owner/stamp-card/preview')
      .send({ ...CARD, rule: { ...CARD.rule, stampsNeeded: 5 } })
      .expect(200);
    expect(preview.body).toEqual({ readyNow: 0, loseReady: 0, pendingClaims: 0 });

    const ben = await join(shop, 'Ben');
    const id: string = (await shop.agent.get(`/owner/members/find?code=${ben.code}`).expect(200))
      .body.customerId;
    await shop.agent
      .post(`/owner/members/${id}/adjust`)
      .send({ delta: 1, reason: 'correction', note: null })
      .expect(200);
    await shop.agent
      .post(`/owner/members/${id}/adjust`)
      .send({ delta: 1, reason: 'correction', note: null })
      .expect(200);
    await shop.agent
      .post(`/owner/members/${id}/adjust`)
      .send({ delta: 1, reason: 'correction', note: null })
      .expect(200);

    // Ben claims on his phone; the owner finds the claim by its code and cancels it.
    const claim = await ben.agent.post(`/s/${shop.slug}/me/claims`).send({}).expect(200);
    const byCode = await shop.agent
      .get(`/owner/members/find?code=${encodeURIComponent(claim.body.code)}`)
      .expect(200);
    expect(byCode.body.customerId).toBe(id);
    const claims = z
      .array(OwnerClaimSchema)
      .parse((await shop.agent.get('/owner/claims').expect(200)).body);
    expect(claims[0]).toMatchObject({ status: 'pending', memberName: 'Ben' });
    expect(byCode.body.claimId).toBe(claims[0]?.id);
    const cancelled = await shop.agent
      .post(`/owner/claims/${claims[0]?.id}/cancel`)
      .send({ reason: 'no_show' })
      .expect(200);
    expect(cancelled.body).toMatchObject({ status: 'cancelled', cancelReason: 'no_show' });
    await shop.agent.post(`/owner/claims/${claims[0]?.id}/give`).send({}).expect(409);
    const card = StampCardSettingsSchema.parse(
      (await shop.agent.get('/owner/stamp-card').expect(200)).body,
    );
    expect(card.reward.quantityLeft).toBe(2);

    // Handed over at once at the counter: a given claim and one piece fewer.
    const handed = CounterChangeSchema.parse(
      (
        await shop.agent
          .post(`/owner/members/${id}/use-reward`)
          .send({ clientKey: randomUUID() })
          .expect(200)
      ).body,
    );
    expect(handed.member.balance).toBe(0);
    expect(handed.member.claims[0]?.status).toBe('given');
    // Undo puts the prize back on the shelf.
    await shop.agent
      .post(`/owner/members/${id}/undo`)
      .send({ entryId: handed.entryId })
      .expect(200);
    const after = StampCardSettingsSchema.parse(
      (await shop.agent.get('/owner/stamp-card').expect(200)).body,
    );
    expect(after.reward.quantityLeft).toBe(2);

    // Pausing keeps the card's rule and reward.
    await shop.agent.post('/owner/stamp-card/status').send({ status: 'paused' }).expect(200);
    expect((await shop.agent.get('/owner/stamp-card').expect(200)).body.status).toBe('paused');
  });

  it('never lets ten rewards at once take the card below zero', async () => {
    const shop = await liveShop(app, 'owner-race');
    await shop.agent
      .put('/owner/stamp-card')
      .send({ ...CARD, rule: { ...CARD.rule, stampsNeeded: 4, welcomeStamps: 1 } })
      .expect(200);
    const cy = await join(shop, 'Cy');
    const id: string = (await shop.agent.get(`/owner/members/find?code=${cy.code}`).expect(200))
      .body.customerId;
    for (let i = 0; i < 3; i++) {
      await shop.agent
        .post(`/owner/members/${id}/adjust`)
        .send({ delta: 1, reason: 'correction', note: null })
        .expect(200);
    }
    const answers = await Promise.all(
      Array.from({ length: 10 }, () =>
        shop.agent.post(`/owner/members/${id}/use-reward`).send({ clientKey: randomUUID() }),
      ),
    );
    expect(answers.filter((a) => a.status === 200)).toHaveLength(1);
    expect(
      answers.filter((a) => a.status === 409).every((a) => a.body.code === 'stamps_insufficient'),
    ).toBe(true);
    const detail = MemberDetailSchema.parse(
      (await shop.agent.get(`/owner/members/${id}`).expect(200)).body,
    );
    expect(detail.balance).toBe(0);
  });
});
