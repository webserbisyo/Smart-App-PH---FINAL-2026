import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { sql } from 'drizzle-orm';
import {
  ConfirmUploadResultSchema,
  OwnerSettingsSchema,
  StorefrontDraftStateSchema,
  StoredFileListSchema,
  UploadResultSchema,
} from '@smartapp/core';
import { Db } from '../../src/db/db.service.js';
import { integrationApp, ownerWithShop } from './support.js';

// A tiny real WebP (1 x 1), so Storage keeps a real picture.
const WEBP = Buffer.from(
  'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
  'base64',
);

type Agent = Awaited<ReturnType<typeof ownerWithShop>>['agent'];

/** The three upload steps a phone takes: room, the file to the signed link, confirm. */
async function upload(
  agent: Agent,
  kind: string,
  body: Buffer = WEBP,
  type = 'image/webp',
): Promise<{ id: string; ref: string; bytes: number }> {
  const created = UploadResultSchema.parse(
    (await agent.post('/owner/uploads').send({ kind, bytes: body.length }).expect(201)).body,
  );
  const sent = await fetch(created.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': type },
    body,
  });
  expect(sent.ok).toBe(true);
  const done = ConfirmUploadResultSchema.parse(
    (await agent.post(`/owner/uploads/${created.id}/confirm`).send({}).expect(200)).body,
  );
  return { id: created.id, ...done };
}

describe('shop setup (phase 3)', () => {
  let app: NestExpressApplication;
  let db: Db;

  beforeAll(async () => {
    app = await integrationApp();
    db = app.get(Db);
  });

  afterAll(async () => {
    await app.close();
  });

  it('a new shop reads its settings: no hours, no way to pay yet, walk-in and pickup on', async () => {
    const { agent } = await ownerWithShop(app, 'fresh');
    const res = await agent.get('/owner/settings').expect(200);
    const settings = OwnerSettingsSchema.parse(res.body);
    expect(settings.hours.hours).toEqual([]);
    expect(settings.payments.payments).toEqual([]);
    expect(settings.ordering.orderTypes).toEqual(['walk_in', 'pickup']);
    expect(settings.booked).toEqual({ pickup: 0, delivery: 0 });
  });

  it('saves the shop facts, and a bad phone or a too-long address is a field error', async () => {
    const { agent } = await ownerWithShop(app, 'facts');
    const contact = {
      phone: '0917 123 4567',
      messengerUsername: 'factsshop',
      facebookUrl: 'https://facebook.com/factsshop',
      googleReviewUrl: null,
      address: '12 Rizal St, Calamba',
      showAddress: true,
      pin: { lat: 14.21, lng: 121.16 },
      pickupNote: 'Gate beside the bakery',
    };
    const saved = OwnerSettingsSchema.parse(
      (await agent.put('/owner/settings/shop').send({ name: 'Facts Cafe', contact }).expect(200)).body,
    );
    expect(saved.shop).toEqual({ name: 'Facts Cafe', contact });

    const badPhone = await agent
      .put('/owner/settings/shop')
      .send({ name: 'Facts Cafe', contact: { ...contact, phone: '123' } })
      .expect(400);
    expect(badPhone.body.fieldErrors).toEqual({ phone: ['invalid'] });
    const longAddress = await agent
      .put('/owner/settings/shop')
      .send({ name: 'Facts Cafe', contact: { ...contact, address: 'x'.repeat(201) } })
      .expect(400);
    expect(longAddress.body.code).toBe('invalid_input');
    expect(Object.keys(longAddress.body.fieldErrors)).toContain('contact.address');
  });

  it('hours: overlaps are hours_overlap; good hours and days off are saved', async () => {
    const { agent } = await ownerWithShop(app, 'hours');
    const overlap = await agent
      .put('/owner/hours')
      .send({
        hours: [
          { day: 1, open: '08:00', close: '12:00' },
          { day: 1, open: '11:00', close: '15:00' },
        ],
        closures: [],
      })
      .expect(400);
    expect(overlap.body.code).toBe('hours_overlap');

    const nextYear = `${new Date().getFullYear() + 1}-01-01`;
    const saved = OwnerSettingsSchema.parse(
      (
        await agent
          .put('/owner/hours')
          .send({
            hours: [
              { day: 1, open: '08:00', close: '12:00' },
              { day: 1, open: '13:00', close: '24:00' },
            ],
            closures: [{ date: nextYear, reason: 'New Year' }],
          })
          .expect(200)
      ).body,
    );
    expect(saved.hours.hours).toEqual([
      { day: 1, open: '08:00', close: '12:00' },
      { day: 1, open: '13:00', close: '24:00' },
    ]);
    expect(saved.hours.closures).toEqual([{ date: nextYear, reason: 'New Year' }]);
  });

  it('ordering needs one order type; delivery rows go to metres and back', async () => {
    const { agent, shopId, userId } = await ownerWithShop(app, 'delivery');
    const rules = {
      daysAhead: 5,
      slotMinutes: 15,
      ordersPerSlot: 4,
      prepMinutes: 25,
      takeOrdersWhileClosed: false,
    };
    const none = await agent.put('/owner/settings/ordering').send({ orderTypes: [], rules }).expect(400);
    expect(none.body.code).toBe('last_order_type');
    const ordering = OwnerSettingsSchema.parse(
      (
        await agent
          .put('/owner/settings/ordering')
          .send({ orderTypes: ['delivery', 'pickup'], rules })
          .expect(200)
      ).body,
    );
    expect(ordering.ordering).toEqual({ orderTypes: ['pickup', 'delivery'], rules });

    const delivery = {
      distance: [
        { fromKm: 0, toKm: 2.5, fee: 4900, etaText: '20 to 30 min', minOrder: 0 },
        { fromKm: 2.5, toKm: 5, fee: 7900, etaText: '30 to 45 min', minOrder: 30000 },
      ],
      zones: [{ id: 'new-zone', name: 'Barangay Uno', fee: 5000, etaText: '30 min' }],
      freeDeliveryFrom: 100000,
    };
    const saved = OwnerSettingsSchema.parse(
      (await agent.put('/owner/settings/delivery').send(delivery).expect(200)).body,
    );
    expect(saved.delivery.distance).toEqual(delivery.distance);
    expect(saved.delivery.zones).toHaveLength(1);
    expect(saved.delivery.zones[0]?.name).toBe('Barangay Uno');
    const metres = await db.run({ userId, shopId, role: 'api' }, () =>
      db.tx.execute<{ from_m: number; to_m: number }>(
        sql`select from_m, to_m from public.delivery_distance_rows order by from_m`,
      ),
    );
    expect(metres.rows).toEqual([
      { from_m: 0, to_m: 2500 },
      { from_m: 2500, to_m: 5000 },
    ]);
    // The zone keeps its id on the next save.
    const zoneId = saved.delivery.zones[0]?.id;
    const again = OwnerSettingsSchema.parse(
      (
        await agent
          .put('/owner/settings/delivery')
          .send({ ...delivery, zones: saved.delivery.zones })
          .expect(200)
      ).body,
    );
    expect(again.delivery.zones[0]?.id).toBe(zoneId);

    const gap = await agent
      .put('/owner/settings/delivery')
      .send({ ...delivery, distance: [delivery.distance[0], { ...delivery.distance[1], fromKm: 3 }] })
      .expect(400);
    expect(Object.keys(gap.body.fieldErrors)).toContain('distance.1');
  });

  it('payments: the QR upload is confirmed with its real size, saved and locked while in use', async () => {
    const { agent } = await ownerWithShop(app, 'payments');
    const qr = await upload(agent, 'qr');
    expect(qr.bytes).toBe(WEBP.length);
    expect(qr.ref).toMatch(/\/storage\/v1\/object\/public\/qr\//);

    const empty = await agent
      .put('/owner/settings/payments')
      .send({ payments: [], codMaxTotal: null })
      .expect(400);
    expect(empty.body.code).toBe('last_payment_method');

    const payments = [
      { id: 'cash-1', method: 'cash', bank: null, accountName: null, accountNumber: null, qr: null, sample: false },
      {
        id: 'gcash-1',
        method: 'gcash',
        bank: null,
        accountName: 'Ana Cruz',
        accountNumber: '09171234567',
        qr: qr.ref,
        sample: false,
      },
    ];
    const saved = OwnerSettingsSchema.parse(
      (await agent.put('/owner/settings/payments').send({ payments, codMaxTotal: 50000 }).expect(200))
        .body,
    );
    expect(saved.payments.payments.map((p) => p.method)).toEqual(['cash', 'gcash']);
    const gcash = saved.payments.payments[1];
    expect(gcash?.qr).toBe(qr.ref);
    expect(gcash?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.payments.codMaxTotal).toBe(50000);

    // Editing keeps the account's id.
    const edited = OwnerSettingsSchema.parse(
      (
        await agent
          .put('/owner/settings/payments')
          .send({
            payments: saved.payments.payments.map((p) =>
              p.method === 'gcash' ? { ...p, accountName: 'Ana B. Cruz' } : p,
            ),
            codMaxTotal: 50000,
          })
          .expect(200)
      ).body,
    );
    expect(edited.payments.payments[1]).toMatchObject({ id: gcash?.id, accountName: 'Ana B. Cruz' });

    // The QR is in use, so Storage won't delete it.
    const files = StoredFileListSchema.parse(
      (await agent.get('/owner/storage/files?folder=qr').expect(200)).body,
    );
    expect(files.files).toHaveLength(1);
    expect(files.files[0]).toMatchObject({ lock: 'in_use', usedBy: { kind: 'qr', label: 'GCash' } });
    const locked = await agent
      .post('/owner/storage/files/delete')
      .send({ ids: [files.files[0]?.id] })
      .expect(409);
    expect(locked.body.code).toBe('file_locked');

    const storage = (await agent.get('/owner/storage').expect(200)).body;
    expect(storage.usedBytes).toBe(WEBP.length);
    expect(storage.kinds.find((k: { kind: string }) => k.kind === 'qr')).toEqual({
      kind: 'qr',
      bytes: WEBP.length,
      files: 1,
    });
  });

  it("another shop's file can't be used, and an unused upload can be deleted", async () => {
    const a = await ownerWithShop(app, 'owner-a');
    const b = await ownerWithShop(app, 'owner-b');
    const qr = await upload(a.agent, 'qr');
    const stolen = await b.agent
      .put('/owner/settings/payments')
      .send({
        payments: [
          {
            id: 'maya-1',
            method: 'maya',
            bank: null,
            accountName: 'B',
            accountNumber: '0918',
            qr: qr.ref,
            sample: false,
          },
        ],
        codMaxTotal: null,
      })
      .expect(400);
    expect(stolen.body.fieldErrors).toEqual({ 'maya-1.qr': ['invalid'] });
    // Confirming another shop's upload is not found.
    await b.agent.post(`/owner/uploads/${qr.id}/confirm`).send({}).expect(404);

    const unused = StoredFileListSchema.parse(
      (await a.agent.get('/owner/storage/files?folder=unused').expect(200)).body,
    );
    expect(unused.files.map((f) => f.id)).toEqual([qr.id]);
    const after = (
      await a.agent.post('/owner/storage/files/delete').send({ ids: [qr.id] }).expect(200)
    ).body;
    expect(after.usedBytes).toBe(0);
    const gone = await fetch(qr.ref);
    expect(gone.ok).toBe(false);
  });

  it('a file that is not a picture is refused and removed', async () => {
    const { agent } = await ownerWithShop(app, 'notimage');
    const created = UploadResultSchema.parse(
      (await agent.post('/owner/uploads').send({ kind: 'logo', bytes: 10 }).expect(201)).body,
    );
    // The bucket only takes pictures, so a text file never even lands.
    const sent = await fetch(created.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: 'hello',
    });
    expect(sent.ok).toBe(false);
    await agent.post(`/owner/uploads/${created.id}/confirm`).send({}).expect(404);
  });

  it('storage full: an upload past the limit is refused, a plan receipt still goes', async () => {
    const { agent, shopId } = await ownerWithShop(app, 'full');
    await db.run({ userId: null, shopId: null, role: 'admin' }, () =>
      db.tx.execute(sql`update public.tenants set storage_limit_bytes = 100 where id = ${shopId}`),
    );
    const full = await agent.post('/owner/uploads').send({ kind: 'banner', bytes: 500 }).expect(409);
    expect(full.body.code).toBe('storage_full');
    await agent.post('/owner/uploads').send({ kind: 'plan_proof', bytes: 500 }).expect(201);
  });

  it('profile photo and notification emails', async () => {
    const { agent, email } = await ownerWithShop(app, 'profile');
    const profile = (await agent.get('/owner/profile').expect(200)).body;
    expect(profile.email).toBe(email);
    expect(profile.avatar.kind).toBe('face');

    const photo = await upload(agent, 'avatar');
    const saved = (
      await agent
        .put('/owner/profile')
        .send({ name: 'Ana Cruz', avatar: { kind: 'photo', ref: photo.ref, bytes: 999 } })
        .expect(200)
    ).body;
    expect(saved).toMatchObject({ name: 'Ana Cruz', avatar: { kind: 'photo', ref: photo.ref, bytes: WEBP.length } });
    const files = StoredFileListSchema.parse(
      (await agent.get('/owner/storage/files?folder=profile').expect(200)).body,
    );
    expect(files.files[0]?.lock).toBe('in_use');

    const prefs = (await agent.get('/owner/notifications').expect(200)).body;
    expect(prefs).toEqual({ newOrder: true, paymentToCheck: true, storage: true, planPayment: true, email });
    const changed = (
      await agent
        .put('/owner/notifications')
        .send({ ...prefs, storage: false, email: 'Orders@Example.com' })
        .expect(200)
    ).body;
    expect(changed).toMatchObject({ storage: false, email: 'orders@example.com' });
  });

  it('editor: autosave with versions, a conflict from another phone, publish and discard', async () => {
    const { agent } = await ownerWithShop(app, 'editor', 'retail');
    const start = StorefrontDraftStateSchema.parse(
      (await agent.get('/owner/storefront/draft').expect(200)).body,
    );
    expect(start.baseVersion).toBe(0);
    expect(start.draft.look.brandColor).toBe('#ff6600');

    const logo = await upload(agent, 'logo');
    const content = { ...start.draft, logo: logo.ref, tagline: 'Fresh every day' };
    const saved = StorefrontDraftStateSchema.parse(
      (await agent.put('/owner/storefront/draft').send({ content, baseVersion: 0 }).expect(200)).body,
    );
    expect(saved.baseVersion).toBe(1);
    expect(saved.draft.logo).toBe(logo.ref);
    expect(saved.published.logo).toBeNull();

    // A second phone still on version 0.
    const conflict = await agent
      .put('/owner/storefront/draft')
      .send({ content: start.draft, baseVersion: 0 })
      .expect(409);
    expect(conflict.body.code).toBe('draft_conflict');

    // A picture that isn't the shop's own upload.
    const foreign = await agent
      .put('/owner/storefront/draft')
      .send({ content: { ...content, logo: 'https://example.com/logo.png' }, baseVersion: 1 })
      .expect(400);
    expect(foreign.body.fieldErrors).toEqual({ logo: ['invalid'] });

    expect((await agent.post('/owner/storefront/draft').send({ baseVersion: 1 }).expect(200)).body).toEqual({
      contentVersion: 1,
    });
    const live = StorefrontDraftStateSchema.parse(
      (await agent.get('/owner/storefront/draft').expect(200)).body,
    );
    expect(live.published.logo).toBe(logo.ref);
    // The onboarding look step is done once a logo is live.
    const onboarding = (await agent.get('/owner/onboarding').expect(200)).body;
    expect(onboarding.steps.find((s: { step: string }) => s.step === 'look').done).toBe(true);

    // The logo is in use now.
    const look = StoredFileListSchema.parse(
      (await agent.get('/owner/storage/files?folder=look').expect(200)).body,
    );
    expect(look.files[0]).toMatchObject({ lock: 'in_use', usedBy: { kind: 'logo' } });

    await agent
      .put('/owner/storefront/draft')
      .send({ content: { ...content, tagline: 'Changed my mind' }, baseVersion: 1 })
      .expect(200);
    expect((await agent.delete('/owner/storefront/draft').expect(200)).body).toEqual({ contentVersion: 1 });
    const back = StorefrontDraftStateSchema.parse(
      (await agent.get('/owner/storefront/draft').expect(200)).body,
    );
    expect(back.draft.tagline).toBe('Fresh every day');

    const token = (await agent.post('/owner/storefront/preview-token').send({}).expect(200)).body;
    expect(token.token.split('.')).toHaveLength(3);
  });
});
