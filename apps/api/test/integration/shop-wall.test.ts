import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { sql } from 'drizzle-orm';
import { Db } from '../../src/db/db.service.js';
import { tenants } from '../../src/db/generated/schema.js';
import { JobsService } from '../../src/jobs/jobs.service.js';
import { integrationApp, makeAccount, ownerWithShop, signedIn, uniqueEmail } from './support.js';

describe('the shop wall (phase 1)', () => {
  let app: NestExpressApplication;
  let db: Db;

  beforeAll(async () => {
    app = await integrationApp();
    db = app.get(Db);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health/ready reaches the database through the API role', async () => {
    const res = await (
      await import('supertest')
    )
      .default(app.getHttpServer())
      .get('/health/ready')
      .expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info.database.status).toBe('up');
  });

  it("an owner's transaction sees only their own shop", async () => {
    const a = await ownerWithShop(app, 'kanto');
    const b = await ownerWithShop(app, 'tala', 'retail');
    const seen = await db.run({ userId: a.userId, shopId: a.shopId, role: 'api' }, () =>
      db.tx.select({ id: tenants.id }).from(tenants),
    );
    expect(seen.map((r) => r.id)).toEqual([a.shopId]);

    // Even naming the other shop's id finds nothing.
    const other = await db.run({ userId: a.userId, shopId: a.shopId, role: 'api' }, () =>
      db.tx.execute(sql`select 1 from public.tenants where id = ${b.shopId}::uuid`),
    );
    expect(other.rows).toHaveLength(0);
  });

  it("an owner's routes answer for their own shop only", async () => {
    const a = await ownerWithShop(app, 'kape');
    const b = await ownerWithShop(app, 'lola');
    expect((await a.agent.get('/owner/shop')).body.shop.id).toBe(a.shopId);
    expect((await b.agent.get('/owner/shop')).body.shop.id).toBe(b.shopId);
  });

  it('a signed-in person with no shop gets Not found, never another shop (no role, no data)', async () => {
    const email = uniqueEmail('noshop');
    await makeAccount(email);
    const agent = await signedIn(app, email);
    const res = await agent.get('/owner/onboarding').expect(404);
    expect(res.body.code).toBe('not_found');
  });

  it('with no shop in the transaction the API role sees no shop rows', async () => {
    await ownerWithShop(app, 'aqua');
    const rows = await db.run({ userId: null, shopId: null, role: 'api' }, () =>
      db.tx.select({ id: tenants.id }).from(tenants),
    );
    expect(rows).toEqual([]);
  });

  it('there is no database outside a transaction', () => {
    expect(() => db.tx).toThrow(/No database transaction/);
  });

  it('a job runs once even when two copies start it together', async () => {
    const jobs = app.get(JobsService);
    let runs = 0;
    const slow = async () => {
      runs += 1;
      await new Promise((resolve) => setTimeout(resolve, 300));
    };
    const outcomes = await Promise.all([
      jobs.runLocked('test-lock', slow),
      jobs.runLocked('test-lock', slow),
    ]);
    expect(outcomes.sort()).toEqual(['done', 'skipped']);
    expect(runs).toBe(1);
  });
});
