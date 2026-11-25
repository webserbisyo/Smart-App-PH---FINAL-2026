import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  CleanupPreviewSchema,
  DataExportSchema,
  FilesDownloadSchema,
  StorageSummarySchema,
  StoredFileListSchema,
  type DataExport,
} from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { strFromU8, unzipSync } from 'fflate';
import { z } from 'zod';
import { Db } from '../../src/db/db.service.js';
import { EmailSender, RecordingEmailSender } from '../../src/email/email-sender.js';
import { ExportsService } from '../../src/media/exports.service.js';
import { MediaStorage } from '../../src/media/media-storage.js';
import { integrationApp, liveShop, nextPhone, phone, WEBP } from './support.js';

type Shop = Awaited<ReturnType<typeof liveShop>>;

const PlacedSchema = z.object({ orderId: z.string(), orderNo: z.number(), token: z.string() });
const ADMIN = { userId: null, shopId: null, role: 'admin' } as const;
const FOUNDER = 'founder.exports@example.com';

describe('exports, file downloads and the delete request (phase 6)', () => {
  let app: NestExpressApplication;
  let db: Db;
  let exports: ExportsService;
  let storage: MediaStorage;
  let emails: RecordingEmailSender;
  const before = process.env['ADMIN_EMAIL'];

  beforeAll(async () => {
    process.env['ADMIN_EMAIL'] = FOUNDER;
    app = await integrationApp();
    db = app.get(Db);
    exports = app.get(ExportsService);
    storage = app.get(MediaStorage);
    const sender = app.get(EmailSender);
    if (!(sender instanceof RecordingEmailSender)) throw new Error('Tests run without Resend.');
    emails = sender;
  });

  afterAll(async () => {
    if (before === undefined) delete process.env['ADMIN_EMAIL'];
    else process.env['ADMIN_EMAIL'] = before;
    await app.close();
  });

  async function place(shop: Shop, paymentMethod: 'cash' | 'gcash', name: string) {
    return PlacedSchema.parse(
      (
        await phone(app)
          .post(`/s/${shop.slug}/orders`)
          .send({
            type: 'pickup',
            scheduledAt: null,
            lines: [
              { itemId: shop.itemId, variantId: shop.variantId, optionIds: [], qty: 2, note: '' },
            ],
            customer: { name, phone: nextPhone(), email: null },
            delivery: null,
            paymentMethod,
            paymentAccountId: null,
            note: null,
            useReward: false,
            clientKey: randomUUID(),
          })
          .expect(200)
      ).body,
    );
  }

  async function sendPhoto(shop: Shop, token: string, referenceNo: string) {
    const room = z
      .object({ uploadUrl: z.string(), path: z.string() })
      .parse(
        (await phone(app).post(`/s/${shop.slug}/o/${token}/proof-upload`).send({}).expect(200))
          .body,
      );
    const sent = await fetch(room.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/webp' },
      body: WEBP,
    });
    expect(sent.ok).toBe(true);
    await phone(app)
      .post(`/s/${shop.slug}/o/${token}/proof`)
      .send({ method: 'gcash', referenceNo, path: room.path })
      .expect(200);
  }

  async function ready(shop: Shop, id: string): Promise<DataExport> {
    for (let i = 0; i < 40; i++) {
      const e = DataExportSchema.parse(
        (await shop.agent.get(`/owner/exports/${id}`).expect(200)).body,
      );
      if (e.status !== 'preparing') return e;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error('The export never finished.');
  }

  async function unzip(url: string) {
    const res = await fetch(url);
    expect(res.ok).toBe(true);
    return unzipSync(new Uint8Array(await res.arrayBuffer()));
  }

  it('makes a ZIP of orders, payments and photos that opens, then expires it', async () => {
    const shop = await liveShop(app, 'export', { gcash: true });
    const empty = StorageSummarySchema.parse(
      (await shop.agent.get('/owner/storage').expect(200)).body,
    );
    expect(empty.lastExport).toBeNull();

    await place(shop, 'cash', 'Ana Cruz');
    const paid = await place(shop, 'gcash', '=HYPERLINK("x")');
    await sendPhoto(shop, paid.token, '5551112222');

    const asked = DataExportSchema.parse(
      (
        await shop.agent
          .post('/owner/exports')
          .send({ range: 'this_month', parts: { orders: true, payments: true, proofs: true } })
          .expect(200)
      ).body,
    );
    expect(asked.status).toBe('preparing');
    expect(asked.fileName).toMatch(new RegExp(`^${shop.slug}-\\d{4}-\\d{2}-[0-9a-f]{4}\\.zip$`));
    await shop.agent
      .post('/owner/exports')
      .send({ range: 'this_month', parts: { orders: false, payments: false, proofs: false } })
      .expect(400);

    const done = await ready(shop, asked.id);
    expect(done).toMatchObject({ status: 'ready', orderRows: 2, proofFiles: 1 });
    expect(done.url).toBeTruthy();
    const files = await unzip(done.url ?? '');
    expect(Object.keys(files).sort()).toEqual([
      'orders.csv',
      'payments.csv',
      `proofs/order-${paid.orderNo}.webp`,
    ]);
    const raw = files['orders.csv'] ?? new Uint8Array();
    // A BOM first, so Excel reads the peso sign and ñ right.
    expect([...raw.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const orders = strFromU8(raw);
    expect(orders).toContain('"Order","Placed (Manila)"');
    expect(orders).toContain('"Ana Cruz"');
    expect(orders).toContain('"2 × Smash burger"');
    // A cell that starts with = never runs as a formula in Excel.
    expect(orders).toContain(`"'=HYPERLINK(""x"")"`);
    const payments = strFromU8(files['payments.csv'] ?? new Uint8Array());
    expect(payments).toContain('"5551112222"');
    expect(payments).toContain(`"proofs/order-${paid.orderNo}.webp"`);
    expect(Buffer.from(files[`proofs/order-${paid.orderNo}.webp`] ?? [])).toEqual(WEBP);

    const summary = StorageSummarySchema.parse(
      (await shop.agent.get('/owner/storage').expect(200)).body,
    );
    expect(summary.lastExport?.id).toBe(asked.id);
    // The photo is in the saved copy, so Storage offers to delete it early.
    const preview = CleanupPreviewSchema.parse(
      (await shop.agent.get('/owner/storage/cleanup?kind=exported_proofs').expect(200)).body,
    );
    expect(preview).toMatchObject({ files: 1, savedCopy: true });

    // Last month has no orders: the spreadsheet holds its header only.
    const last = DataExportSchema.parse(
      (
        await shop.agent
          .post('/owner/exports')
          .send({ range: 'last_month', parts: { orders: true, payments: false, proofs: false } })
          .expect(200)
      ).body,
    );
    const lastDone = await ready(shop, last.id);
    expect(lastDone.orderRows).toBe(0);
    expect(Object.keys(await unzip(lastDone.url ?? ''))).toEqual(['orders.csv']);

    // Another shop never sees it.
    const other = await liveShop(app, 'export-other');
    await other.agent.get(`/owner/exports/${asked.id}`).expect(404);
    await other.agent.get('/owner/exports/not-a-uuid').expect(404);

    // After 24 hours the link is gone, and the hourly job removes the file.
    await db.run(ADMIN, async () => {
      await db.tx.execute(sql`
        update public.data_exports
        set ready_at = now() - interval '25 hours', expires_at = now() - interval '1 hour'
        where id = ${asked.id}::uuid`);
    });
    const old = DataExportSchema.parse(
      (await shop.agent.get(`/owner/exports/${asked.id}`).expect(200)).body,
    );
    expect(old).toMatchObject({ status: 'expired', url: null });
    await exports.expire();
    expect(await storage.download('exports', `${shop.shopId}/${asked.id}.zip`)).toBeNull();
    const status = await db.run(
      ADMIN,
      async () =>
        (
          await db.tx.execute<{ status: string }>(
            sql`select status from public.data_exports where id = ${asked.id}::uuid`,
          )
        ).rows[0]?.status,
    );
    expect(status).toBe('expired');
  });

  it('zips the ticked files, and another shop cannot take them', async () => {
    const shop = await liveShop(app, 'files-zip', { gcash: true });
    const paid = await place(shop, 'gcash', 'Bea');
    await sendPhoto(shop, paid.token, '5553334444');
    const list = StoredFileListSchema.parse(
      (await shop.agent.get('/owner/storage/files?folder=proofs').expect(200)).body,
    );
    const ids = list.files.map((f) => f.id);
    expect(ids).toHaveLength(1);
    const zip = FilesDownloadSchema.parse(
      (await shop.agent.post('/owner/storage/files/download').send({ ids }).expect(200)).body,
    );
    expect(zip.files).toBe(1);
    expect(zip.fileName).toMatch(new RegExp(`^${shop.slug}-files-\\d{4}-\\d{2}-\\d{2}\\.zip$`));
    const files = await unzip(zip.url);
    const names = Object.keys(files);
    expect(names).toHaveLength(1);
    expect(names[0]).toMatch(/^proofs\/.+\.webp$/);

    const other = await liveShop(app, 'files-zip-other');
    await other.agent.post('/owner/storage/files/download').send({ ids }).expect(404);

    // Downloads from before yesterday are cleared by the hourly job; today's stay.
    expect(await exports.removeOldDownloads(new Date())).toBe(0);
  });

  it('emails the founder when an owner asks to delete the account', async () => {
    const shop = await liveShop(app, 'delete-ask');
    const before = emails.sent.length;
    await shop.agent.post('/owner/account/delete-request').send({}).expect(200, { ok: true });
    const mail = emails.sent.slice(before).find((m) => m.to === FOUNDER);
    expect(mail?.subject).toMatch(/^Delete request: /);
    expect(mail?.text).toContain(shop.slug);
    expect(mail?.text).toContain(shop.email);
    // The audit row is written after the answer.
    let logged = 0;
    for (let i = 0; i < 20 && logged === 0; i++) {
      logged = await db.run(ADMIN, async () =>
        Number(
          (
            await db.tx.execute<{ n: number }>(sql`
              select count(*)::int as n from public.audit_log
              where tenant_id = ${shop.shopId}::uuid and action = 'account.delete_request'`)
          ).rows[0]?.n ?? 0,
        ),
      );
      if (logged === 0) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(logged).toBe(1);
  });
});
