import { randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  addDays,
  csv,
  DataExportSchema,
  exportFileMonth,
  exportRangeDays,
  exportWords,
  ExportRangeEnum,
  ExportStatusEnum,
  manilaDate,
  manilaParts,
  MB,
  OrderStatusEnum,
  OrderTypeEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  words,
  type CreateExportInput,
  type DataExport,
  type ExportRange,
} from '@smartapp/core';
import { sql, type SQL } from 'drizzle-orm';
import { strToU8, zipSync, type Zippable } from 'fflate';
import { z } from 'zod';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { mapLimit } from '../push/push-delivery.service.js';
import { MediaStorage } from './media-storage.js';

/** The download link works for a day (T66); then the file goes. */
export const EXPORT_LINK_HOURS = 24;
// Under the exports bucket's 200 MB limit (X10), with room for the ZIP's own headers.
export const ZIP_MAX_BYTES = 190 * MB;
// A build that never finished (the API restarted) is called failed after this long.
const STUCK_MINUTES = 30;
const PARALLEL = 4;
const EXPIRE_BATCH = 200;
// The ticked-file downloads (Storage › Files) live here, one folder per Manila day.
export const DOWNLOADS_FOLDER = 'downloads';

const ExportRowSchema = z.object({
  id: z.string(),
  range: ExportRangeEnum,
  part_orders: z.boolean(),
  part_payments: z.boolean(),
  part_proofs: z.boolean(),
  status: ExportStatusEnum,
  file_name: z.string(),
  path: z.string().nullable(),
  bytes: z.union([z.number(), z.string()]).nullable(),
  order_rows: z.number(),
  proof_files: z.number(),
  created_at: z.string(),
  ready_at: z.string().nullable(),
  expires_at: z.string().nullable(),
});
type ExportRow = z.infer<typeof ExportRowSchema>;

const OrderRowSchema = z.object({
  id: z.string(),
  order_no: z.number(),
  placed_at: z.string(),
  business_date: z.string(),
  type: OrderTypeEnum,
  status: OrderStatusEnum,
  customer_name: z.string(),
  customer_phone: z.string().nullable(),
  customer_email: z.string().nullable(),
  address: z.string(),
  subtotal: z.number(),
  discount: z.number(),
  delivery_fee: z.number(),
  total: z.number(),
  payment_method: PaymentMethodEnum,
  payment_status: PaymentStatusEnum,
  refund_amount: z.number().nullable(),
  note: z.string().nullable(),
  reward_title: z.string().nullable(),
  items: z.string(),
});
type OrderRow = z.infer<typeof OrderRowSchema>;

const ProofRowSchema = z.object({
  order_id: z.string(),
  created_at: z.string(),
  reference_no: z.string().nullable(),
  status: z.enum(['pending', 'approved', 'rejected']),
  decided_at: z.string().nullable(),
  bucket: z.string().nullable(),
  path: z.string().nullable(),
  mime: z.string().nullable(),
  bytes: z.union([z.number(), z.string()]).nullable(),
});
type ProofRow = z.infer<typeof ProofRowSchema>;

const pad = (n: number) => String(n).padStart(2, '0');

/** A spreadsheet-friendly Manila time: 2026-11-25 14:30 (sorts by itself). */
export function manilaStamp(value: string | Date): string {
  const p = manilaParts(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

const peso = (centavos: number) => (centavos / 100).toFixed(2);

export function extensionOf(mime: string | null): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/gif') return 'gif';
  return 'webp';
}

/** Business days as a SQL condition on `o.business_date`. */
function dayFilter(range: ExportRange, at: Date) {
  const { from, to } = exportRangeDays(range, at);
  return sql`${from === null ? sql`true` : sql`o.business_date >= ${from}::date`}
    and ${to === null ? sql`true` : sql`o.business_date < ${to}::date`}`;
}

/**
 * The owner's saved copy (T66, phase 6, X10): orders and payments as CSV, and the payment photos when asked,
 * in one ZIP in the private exports bucket. Made right after the request commits; the link works for 24
 * hours, then the hourly job removes the file. Logs counts and error names only (rule 12).
 */
@Injectable()
export class ExportsService {
  private readonly logger = new Logger('Exports');

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(MediaStorage) private readonly storage: MediaStorage,
    @Inject(JobsService) private readonly jobs: JobsService,
  ) {}

  async create(input: CreateExportInput): Promise<DataExport> {
    const shopId = this.db.shopId;
    const userId = this.db.userId;
    // A second tap while one is being made answers that one.
    const busy = await this.rows(sql`and status = 'preparing'
      and created_at > now() - make_interval(mins => ${STUCK_MINUTES})`);
    if (busy[0]) return this.view(busy[0]);
    const slug = await this.slug();
    const fileName = `${slug}-${exportFileMonth(input.range, new Date())}-${randomBytes(2).toString('hex')}.zip`;
    const inserted = await this.db.tx.execute(sql`
      insert into public.data_exports (tenant_id, range, part_orders, part_payments, part_proofs, file_name, requested_by)
      values (${shopId}::uuid, ${input.range}, ${input.parts.orders}, ${input.parts.payments}, ${input.parts.proofs},
        ${fileName}, ${userId}::uuid)
      returning *`);
    const row = ExportRowSchema.parse(inserted.rows[0]);
    this.db.afterCommit(() => this.build(row.id, { userId, shopId, role: 'api' }));
    return this.view(row);
  }

  async get(id: string): Promise<DataExport> {
    if (!z.uuid().safeParse(id).success) throw notFound();
    const [row] = await this.rows(sql`and id = ${id}::uuid`);
    if (!row) throw notFound();
    return this.view(row);
  }

  /** Storage's "last saved copy" card. */
  async latest(): Promise<DataExport | null> {
    const [row] = await this.rows(sql``);
    return row ? this.view(row) : null;
  }

  /**
   * The payment photos inside the owner's last export with photos (ready or already expired: the owner
   * has the copy). Storage offers to delete these early (exported_proofs, P7).
   */
  async exportedProofIds(): Promise<Set<string>> {
    const [last] = await this.rows(sql`and part_proofs and status in ('ready', 'expired')`);
    if (!last?.ready_at) return new Set();
    const result = await this.db.tx.execute<{ media_id: string }>(sql`
      select p.media_id from public.payment_proofs p
        join public.orders o on o.tenant_id = p.tenant_id and o.id = p.order_id
        join public.media_files m on m.tenant_id = p.tenant_id and m.id = p.media_id
        where p.tenant_id = ${this.db.shopId} and p.media_id is not null
          and m.created_at <= ${last.ready_at}::timestamptz
          and ${dayFilter(last.range, new Date(last.created_at))}`);
    return new Set(result.rows.map((r) => r.media_id));
  }

  /** Hourly: expired links lose their file, stuck builds fail, and yesterday's file downloads go. */
  @Cron(CronExpression.EVERY_HOUR)
  async expire(): Promise<void> {
    await this.jobs.runLocked('exports-expire', async () => {
      const due = z.array(z.object({ id: z.string(), path: z.string().nullable() })).parse(
        (
          await this.db.tx.execute(sql`
            select id, path from public.data_exports
            where status = 'ready' and expires_at <= now()
            order by expires_at limit ${EXPIRE_BATCH}`)
        ).rows,
      );
      await this.storage.remove(
        'exports',
        due.flatMap((d) => (d.path ? [d.path] : [])),
      );
      if (due.length > 0) {
        await this.db.tx.execute(sql`
          update public.data_exports set status = 'expired'
          where id = any(${`{${due.map((d) => d.id).join(',')}}`}::uuid[])`);
      }
      await this.db.tx.execute(sql`
        update public.data_exports set status = 'failed'
        where status = 'preparing' and created_at < now() - make_interval(mins => ${STUCK_MINUTES})`);
      const removed = await this.removeOldDownloads(new Date());
      if (due.length + removed > 0) {
        this.logger.log(`Expired ${due.length} exports and ${removed} file downloads`);
      }
    });
  }

  /** File downloads from days before yesterday (Manila): every link is 24 hours, so all have run out. */
  async removeOldDownloads(now: Date): Promise<number> {
    const keepFrom = addDays(manilaDate(now), -1);
    const days = (await this.storage.list('exports', DOWNLOADS_FOLDER)).filter(
      (day) => /^\d{4}-\d{2}-\d{2}$/.test(day) && day < keepFrom,
    );
    let removed = 0;
    for (const day of days) {
      const names = await this.storage.list('exports', `${DOWNLOADS_FOLDER}/${day}`);
      await this.storage.remove(
        'exports',
        names.map((name) => `${DOWNLOADS_FOLDER}/${day}/${name}`),
      );
      removed += names.length;
    }
    return removed;
  }

  /** Makes the ZIP outside the request (photos are read from Storage), then marks the export ready. */
  private async build(
    id: string,
    scope: { userId: string; shopId: string; role: 'api' },
  ): Promise<void> {
    try {
      const data = await this.db.run(scope, () => this.read(id));
      if (!data) return;
      const { row, orders, proofs } = data;
      const files: Zippable = {};
      if (row.part_orders) files['orders.csv'] = strToU8(this.ordersCsv(orders));
      const photos = row.part_proofs
        ? this.photoNames(orders, proofs)
        : new Map<ProofRow, string>();
      if (row.part_payments)
        files['payments.csv'] = strToU8(this.paymentsCsv(orders, proofs, photos));
      const wanted = [...photos.entries()];
      const total = wanted.reduce((n, [p]) => n + Number(p.bytes ?? 0), 0);
      if (total > ZIP_MAX_BYTES) throw new ApiFailure('file_too_large', 413);
      let added = 0;
      const bodies = await mapLimit(wanted, PARALLEL, async ([p]) =>
        p.bucket === 'proofs' && p.path ? this.storage.download('proofs', p.path) : null,
      );
      wanted.forEach(([, name], i) => {
        const body = bodies[i];
        if (!body) return;
        // Photos are already compressed: stored as they are.
        files[name] = [body, { level: 0 }];
        added += 1;
      });
      const zip = zipSync(files, { level: 6 });
      const path = `${scope.shopId}/${id}.zip`;
      await this.storage.put('exports', path, Buffer.from(zip), 'application/zip', 0);
      await this.db.run(scope, async () => {
        await this.db.tx.execute(sql`
          update public.data_exports
          set status = 'ready', path = ${path}, bytes = ${zip.length}, order_rows = ${orders.length},
            proof_files = ${added}, ready_at = now(),
            expires_at = now() + make_interval(hours => ${EXPORT_LINK_HOURS})
          where tenant_id = ${scope.shopId}::uuid and id = ${id}::uuid and status = 'preparing'`);
      });
    } catch (error) {
      this.logger.warn(`Export failed: ${error instanceof Error ? error.name : 'error'}`);
      await this.db
        .run(scope, async () => {
          await this.db.tx.execute(sql`
            update public.data_exports set status = 'failed'
            where tenant_id = ${scope.shopId}::uuid and id = ${id}::uuid and status = 'preparing'`);
        })
        .catch(() => undefined);
    }
  }

  private async read(
    id: string,
  ): Promise<{ row: ExportRow; orders: OrderRow[]; proofs: ProofRow[] } | null> {
    const shopId = this.db.shopId;
    const [row] = await this.rows(sql`and id = ${id}::uuid and status = 'preparing'`);
    if (!row) return null;
    const days = dayFilter(row.range, new Date(row.created_at));
    const orders = z.array(OrderRowSchema).parse(
      (
        await this.db.tx.execute(sql`
          with items as (
            select l.order_id, string_agg(l.qty || ' × ' || l.name
              || coalesce(' (' || nullif(l.variant_label, '') || ')', ''), '; ' order by l.sort) as items
            from public.order_lines l
            join public.orders o on o.tenant_id = l.tenant_id and o.id = l.order_id
            where l.tenant_id = ${shopId} and ${days}
            group by l.order_id
          )
          select o.id, o.order_no, o.placed_at, o.business_date::text as business_date, o.type, o.status,
            o.customer_name, o.customer_phone, o.customer_email,
            concat_ws(', ', nullif(o.house_no, ''), nullif(o.floor, ''), nullif(o.address_line, ''),
              nullif(o.landmark, '')) as address,
            o.subtotal, o.discount, o.delivery_fee, o.total, o.payment_method, o.payment_status,
            o.refund_amount, o.note, o.reward_title, coalesce(i.items, '') as items
          from public.orders o
          left join items i on i.order_id = o.id
          where o.tenant_id = ${shopId} and ${days}
          order by o.placed_at, o.order_no`)
      ).rows,
    );
    const proofs = z.array(ProofRowSchema).parse(
      (
        await this.db.tx.execute(sql`
          select p.order_id, p.created_at, p.reference_no, p.status, p.decided_at,
            m.bucket, m.path, m.mime, m.bytes
          from public.payment_proofs p
          join public.orders o on o.tenant_id = p.tenant_id and o.id = p.order_id
          left join public.media_files m
            on m.tenant_id = p.tenant_id and m.id = p.media_id and m.deleted_at is null
          where p.tenant_id = ${shopId} and ${days}
          order by p.created_at`)
      ).rows,
    );
    return { row, orders, proofs };
  }

  private ordersCsv(orders: readonly OrderRow[]): string {
    const shop = words.shop;
    return csv([
      exportWords.ordersHeader,
      ...orders.map((o) => [
        o.order_no,
        manilaStamp(o.placed_at),
        o.business_date,
        shop.orderType[o.type],
        shop.orderStatus[o.status],
        o.customer_name,
        o.customer_phone ?? '',
        o.customer_email ?? '',
        o.address,
        o.reward_title ? [o.items, exportWords.reward(o.reward_title)].join('; ') : o.items,
        peso(o.subtotal),
        peso(o.discount),
        peso(o.delivery_fee),
        peso(o.total),
        shop.paymentMethod[o.payment_method],
        shop.paymentStatus[o.payment_status],
        o.refund_amount ? peso(o.refund_amount) : '',
        o.note ?? '',
      ]),
    ]);
  }

  /** One row per order, or one per payment photo when the customer sent some. */
  private paymentsCsv(
    orders: readonly OrderRow[],
    proofs: readonly ProofRow[],
    photos: ReadonlyMap<ProofRow, string>,
  ): string {
    const shop = words.shop;
    const byOrder = new Map<string, ProofRow[]>();
    for (const p of proofs) byOrder.set(p.order_id, [...(byOrder.get(p.order_id) ?? []), p]);
    return csv([
      exportWords.paymentsHeader,
      ...orders.flatMap((o) => {
        const base = [
          o.order_no,
          manilaStamp(o.placed_at),
          shop.paymentMethod[o.payment_method],
          peso(o.total),
          shop.paymentStatus[o.payment_status],
        ];
        const sent = byOrder.get(o.id) ?? [];
        if (sent.length === 0) return [[...base, '', '', '', '', '']];
        return sent.map((p) => [
          ...base,
          manilaStamp(p.created_at),
          p.reference_no ?? '',
          exportWords.proofStatus[p.status],
          p.decided_at ? manilaStamp(p.decided_at) : '',
          photos.get(p) ?? '',
        ]);
      }),
    ]);
  }

  /** The ZIP name of each payment photo still kept: proofs/order-12.jpg, proofs/order-12-2.jpg. */
  private photoNames(orders: readonly OrderRow[], proofs: readonly ProofRow[]) {
    const orderNo = new Map(orders.map((o) => [o.id, o.order_no]));
    const seen = new Map<string, number>();
    const names = new Map<ProofRow, string>();
    for (const p of proofs) {
      const no = orderNo.get(p.order_id);
      if (no === undefined || !p.path) continue;
      const n = (seen.get(p.order_id) ?? 0) + 1;
      seen.set(p.order_id, n);
      names.set(p, exportWords.proofFile(no, n, extensionOf(p.mime)));
    }
    return names;
  }

  private async rows(where: SQL): Promise<ExportRow[]> {
    const result = await this.db.tx.execute(sql`
      select * from public.data_exports
      where tenant_id = ${this.db.shopId} ${where}
      order by created_at desc limit 1`);
    return z.array(ExportRowSchema).parse(result.rows);
  }

  private async slug(): Promise<string> {
    const result = await this.db.tx.execute<{ slug: string }>(
      sql`select slug from public.tenants where id = ${this.db.shopId}`,
    );
    return result.rows[0]?.slug ?? 'shop';
  }

  private async view(row: ExportRow): Promise<DataExport> {
    const now = Date.now();
    const left = row.expires_at ? new Date(row.expires_at).getTime() - now : 0;
    // The hourly job may not have run yet: a link past its 24 hours already reads as expired.
    const status = row.status === 'ready' && left <= 0 ? 'expired' : row.status;
    const url =
      status === 'ready' && row.path
        ? await this.storage.signedRead('exports', row.path, Math.max(60, Math.floor(left / 1000)))
        : null;
    return DataExportSchema.parse({
      id: row.id,
      range: row.range,
      parts: { orders: row.part_orders, payments: row.part_payments, proofs: row.part_proofs },
      status,
      fileName: row.file_name,
      bytes: row.bytes === null ? null : Number(row.bytes),
      orderRows: row.order_rows,
      proofFiles: row.proof_files,
      createdAt: new Date(row.created_at).toISOString(),
      readyAt: row.ready_at ? new Date(row.ready_at).toISOString() : null,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      url,
    });
  }
}
