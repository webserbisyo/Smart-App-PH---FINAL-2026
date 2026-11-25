import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  IMAGE_MIME_TYPES,
  MEDIA_BUCKETS,
  UPLOAD_BUCKET,
  type ConfirmUploadResult,
  type MediaBucket,
  type MediaKind,
  type UploadKind,
  type UploadResult,
} from '@smartapp/core';
import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { mediaFiles } from '../db/generated/schema.js';
import { JobsService } from '../jobs/jobs.service.js';
import { MediaStorage } from './media-storage.js';

// The bucket limit (migration 20261126100000): a phone sends far less after shrinking (T65).
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
// An upload not confirmed in an hour is removed (api.md "Settings").
const UNCONFIRMED_HOURS = 1;
const CLEANUP_BATCH = 200;

const PUBLIC_BUCKETS: ReadonlySet<MediaBucket> = new Set(['menu', 'look', 'qr', 'profile']);

function isImageMime(mime: string): boolean {
  return IMAGE_MIME_TYPES.some((type) => type === mime);
}

function isBucket(value: string): value is MediaBucket {
  return MEDIA_BUCKETS.some((bucket) => bucket === value);
}

/** A confirmed file of the shop that a setting may point at. */
export interface ShopFile {
  id: string;
  bucket: MediaBucket;
  path: string;
  bytes: number;
}

/**
 * The shop's files (T65, T66, T116). An upload is two steps: room and a signed place (the row counts at once,
 * so two phones never both fit into the last megabytes), then the confirm that reads the real size and type
 * from Storage. Settings save a picture by its `ref`: the public address for public buckets, the path for
 * private ones. Every query runs in the request's transaction, so RLS keeps it to the caller's shop.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger('Media');

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(MediaStorage) private readonly storage: MediaStorage,
    @Inject(JobsService) private readonly jobs: JobsService,
  ) {}

  async createUpload(input: {
    kind: UploadKind;
    bytes?: number | undefined;
  }): Promise<UploadResult> {
    const shopId = this.db.shopId;
    const bucket = UPLOAD_BUCKET[input.kind];
    const id = randomUUID();
    // No file ending: Storage keeps the real type, and the path never says what the phone sent.
    const path = `${shopId}/${input.kind}/${id}`;
    const bytes = Math.max(0, Math.min(input.bytes ?? 0, MAX_UPLOAD_BYTES));
    await this.db.tx.execute(
      sql`select private.reserve_media(${id}::uuid, ${input.kind}, ${bucket}, ${path}, ${bytes}, 'image/webp')`,
    );
    const uploadUrl = await this.storage.signedUpload(bucket, path);
    return { id, uploadUrl, path };
  }

  async confirmUpload(id: string): Promise<ConfirmUploadResult> {
    const [row] = await this.db.tx
      .select({ bucket: mediaFiles.bucket, path: mediaFiles.path })
      .from(mediaFiles)
      .where(
        and(eq(mediaFiles.id, id), isNull(mediaFiles.confirmedAt), isNull(mediaFiles.deletedAt)),
      );
    if (!row || !isBucket(row.bucket)) throw notFound();
    const stored = await this.storage.stat(row.bucket, row.path);
    if (!stored) throw notFound();
    // A wrong file is removed now; its row goes with the hourly clean-up.
    if (!isImageMime(stored.mime)) {
      await this.storage.remove(row.bucket, [row.path]);
      throw new ApiFailure('file_not_image', 400);
    }
    if (stored.bytes > MAX_UPLOAD_BYTES) {
      await this.storage.remove(row.bucket, [row.path]);
      throw new ApiFailure('file_too_large', 400);
    }
    await this.db.tx.execute(
      sql`select private.confirm_media(${id}::uuid, ${stored.bytes}, ${stored.mime})`,
    );
    return { ref: this.refOf(row.bucket, row.path), bytes: stored.bytes };
  }

  /** The ref of a stored row's file, or null for a bucket we do not know. */
  refFor(bucket: string, path: string): string | null {
    return isBucket(bucket) ? this.refOf(bucket, path) : null;
  }

  /** What a screen saves and shows for a file. */
  refOf(bucket: MediaBucket, path: string): string {
    return PUBLIC_BUCKETS.has(bucket) ? this.storage.publicUrl(bucket, path) : path;
  }

  /**
   * The shop's confirmed file behind a ref, or null when the ref is not one of its files (a sample picture,
   * another shop's file, a deleted one). Callers turn null into a field error.
   */
  async fileOf(ref: string, kinds: readonly MediaKind[]): Promise<ShopFile | null> {
    const path = this.pathOf(ref);
    if (!path) return null;
    const [row] = await this.db.tx
      .select({
        id: mediaFiles.id,
        bucket: mediaFiles.bucket,
        path: mediaFiles.path,
        bytes: mediaFiles.bytes,
      })
      .from(mediaFiles)
      .where(
        and(
          eq(mediaFiles.path, path),
          inArray(mediaFiles.kind, [...kinds]),
          isNotNull(mediaFiles.confirmedAt),
          isNull(mediaFiles.deletedAt),
        ),
      );
    if (!row || !isBucket(row.bucket)) return null;
    return { id: row.id, bucket: row.bucket, path: row.path, bytes: row.bytes };
  }

  /** The ref of a file by its id (a setting that points at media_files). */
  async refById(id: string | null): Promise<string | null> {
    if (!id) return null;
    const [row] = await this.db.tx
      .select({ bucket: mediaFiles.bucket, path: mediaFiles.path })
      .from(mediaFiles)
      .where(eq(mediaFiles.id, id));
    return row && isBucket(row.bucket) ? this.refOf(row.bucket, row.path) : null;
  }

  /** Public address or bare path to the stored path; anything else (samples, data addresses) is null. */
  pathOf(ref: string): string | null {
    for (const bucket of PUBLIC_BUCKETS) {
      const prefix = this.storage.publicPrefix(bucket);
      if (ref.startsWith(prefix)) return ref.slice(prefix.length);
    }
    return /^[0-9a-f-]{36}\/[a-z_]+\/[0-9a-f-]{36}$/.test(ref) ? ref : null;
  }

  /** Marks files deleted and removes them from Storage (after the transaction's checks passed). */
  async deleteFiles(files: readonly { id: string; bucket: string; path: string }[]): Promise<void> {
    if (files.length === 0) return;
    await this.db.tx
      .update(mediaFiles)
      .set({ deletedAt: sql`now()` })
      .where(
        inArray(
          mediaFiles.id,
          files.map((f) => f.id),
        ),
      );
    for (const bucket of MEDIA_BUCKETS) {
      await this.storage.remove(
        bucket,
        files.filter((f) => f.bucket === bucket).map((f) => f.path),
      );
    }
  }

  /** Hourly: uploads never confirmed are removed, so a dropped connection never fills a shop (T66). */
  @Cron(CronExpression.EVERY_HOUR)
  async removeUnconfirmed(): Promise<void> {
    await this.jobs.runLocked('media-unconfirmed', async () => {
      const stale = await this.db.tx
        .select({ id: mediaFiles.id, bucket: mediaFiles.bucket, path: mediaFiles.path })
        .from(mediaFiles)
        .where(
          and(
            isNull(mediaFiles.confirmedAt),
            isNull(mediaFiles.deletedAt),
            sql`${mediaFiles.createdAt} < now() - make_interval(hours => ${UNCONFIRMED_HOURS})`,
          ),
        )
        .limit(CLEANUP_BATCH);
      await this.deleteFiles(stale);
      if (stale.length > 0) this.logger.log(`Removed ${stale.length} unconfirmed uploads`);
    });
  }
}
