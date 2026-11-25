import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CleanupPreviewSchema,
  MEDIA_BUCKETS,
  PROOF_KEEP_DAYS,
  STORAGE_KINDS,
  StorageSummarySchema,
  StoredFileListSchema,
  words,
  type CleanupKind,
  type CleanupPreview,
  type FileUse,
  type MediaBucket,
  type StorageFolder,
  type StorageKind,
  type StorageSummary,
  type StoredFile,
  type StoredFileList,
} from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { ApiFailure } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { MediaService } from './media.service.js';

// Confirmed uploads nothing uses are removed after a day (the Storage page says they clear by themselves).
const UNUSED_HOURS = 24;
const CLEANUP_BATCH = 200;

interface FileRow extends Record<string, unknown> {
  id: string;
  kind: string;
  bucket: string;
  path: string;
  bytes: number | string;
  confirmed: boolean;
  created_at: string;
  use_kind: string | null;
  use_id: string | null;
  use_label: string | null;
}

/** The same list of files gives the same token; anything added or gone since the preview changes it. */
function cleanupToken(files: readonly { id: string }[]): string {
  const ids = files.map((f) => f.id).sort();
  return createHash('sha256').update(ids.join(',')).digest('hex').slice(0, 32);
}

/** Which storage kind (meter row and folder) a bucket's files count under; plan receipts never count. */
function storageKindOf(bucket: string): StorageKind | null {
  return STORAGE_KINDS.find((kind) => kind === bucket) ?? null;
}

function isBucket(value: string): value is MediaBucket {
  return MEDIA_BUCKETS.some((bucket) => bucket === value);
}

const FILE_USE_KINDS: readonly FileUse[] = [
  'item',
  'logo',
  'banner',
  'category',
  'qr',
  'avatar',
  'order',
];
function fileUseOf(value: string | null): FileUse | null {
  return FILE_USE_KINDS.find((kind) => kind === value) ?? null;
}

/**
 * What each file is used for, one row per file (the first use with a screen of its own). The owner's own
 * photo is kept in profiles.avatar as its address, so it is matched by path.
 */
function usesSql(shopId: string) {
  return sql`
    select distinct on (media_id) media_id, use_kind, use_id, use_label from (
      select qr_media_id as media_id, 'qr' as use_kind, id::text as use_id, method as use_label, 1 as rank
        from public.payment_accounts where tenant_id = ${shopId} and removed_at is null and qr_media_id is not null
      union all
      select sm.media_id, m.kind, m.kind, m.kind, 2
        from public.storefront_media sm join public.media_files m on m.id = sm.media_id
        where sm.tenant_id = ${shopId}
      union all
      select ip.media_id, 'item', ip.item_id::text, i.name, 3
        from public.item_photos ip join public.items i on i.id = ip.item_id where ip.tenant_id = ${shopId}
      union all
      select v.media_id, 'item', i.id::text, i.name, 3
        from public.item_axis_values v
        join public.item_axes a on a.id = v.axis_id
        join public.items i on i.id = a.item_id
        where v.tenant_id = ${shopId} and v.media_id is not null
      union all
      select icon_media_id, 'category', id::text, name, 4
        from public.categories where tenant_id = ${shopId} and icon_media_id is not null
      union all
      select media_id, 'order', order_id::text, order_id::text, 5
        from public.payment_proofs where tenant_id = ${shopId} and media_id is not null
      union all
      select m.id, 'avatar', p.id::text, coalesce(p.full_name, 'Owner'), 7
        from public.media_files m
        join public.tenant_members tm on tm.tenant_id = m.tenant_id
        join public.profiles p on p.id = tm.user_id
        where m.tenant_id = ${shopId} and m.kind = 'avatar'
          and p.avatar ->> 'kind' = 'photo' and p.avatar ->> 'ref' like '%' || m.path
    ) uses
    order by media_id, rank`;
}

/**
 * Settings › Storage (T66, T93): the meter, the files in each folder and deleting them. The meter is a sum
 * of media_files (never a bucket scan). A file in use is locked: the owner changes the setting first.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger('Media');

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(JobsService) private readonly jobs: JobsService,
  ) {}

  async getStorage(): Promise<StorageSummary> {
    const shopId = this.db.shopId;
    const [limit] = (
      await this.db.tx.execute<{ limit: number | string }>(
        sql`select storage_limit_bytes as limit from public.tenants where id = ${shopId}`,
      )
    ).rows;
    const rows = await this.files(shopId);
    const kinds = STORAGE_KINDS.map((kind) => ({ kind, bytes: 0, files: 0 }));
    const unused = { files: 0, bytes: 0 };
    let used = 0;
    for (const row of rows) {
      const kind = storageKindOf(row.bucket);
      if (!kind) continue;
      const bytes = Number(row.bytes);
      used += bytes;
      if (row.uses === 0) {
        unused.files += 1;
        unused.bytes += bytes;
        continue;
      }
      const usage = kinds.find((k) => k.kind === kind);
      if (usage) {
        usage.files += 1;
        usage.bytes += bytes;
      }
    }
    return StorageSummarySchema.parse({
      usedBytes: used,
      limitBytes: Number(limit?.limit ?? 0),
      kinds,
      cleanups: await this.cleanupOffers(rows),
      unusedUploads: unused,
      proofDays: PROOF_KEEP_DAYS,
      // Exports come with their own phase (6).
      lastExport: null,
    });
  }

  /** What a cleanup would delete now, with a token so Run deletes exactly this list (cleanup_changed). */
  async previewCleanup(kind: CleanupKind): Promise<CleanupPreview> {
    const files = await this.cleanupFiles(kind, await this.files(this.db.shopId));
    return CleanupPreviewSchema.parse({
      kind,
      files: files.length,
      bytes: files.reduce((sum, f) => sum + Number(f.bytes), 0),
      // Archived photos were never customer data; proofs need an export first (phase 6).
      savedCopy: kind === 'archived_photos',
      token: cleanupToken(files),
    });
  }

  async runCleanup(kind: CleanupKind, token: string): Promise<StorageSummary> {
    const shopId = this.db.shopId;
    const files = await this.cleanupFiles(kind, await this.files(shopId));
    if (files.length === 0 || cleanupToken(files) !== token) {
      throw new ApiFailure('cleanup_changed', 409);
    }
    const ids = files.map((f) => f.id);
    if (kind === 'archived_photos') {
      // The archived items lose these photos; restoring one brings it back without a picture.
      await this.db.tx.execute(sql`
        delete from public.item_photos where tenant_id = ${shopId} and media_id in (${sql.join(
          ids.map((id) => sql`${id}::uuid`),
          sql`, `,
        )})`);
      await this.db.tx.execute(sql`
        update public.item_axis_values set media_id = null
          where tenant_id = ${shopId} and media_id in (${sql.join(
            ids.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})`);
    } else {
      // The payment row stays; only its picture goes (P7).
      await this.db.tx.execute(sql`
        update public.payment_proofs set media_id = null
          where tenant_id = ${shopId} and media_id in (${sql.join(
            ids.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})`);
    }
    await this.media.deleteFiles(files);
    return this.getStorage();
  }

  async listFiles(folder: StorageFolder): Promise<StoredFileList> {
    const rows = await this.files(this.db.shopId);
    const files: StoredFile[] = [];
    const perDay = new Map<string, number>();
    let banner = 0;
    for (const row of rows) {
      const kind = storageKindOf(row.bucket);
      if (!kind) continue;
      const unusedFile = row.uses === 0;
      if (folder === 'unused' ? !unusedFile : unusedFile || kind !== folder) continue;
      const day = new Date(row.created_at).toISOString().slice(0, 10).replace(/-/g, '');
      const n = (perDay.get(`${row.kind}${day}`) ?? 0) + 1;
      perDay.set(`${row.kind}${day}`, n);
      const use = fileUseOf(row.use_kind);
      const label = use === 'banner' ? String(++banner) : row.use_label;
      files.push({
        id: row.id,
        folder,
        name: `${row.kind.replace('_', '-')}-${day}${n > 1 ? `-${n}` : ''}.webp`,
        bytes: Number(row.bytes),
        uploadedAt: new Date(row.created_at).toISOString(),
        // Customers' payment screenshots never show here (T93): only public pictures have a ref.
        ref:
          isBucket(row.bucket) && row.bucket !== 'proofs'
            ? this.media.refOf(row.bucket, row.path)
            : null,
        usedBy:
          use && row.use_id
            ? { kind: use, id: row.use_id, label: this.useLabel(use, label) }
            : null,
        lock: unusedFile ? (row.confirmed ? null : 'recent') : 'in_use',
        amount: null,
      });
    }
    files.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    return StoredFileListSchema.parse({ folder, files });
  }

  /** All the ticked files or none: any file in use, still arriving or not the shop's answers file_locked. */
  async deleteFiles(ids: readonly string[]): Promise<StorageSummary> {
    const wanted = new Set(ids);
    const rows = (await this.files(this.db.shopId)).filter((row) => wanted.has(row.id));
    const free = rows.filter((row) => row.confirmed && row.uses === 0 && storageKindOf(row.bucket));
    if (free.length !== wanted.size) throw new ApiFailure('file_locked', 409);
    await this.media.deleteFiles(free);
    return this.getStorage();
  }

  /** Nightly: confirmed uploads nothing has used for a day go, in every shop (the T66 promise). */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'Asia/Manila' })
  async removeUnused(): Promise<void> {
    await this.jobs.runLocked('media-unused', async () => {
      const shops = await this.db.tx.execute<{ tenant_id: string }>(
        sql`select distinct tenant_id from public.media_files
            where deleted_at is null and confirmed_at is not null
              and created_at < now() - make_interval(hours => ${UNUSED_HOURS})`,
      );
      let removed = 0;
      for (const { tenant_id: shopId } of shops.rows) {
        const rows = await this.files(shopId);
        const stale = rows
          .filter(
            (row) =>
              row.confirmed &&
              row.uses === 0 &&
              storageKindOf(row.bucket) !== null &&
              Date.now() - new Date(row.created_at).getTime() > UNUSED_HOURS * 3_600_000,
          )
          .slice(0, CLEANUP_BATCH);
        await this.media.deleteFiles(stale);
        removed += stale.length;
      }
      if (removed > 0) this.logger.log(`Removed ${removed} unused uploads`);
    });
  }

  private async cleanupOffers(
    rows: readonly (FileRow & { uses: number })[],
  ): Promise<{ kind: CleanupKind; files: number; bytes: number }[]> {
    const offers: { kind: CleanupKind; files: number; bytes: number }[] = [];
    for (const kind of ['old_proofs', 'archived_photos'] as const) {
      const files = await this.cleanupFiles(kind, rows);
      offers.push({
        kind,
        files: files.length,
        bytes: files.reduce((s, f) => s + Number(f.bytes), 0),
      });
    }
    return offers;
  }

  /**
   * The files a cleanup takes:
   * - archived_photos: menu photos whose every use is an archived item (photo or option photo);
   * - old_proofs: payment photos of finished orders (completed, cancelled, expired) older than 7 days;
   * - exported_proofs: proofs inside the owner's last export (phase 6).
   */
  private async cleanupFiles(
    kind: CleanupKind,
    rows: readonly (FileRow & { uses: number })[],
  ): Promise<(FileRow & { uses: number })[]> {
    const shopId = this.db.shopId;
    if (kind === 'archived_photos') {
      const archived = await this.db.tx.execute<{ media_id: string; n: number | string }>(sql`
        select media_id, count(*) as n from (
          select ip.media_id from public.item_photos ip
            join public.items i on i.id = ip.item_id
            where ip.tenant_id = ${shopId} and i.status = 'archived'
          union all
          select v.media_id from public.item_axis_values v
            join public.item_axes a on a.id = v.axis_id
            join public.items i on i.id = a.item_id
            where v.tenant_id = ${shopId} and i.status = 'archived' and v.media_id is not null
        ) archived_uses group by media_id`);
      const uses = new Map(archived.rows.map((r) => [r.media_id, Number(r.n)]));
      return rows.filter(
        (row) => row.bucket === 'menu' && row.uses > 0 && uses.get(row.id) === row.uses,
      );
    }
    if (kind === 'old_proofs') {
      const old = await this.db.tx.execute<{ media_id: string }>(sql`
        select p.media_id from public.payment_proofs p
          join public.orders o on o.id = p.order_id
          join public.media_files m on m.id = p.media_id
          where p.tenant_id = ${shopId} and p.media_id is not null
            and o.status in ('completed', 'cancelled', 'expired')
            and m.created_at < now() - interval '7 days'`);
      const ids = new Set(old.rows.map((r) => r.media_id));
      return rows.filter((row) => ids.has(row.id));
    }
    return [];
  }

  /** The screen words the use from its kind (settingsWords.storage.files.usedBy) with this label. */
  private useLabel(use: FileUse, label: string | null): string {
    if (use === 'qr') {
      const method = Object.entries(words.shop.paymentMethod).find(([key]) => key === label);
      if (method) return method[1];
    }
    return label && label.length > 0 ? label : use;
  }

  private async files(shopId: string): Promise<(FileRow & { uses: number })[]> {
    const result = await this.db.tx.execute<FileRow & { uses: number | string }>(sql`
      with uses as (${usesSql(shopId)}),
      any_use as (
        select media_id, count(*) as uses from (
          select qr_media_id as media_id from public.payment_accounts where tenant_id = ${shopId} and removed_at is null
          union all select media_id from public.storefront_media where tenant_id = ${shopId}
          union all select media_id from public.item_photos where tenant_id = ${shopId}
          union all select media_id from public.item_axis_values where tenant_id = ${shopId}
          union all select icon_media_id from public.categories where tenant_id = ${shopId}
          union all select media_id from public.payment_proofs where tenant_id = ${shopId}
          union all select avatar_media_id from public.members where tenant_id = ${shopId}
          union all select reward_media_id from public.stamp_cards where tenant_id = ${shopId}
          union all select image_media_id from public.push_campaigns where tenant_id = ${shopId}
          union all select proof_media_id from public.plan_payments where tenant_id = ${shopId}
          union all select photo_media_id from public.billing_messages where tenant_id = ${shopId}
        ) all_uses where media_id is not null group by media_id
      )
      select m.id, m.kind, m.bucket, m.path, m.bytes, m.confirmed_at is not null as confirmed,
             m.created_at, u.use_kind, u.use_id, u.use_label,
             coalesce(a.uses, 0) + case when u.use_kind = 'avatar' then 1 else 0 end as uses
        from public.media_files m
        left join uses u on u.media_id = m.id
        left join any_use a on a.media_id = m.id
        where m.tenant_id = ${shopId} and m.deleted_at is null
        order by m.created_at desc`);
    return result.rows.map((row) => ({ ...row, uses: Number(row.uses) }));
  }
}
