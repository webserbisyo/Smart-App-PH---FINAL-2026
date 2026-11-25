import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  MEDIA_BUCKETS,
  PROOF_KEEP_DAYS,
  STORAGE_KINDS,
  StorageSummarySchema,
  StoredFileListSchema,
  words,
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
      // Old proofs and archived photos arrive with orders and the menu (phases 4 and 5).
      cleanups: [],
      unusedUploads: unused,
      proofDays: PROOF_KEEP_DAYS,
      // Exports come with their own phase (6).
      lastExport: null,
    });
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
