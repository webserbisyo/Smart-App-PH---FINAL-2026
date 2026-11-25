import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { sql } from 'drizzle-orm';
import { Db } from '../../src/db/db.service.js';
import {
  integrationApp,
  latestCode,
  makeAccount,
  phone,
  PASSWORD,
  shopInput,
  signedIn,
  uniqueEmail,
} from './support.js';

describe('owner accounts through NestJS (phase 2)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await integrationApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs up with the emailed code, makes the shop and links the lead', async () => {
    const email = uniqueEmail('ana');
    const agent = phone(app);

    const lead = await agent
      .post('/signup/leads')
      .send({
        fullName: 'Ana Cruz',
        email,
        phone: '+639171234567',
        termsVersion: '2026-11',
        source: { channel: 'facebook_ad', campaign: 'nov-video' },
        eventId: 'lead-event-0001',
        fbp: null,
        fbc: null,
        pageUrl: 'http://localhost:5173/signup',
      })
      .expect((res) => expect(res.body).toHaveProperty('leadId'));
    const leadId: string = lead.body.leadId;

    await agent
      .post('/auth/sign-up')
      .set('x-smartapp', '1')
      .send({ fullName: 'Ana Cruz', email, password: PASSWORD })
      .expect(200);

    // Not signed in until the code is typed.
    expect((await agent.get('/auth/session').expect(200)).body).toEqual({ session: null });

    await agent
      .post('/auth/sign-up/verify')
      .set('x-smartapp', '1')
      .send({ email, code: '000000' })
      .expect(400)
      .expect((res) => expect(res.body.code).toBe('invalid_code'));

    const code = await latestCode(email, /code/i);
    const verified = await agent
      .post('/auth/sign-up/verify')
      .set('x-smartapp', '1')
      .send({ email, code: `${code.slice(0, 3)} ${code.slice(3)}` })
      .expect(200);
    expect(verified.body.email).toBe(email);

    expect((await agent.get('/owner/shop').expect(200)).body).toEqual({ shop: null });

    const made = await agent
      .post('/signup/shop')
      .set('x-smartapp', '1')
      .send(shopInput("Ana's Bakeshop", 'food', leadId))
      .expect(201);
    expect(made.body.stage).toBe('setting_up');
    expect(made.body.steps).toHaveLength(4);

    const shop = await agent.get('/owner/shop').expect(200);
    expect(shop.body.shop).toMatchObject({
      name: "Ana's Bakeshop",
      kind: 'food',
      stage: 'setting_up',
    });
    expect(shop.body.shop.slug).toMatch(/^anas-bakeshop/);

    // The lead now belongs to the shop, with where the sign-up came from.
    const db = app.get(Db);
    const rows = await db.run({ userId: null, shopId: null, role: 'admin' }, () =>
      db.tx.execute<{ channel: string; campaign: string | null; leads: string }>(
        sql`select t.channel, t.campaign, (select count(*) from public.signup_leads l where l.tenant_id = t.id)::text as leads
            from public.tenants t where t.id = ${shop.body.shop.id}::uuid`,
      ),
    );
    expect(rows.rows[0]).toEqual({ channel: 'facebook_ad', campaign: 'nov-video', leads: '1' });

    // One shop per owner.
    await agent
      .post('/signup/shop')
      .set('x-smartapp', '1')
      .send(shopInput('Second shop'))
      .expect(409)
      .expect((res) => expect(res.body.code).toBe('already_has_shop'));
  });

  it('a taken name still gets a free link', async () => {
    const one = await signedIn(app, await withAccount('tito'));
    const two = await signedIn(app, await withAccount('tita'));
    const name = `Same Name ${Date.now()}`;
    await one.post('/signup/shop').set('x-smartapp', '1').send(shopInput(name)).expect(201);
    await two.post('/signup/shop').set('x-smartapp', '1').send(shopInput(name)).expect(201);
    const a = (await one.get('/owner/shop')).body.shop.slug;
    const b = (await two.get('/owner/shop')).body.shop.slug;
    expect(a).not.toBe(b);
    expect((await phone(app).get(`/slugs/${a}`).expect(200)).body).toEqual({ free: false });
  });

  it('reserved and badly formed links are never free', async () => {
    const api = phone(app);
    expect((await api.get('/slugs/demo')).body).toEqual({ free: false });
    expect((await api.get('/slugs/api-staging')).body).toEqual({ free: false });
    expect((await api.get('/slugs/ab')).body).toEqual({ free: false });
    expect((await api.get(`/slugs/brand-new-${Date.now()}`)).body).toEqual({ free: true });
  });

  it('a wrong password and an unknown email give the same error', async () => {
    const email = await withAccount('rosa');
    const api = phone(app);
    const wrong = await api
      .post('/auth/sign-in')
      .set('x-smartapp', '1')
      .send({ email, password: 'not-the-password' })
      .expect(401);
    const unknown = await api
      .post('/auth/sign-in')
      .set('x-smartapp', '1')
      .send({ email: uniqueEmail('nobody'), password: 'not-the-password' })
      .expect(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.code).toBe('invalid_login');
  });

  it('forgot password: code, new password, signed in, old password gone', async () => {
    const email = await withAccount('lito');
    const agent = phone(app);
    await agent.post('/auth/forgot/code').set('x-smartapp', '1').send({ email }).expect(200);
    // An unknown email answers the same.
    await agent
      .post('/auth/forgot/code')
      .set('x-smartapp', '1')
      .send({ email: uniqueEmail('ghost') })
      .expect(200);
    const code = await latestCode(email, /password/i);
    await agent
      .post('/auth/forgot/reset')
      .set('x-smartapp', '1')
      .send({ email, code, newPassword: 'New-password-456' })
      .expect(200);
    expect((await agent.get('/auth/session')).body.session.email).toBe(email);

    await phone(app)
      .post('/auth/sign-in')
      .set('x-smartapp', '1')
      .send({ email, password: PASSWORD })
      .expect(401);
    await phone(app)
      .post('/auth/sign-in')
      .set('x-smartapp', '1')
      .send({ email, password: 'New-password-456' })
      .expect(200);
  });

  it('signing out ends the session', async () => {
    const agent = await signedIn(app, await withAccount('nena'));
    expect((await agent.get('/auth/session')).body.session).not.toBeNull();
    await agent.post('/auth/sign-out').set('x-smartapp', '1').expect(200);
    expect((await agent.get('/auth/session')).body).toEqual({ session: null });
  });

  it('an expired access cookie is renewed from the refresh cookie', async () => {
    const email = await withAccount('pepe');
    const res = await phone(app)
      .post('/auth/sign-in')
      .set('x-smartapp', '1')
      .send({ email, password: PASSWORD })
      .expect(200);
    const cookies = [res.headers['set-cookie']].flat().map(String);
    const refresh = cookies.find((c) => c.startsWith('sa_owner_rt='))?.split(';')[0];
    expect(refresh).toBeDefined();
    // Only the refresh cookie: as if the access cookie ran out.
    const again = await phone(app).get('/auth/session').set('cookie', String(refresh)).expect(200);
    expect(again.body.session.email).toBe(email);
    expect(String(again.headers['set-cookie'])).toMatch(/sa_owner_at=/);
  });
});

async function withAccount(name: string): Promise<string> {
  const email = uniqueEmail(name);
  await makeAccount(email);
  return email;
}
