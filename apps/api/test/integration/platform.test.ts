import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AdminShopDetailSchema, PlanSchema, SupportSessionSchema } from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { Db } from '../../src/db/db.service.js';
import { RecordingEmailSender, EmailSender } from '../../src/email/email-sender.js';
import { MetaGraph, RecordingMetaGraph } from '../../src/platform/meta-graph.js';
import { MetaSender } from '../../src/platform/meta-sender.js';
import { PlanJobs } from '../../src/platform/plan-jobs.js';
import {
  admin,
  liveShop,
  makeAccount,
  ownerWithShop,
  signedIn,
  uniqueEmail,
  upload,
} from './support.js';

const EventRowSchema = z.object({
  name: z.string(),
  status: z.string(),
  problem: z.string().nullable(),
  action_source: z.string(),
  caused_by: z.string(),
  client_ip: z.string().nullable(),
  client_ua: z.string().nullable(),
  event_time: z.union([z.string(), z.date()]),
  send_after: z.union([z.string(), z.date()]),
  value: z.number().nullable(),
});

describe('phase 7: plan, Super Admin, help mode and Meta (T118)', () => {
  let app: NestExpressApplication;
  let db: Db;
  const graph = new RecordingMetaGraph(true);
  const mail = new RecordingEmailSender();
  let adminAgent: Awaited<ReturnType<typeof signedIn>>;

  const asAdmin = <T>(fn: () => Promise<T>) =>
    db.run({ userId: null, shopId: null, role: 'admin' }, fn);

  const eventsOf = (shopId: string) =>
    asAdmin(async () => {
      const result = await db.tx.execute(sql`
        select name, status, problem, action_source, caused_by, host(client_ip) as client_ip, client_ua,
          event_time, send_after, value
        from public.track_events where tenant_id = ${shopId}::uuid order by created_at, name`);
      return EventRowSchema.array().parse(result.rows);
    });

  const sendPayment = async (
    agent: Awaited<ReturnType<typeof ownerWithShop>>['agent'],
    status = 201,
    reference: string | null = `REF${randomUUID().slice(0, 8)}`,
  ) => {
    const proof = await upload(agent, 'plan_proof');
    return agent
      .post('/owner/plan/payments')
      .set('user-agent', 'Mozilla/5.0 (Owner phone)')
      .send({ months: 1, method: 'gcash', reference, proofPath: proof.ref })
      .expect(status);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MetaGraph)
      .useValue(graph)
      .overrideProvider(EmailSender)
      .useValue(mail)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    db = app.get(Db);
    const email = uniqueEmail('founder');
    const id = await makeAccount(email, 'Founder');
    await admin.auth.admin.updateUserById(id, { app_metadata: { platform_admin: true } });
    adminAgent = await signedIn(app, email);
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers Not found to an owner who opens Super Admin (rule 12)', async () => {
    const owner = await ownerWithShop(app, 'Nosy');
    await owner.agent.get('/admin/today').expect(404);
    await owner.agent.post(`/admin/shops/${owner.shopId}/approve`).send({}).expect(404);
  });

  it("writes a payment's Purchase waiting, with the owner's own time, IP address and browser", async () => {
    const owner = await ownerWithShop(app, 'Payer');
    const res = await sendPayment(owner.agent);
    const plan = PlanSchema.parse(res.body);
    expect(plan.pending?.status).toBe('pending');
    expect(plan.thread.some((l) => l.kind === 'payment')).toBe(true);

    const events = await eventsOf(owner.shopId);
    const byName = new Map(events.map((e) => [e.name, e]));
    expect(byName.get('AddPaymentInfo')?.status).toBe('queued');
    expect(byName.get('Purchase')?.status).toBe('waiting');
    expect(byName.get('Subscribe')?.status).toBe('waiting');
    const purchase = byName.get('Purchase');
    expect(purchase?.action_source).toBe('website');
    expect(purchase?.caused_by).toBe('owner');
    expect(purchase?.client_ip).toMatch(/^10\./);
    expect(purchase?.client_ua).toBe('Mozilla/5.0 (Owner phone)');
    expect(new Date(plan.pending?.submittedAt ?? 0).getTime()).toBe(
      new Date(purchase?.event_time ?? 1).getTime(),
    );

    // One payment waits at a time; a reference another shop used is refused.
    expect((await sendPayment(owner.agent, 409)).body).toMatchObject({
      code: 'payment_not_pending',
    });
  });

  it('refuses a reference number another shop already sent', async () => {
    const a = await ownerWithShop(app, 'RefA');
    const b = await ownerWithShop(app, 'RefB');
    const ref = `DUP${randomUUID().slice(0, 8)}`;
    await sendPayment(a.agent, 201, ref);
    const res = await sendPayment(b.agent, 409, ref.toLowerCase());
    expect(res.body).toMatchObject({ code: 'duplicate_reference' });
  });

  it('approves go-live with StartTrial (system, no IP), then approve, Undo and approve a payment', async () => {
    const owner = await ownerWithShop(app, 'Approve');
    const live = AdminShopDetailSchema.parse(
      (await adminAgent.post(`/admin/shops/${owner.shopId}/approve`).send({}).expect(200)).body,
    );
    expect(live.stage).toBe('live');
    expect(live.planStatus).toBe('trial');
    const trial = (await eventsOf(owner.shopId)).find((e) => e.name === 'StartTrial');
    expect(trial).toMatchObject({
      status: 'queued',
      action_source: 'system_generated',
      caused_by: 'admin',
      client_ip: null,
      client_ua: null,
    });

    const sent = PlanSchema.parse((await sendPayment(owner.agent)).body);
    const paymentId = sent.pending?.id ?? '';
    const approved = AdminShopDetailSchema.parse(
      (
        await adminAgent
          .post(`/admin/shops/${owner.shopId}/payments/${paymentId}/review`)
          .send({ verdict: 'approve', amount: null, amountReason: null })
          .expect(200)
      ).body,
    );
    expect(approved.planStatus).toBe('active');
    expect(approved.undo?.paymentId).toBe(paymentId);
    const queued = (await eventsOf(owner.shopId)).find((e) => e.name === 'Purchase');
    expect(queued?.status).toBe('queued');
    // Held for Undo's 10 minutes.
    expect(new Date(queued?.send_after ?? 0).getTime()).toBeGreaterThan(Date.now() + 9 * 60_000);

    const undone = AdminShopDetailSchema.parse(
      (
        await adminAgent
          .post(`/admin/shops/${owner.shopId}/payments/${paymentId}/undo`)
          .send({})
          .expect(200)
      ).body,
    );
    expect(undone.pending?.id).toBe(paymentId);
    expect(undone.planStatus).toBe('trial');
    expect(undone.activity[0]?.kind).toBe('payment_undone');
    expect((await eventsOf(owner.shopId)).find((e) => e.name === 'Purchase')?.status).toBe(
      'waiting',
    );
    // A second Undo has nothing to take back.
    await adminAgent
      .post(`/admin/shops/${owner.shopId}/payments/${paymentId}/undo`)
      .send({})
      .expect(409);
  });

  it('skips a payment that is not approved, and every event of a test shop', async () => {
    const owner = await ownerWithShop(app, 'Reject');
    const sent = PlanSchema.parse((await sendPayment(owner.agent)).body);
    await adminAgent
      .post(`/admin/shops/${owner.shopId}/payments/${sent.pending?.id ?? ''}/review`)
      .send({ verdict: 'reject', reason: 'unreadable' })
      .expect(200);
    const purchase = (await eventsOf(owner.shopId)).find((e) => e.name === 'Purchase');
    expect(purchase).toMatchObject({ status: 'skipped', problem: 'not_approved', client_ip: null });

    const test = await ownerWithShop(app, 'TestShop');
    await adminAgent.put(`/admin/shops/${test.shopId}/test`).send({ isTest: true }).expect(200);
    await sendPayment(test.agent);
    for (const e of await eventsOf(test.shopId)) {
      if (e.name === 'CompleteRegistration') continue;
      expect(e).toMatchObject({ status: 'skipped', problem: 'test_shop', client_ip: null });
    }
  });

  it('runs help mode as the owner, locks money, and logs every write', async () => {
    const owner = await ownerWithShop(app, 'Helped');
    const session = SupportSessionSchema.parse(
      (
        await adminAgent
          .post('/admin/support')
          .send({ shopId: owner.shopId, reason: 'fix_problem' })
          .expect(201)
      ).body,
    );
    const plan = await adminAgent.get('/owner/plan').expect(200);
    expect(PlanSchema.parse(plan.body).status).toBeDefined();
    const shop = await adminAgent.get('/owner/shop').expect(200);
    expect(shop.body).toMatchObject({ shop: { id: owner.shopId } });

    const proof = await upload(adminAgent, 'plan_proof');
    const locked = await adminAgent
      .post('/owner/plan/payments')
      .send({ months: 1, method: 'gcash', reference: null, proofPath: proof.ref })
      .expect(403);
    expect(locked.body).toMatchObject({ code: 'support_locked' });

    await adminAgent.post('/owner/plan/notes').send({ text: 'Fixed your menu.' }).expect(201);
    const logged = await asAdmin(async () => {
      const result = await db.tx.execute(sql`
        select action, target from public.audit_log
        where support_session_id = ${session.id}::uuid order by at`);
      return z
        .array(z.object({ action: z.string(), target: z.string().nullable() }))
        .parse(result.rows);
    });
    expect(logged.map((l) => l.action)).toContain('support.start');
    expect(logged.some((l) => l.action === 'help.post' && l.target === '/owner/plan/notes')).toBe(
      true,
    );

    await adminAgent.post('/admin/support/end').send({}).expect(200);
    // The founder has no shop of their own: help ended, the owner's pages are Not found again.
    await adminAgent.get('/owner/plan').expect(404);
  });

  it('sends due events one by one, skips ones past 7 days, and drops the IP address once sent', async () => {
    const owner = await liveShop(app, 'Sender');
    await asAdmin(() =>
      db.tx.execute(sql`update public.platform_settings set tracking_sending = true`),
    );
    try {
      const paid = PlanSchema.parse((await sendPayment(owner.agent)).body);
      // AddPaymentInfo is due now; an old event from 8 days ago must never be sent.
      await asAdmin(() =>
        db.tx.execute(sql`
          insert into public.track_events (event_id, name, via, status, tenant_id, event_time, caused_by)
          values (${`contact:old-${randomUUID()}`}, 'Contact', 'server', 'queued', ${owner.shopId}::uuid,
            now() - interval '8 days', 'owner')`),
      );
      const before = graph.sent.length;
      const sender = app.get(MetaSender);
      while ((await sender.sendDue()) > 0) {
        // Other tests' events go too; keep going until the queue is empty.
      }
      const sentNow = graph.sent.slice(before).map((s) => s.event);
      const pay = sentNow.find((e) => e.event_id === `pay:${paid.pending?.id ?? ''}`);
      expect(pay?.action_source).toBe('website');
      expect(pay?.user_data['client_user_agent']).toBe('Mozilla/5.0 (Owner phone)');
      expect(pay?.user_data['em']).toHaveLength(1);
      expect(sentNow.some((e) => e.event_name === 'Contact')).toBe(false);
      const rows = await eventsOf(owner.shopId);
      expect(rows.find((e) => e.name === 'AddPaymentInfo')).toMatchObject({
        status: 'sent',
        client_ip: null,
        client_ua: null,
      });
      expect(rows.find((e) => e.name === 'Contact')).toMatchObject({
        status: 'skipped',
        problem: 'too_old',
      });
      // The Purchase still waits for the founder.
      expect(rows.find((e) => e.name === 'Purchase')?.status).toBe('waiting');
    } finally {
      await asAdmin(() =>
        db.tx.execute(sql`update public.platform_settings set tracking_sending = false`),
      );
    }
  });

  it('sends each plan reminder once, and a paused shop takes no orders', async () => {
    const owner = await liveShop(app, 'Remind');
    // Paid until 7 days from today (Manila): the "due in 7 days" reminder.
    await asAdmin(() =>
      db.tx.execute(sql`
        update public.tenants set paid_until = (now() at time zone 'Asia/Manila')::date + 7,
          trial_ends_at = null where id = ${owner.shopId}::uuid`),
    );
    const jobs = app.get(PlanJobs);
    await jobs.reminders();
    await jobs.reminders();
    const lines = await asAdmin(async () => {
      const result = await db.tx.execute(sql`
        select count(*) as n from public.billing_messages
        where tenant_id = ${owner.shopId}::uuid and kind = 'reminder'`);
      return z.array(z.object({ n: z.coerce.number() })).parse(result.rows)[0]?.n;
    });
    expect(lines).toBe(1);

    await asAdmin(() =>
      db.tx.execute(sql`
        update public.tenants set paid_until = (now() at time zone 'Asia/Manila')::date - 20
        where id = ${owner.shopId}::uuid`),
    );
    const page = await adminAgent.get(`/s/${owner.slug}`).expect(200);
    expect(page.body).toMatchObject({ storefront: { pause: { paused: true } } });
  });
});
