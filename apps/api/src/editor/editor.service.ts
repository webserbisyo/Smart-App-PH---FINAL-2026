import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  isLocalPicture,
  parseDemoRef,
  StorefrontContentSchema,
  StorefrontDraftStateSchema,
  type ContentVersion,
  type PreviewToken,
  type PublishStorefrontInput,
  type SaveStorefrontDraftInput,
  type StorefrontContent,
  type StorefrontDraftState,
} from '@smartapp/core';
import { and, eq, sql } from 'drizzle-orm';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { storefrontContent, storefrontMedia } from '../db/generated/schema.js';
import { MediaService } from '../media/media.service.js';
import { StorefrontCache } from '../public/pages-cache.service.js';

// The Editor's preview link works for 30 minutes (api.md "Editor": short-lived, owner-only, one shop).
const PREVIEW_MINUTES = 30;

function isoOrNull(value: string | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

/** Every picture the content points at: the logo and the banners. */
function picturesOf(content: StorefrontContent): { field: string; ref: string }[] {
  const out: { field: string; ref: string }[] = [];
  if (content.logo) out.push({ field: 'logo', ref: content.logo });
  content.look.banners.forEach((banner, i) =>
    out.push({ field: `look.banners.${i}.ref`, ref: banner.ref }),
  );
  return out;
}

/**
 * The Editor (api.md "Editor (owner)", T72 to T76): the draft, autosave with a version check (draft_conflict
 * when another phone saved first), Publish and Discard in one transaction each, and the preview link.
 * `storefront_media` lists every upload the draft or the live page uses, so Storage never deletes one in use.
 */
@Injectable()
export class EditorService {
  private readonly previewKey: Buffer;

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(StorefrontCache) private readonly pages: StorefrontCache,
    @Inject(ConfigService) config: ConfigService,
  ) {
    // Derived from the server's secret (no extra setting to manage); a random key on a laptop without one.
    const secret = config.get<string>('SUPABASE_SECRET_KEY');
    this.previewKey = secret
      ? Buffer.from(hkdfSync('sha256', secret, 'smartapp', 'editor-preview-token', 32))
      : randomBytes(32);
  }

  async getDraft(): Promise<StorefrontDraftState> {
    const [row] = await this.db.tx
      .select()
      .from(storefrontContent)
      .where(eq(storefrontContent.tenantId, this.db.shopId));
    if (!row) throw notFound();
    return StorefrontDraftStateSchema.parse({
      draft: row.draft,
      published: row.published,
      baseVersion: row.draftVersion,
      contentVersion: row.publishedVersion,
      savedAt: isoOrNull(row.savedAt),
    });
  }

  /** Autosave. The draft moves on only from the version the phone last saw (E3). */
  async saveDraft(input: SaveStorefrontDraftInput): Promise<StorefrontDraftState> {
    const content = StorefrontContentSchema.parse(input.content);
    await this.checkPictures(content);
    const saved = await this.db.tx
      .update(storefrontContent)
      .set({
        draft: content,
        draftVersion: sql`${storefrontContent.draftVersion} + 1`,
        savedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(storefrontContent.tenantId, this.db.shopId),
          eq(storefrontContent.draftVersion, input.baseVersion),
        ),
      )
      .returning({ tenantId: storefrontContent.tenantId });
    if (saved.length === 0) throw new ApiFailure('draft_conflict', 409);
    await this.syncPictures();
    return this.getDraft();
  }

  /** What customers see becomes the draft the phone last saw. */
  async publish(input: PublishStorefrontInput): Promise<ContentVersion> {
    const done = await this.db.tx
      .update(storefrontContent)
      .set({
        published: sql`${storefrontContent.draft}`,
        publishedVersion: sql`${storefrontContent.publishedVersion} + 1`,
        publishedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(storefrontContent.tenantId, this.db.shopId),
          eq(storefrontContent.draftVersion, input.baseVersion),
        ),
      )
      .returning({ contentVersion: storefrontContent.publishedVersion });
    const row = done[0];
    if (!row) throw new ApiFailure('draft_conflict', 409);
    await this.syncPictures();
    // Customers see the new look on their next visit (R8).
    await this.pages.shopChanged();
    return { contentVersion: row.contentVersion };
  }

  /** The draft goes back to what customers see; other phones holding the old draft get draft_conflict. */
  async discard(): Promise<ContentVersion> {
    const done = await this.db.tx
      .update(storefrontContent)
      .set({
        draft: sql`${storefrontContent.published}`,
        draftVersion: sql`${storefrontContent.draftVersion} + 1`,
        savedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(storefrontContent.tenantId, this.db.shopId))
      .returning({ contentVersion: storefrontContent.publishedVersion });
    const row = done[0];
    if (!row) throw notFound();
    await this.syncPictures();
    return { contentVersion: row.contentVersion };
  }

  /**
   * A short-lived token for this shop's draft preview: `<shop>.<expiry>.<signature>` (HMAC-SHA256). The
   * storefront's preview page will send it back to NestJS to read the draft (public storefront phase).
   */
  createPreviewToken(): PreviewToken {
    const expires = new Date(Date.now() + PREVIEW_MINUTES * 60_000);
    const body = `${this.db.shopId}.${Math.floor(expires.getTime() / 1000)}`;
    const signature = createHmac('sha256', this.previewKey).update(body).digest('base64url');
    return { token: `${body}.${signature}`, expiresAt: expires.toISOString() };
  }

  /** The shop a preview token was made for, while it lasts; null for anything else (preview_expired). */
  previewShopOf(token: string): string | null {
    const [shopId, expires, signature] = token.split('.');
    if (!shopId || !expires || !signature || !/^\d{1,12}$/.test(expires)) return null;
    const expected = createHmac('sha256', this.previewKey)
      .update(`${shopId}.${expires}`)
      .digest('base64url');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    if (Number(expires) * 1000 < Date.now()) return null;
    return shopId;
  }

  /** Sample pictures are fine; anything else must be a confirmed logo or banner upload of this shop. */
  private async checkPictures(content: StorefrontContent): Promise<void> {
    const bad: Record<string, string[]> = {};
    for (const { field, ref } of picturesOf(content)) {
      if (parseDemoRef(ref)) continue;
      if (isLocalPicture(ref) || !(await this.media.fileOf(ref, ['logo', 'banner']))) {
        bad[field] = ['invalid'];
      }
    }
    if (Object.keys(bad).length > 0) throw new ApiFailure('invalid_input', 400, bad);
  }

  /** storefront_media = the uploads the draft or the live page use (Storage locks them, T93). */
  private async syncPictures(): Promise<void> {
    const shopId = this.db.shopId;
    const state = await this.getDraft();
    const ids = new Set<string>();
    for (const content of [state.draft, state.published]) {
      for (const { ref } of picturesOf(content)) {
        const file = parseDemoRef(ref) ? null : await this.media.fileOf(ref, ['logo', 'banner']);
        if (file) ids.add(file.id);
      }
    }
    await this.db.tx.delete(storefrontMedia).where(eq(storefrontMedia.tenantId, shopId));
    if (ids.size > 0) {
      await this.db.tx
        .insert(storefrontMedia)
        .values([...ids].map((mediaId) => ({ tenantId: shopId, mediaId })));
    }
  }
}
