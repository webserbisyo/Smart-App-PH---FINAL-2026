import { readFile } from 'node:fs/promises';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  imageUrl,
  parseDemoRef,
  SHOP_PACKS,
  StorefrontContentSchema,
  type CategoryIcon,
  type ItemDraft,
  type PublicShop,
  type StampCardSettings,
} from '@smartapp/core';
import { sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { notFound } from '../common/api-failure.js';
import { CatalogReader } from '../catalog/catalog-reader.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { Db } from '../db/db.service.js';
import { MediaService } from '../media/media.service.js';
import { OwnerMembersService } from '../members/owner-members.service.js';
import { StorefrontCache } from '../public/pages-cache.service.js';
import { OFF_CARD, ShopReader } from '../public/shop-reader.js';
import { mapLimit } from '../push/push-delivery.service.js';

// The photo size a menu shows (the 640 px WebP of each sample).
const PHOTO_WIDTH = 640;
const FETCH_TIMEOUT_MS = 10_000;
// The sample photos sit in the storefront's public folder: next to this file in the repository, or on the
// storefront's own address.
const LOCAL_PUBLIC = new URL('../../../storefront/public', import.meta.url);

const IdsSchema = z.array(z.object({ id: z.string() }));

const uniq = <T>(values: readonly T[]): T[] => [...new Set(values)];
const uuidList = (ids: readonly string[]) => `{${ids.join(',')}}`;

/**
 * "Start with samples" and "Clear samples" (api.md "Samples (owner)", T117, X2, X4, Q14). A pack's menu is
 * written through the same rules as the owner's own saves, its photos are copied into the shop's own menu
 * folder (counted in storage), and every item and variant it adds is marked sample. The look takes the
 * pack's banners (sample pictures, nothing stored) with the shop's own brand colour; the card takes the
 * pack's rule and prize.
 */
@Injectable()
export class SamplesService {
  private readonly logger = new Logger('Samples');
  private readonly storefrontUrl: string | undefined;

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(CatalogReader) private readonly reader: CatalogReader,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(OwnerMembersService) private readonly members: OwnerMembersService,
    @Inject(ShopReader) private readonly shops: ShopReader,
    @Inject(StorefrontCache) private readonly pages: StorefrontCache,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.storefrontUrl = config.get<string>('STOREFRONT_URL')?.replace(/\/+$/, '');
  }

  async apply(packSlug: string): Promise<PublicShop> {
    const pack = Object.entries(SHOP_PACKS).find(([slug]) => slug === packSlug)?.[1];
    if (!pack) throw notFound();
    await this.lock();
    // A second tap (or another phone) gets the samples once.
    if ((await this.sampleItemIds()).length > 0) return this.shops.read('published');
    const { categories, optionGroups, variantTemplates, items } = pack.catalog;

    // 1. Photos: copied into the shop's menu folder; one that cannot be read is left out.
    const refs = uniq([
      ...items.flatMap((i) => i.photos),
      ...items.flatMap((i) => i.axes.flatMap((a) => a.values.flatMap((v) => v.photo ?? []))),
      ...(pack.storefront.stampCard.reward.image ? [pack.storefront.stampCard.reward.image] : []),
    ]);
    const bodies = await mapLimit(refs, 4, (ref) => this.readPhoto(ref));
    const photos = new Map<string, string>();
    for (const [i, ref] of refs.entries()) {
      const body = bodies[i];
      if (!body) continue;
      const file = await this.media.storeSamplePhoto(body, 'image/webp');
      photos.set(ref, this.media.refOf('menu', file.path));
    }
    if (photos.size < refs.length) {
      this.logger.warn(`Sample photos: ${refs.length - photos.size} of ${refs.length} not found`);
    }
    const photo = (ref: string | null) => (ref ? (photos.get(ref) ?? null) : null);

    // 2. Variants: the shop's own one of the same name and options is used; otherwise a sample one.
    const own = await this.reader.listTemplates();
    const templates = new Map<string, string>();
    const madeTemplates: string[] = [];
    for (const t of variantTemplates) {
      const same = own.find(
        (o) =>
          o.name === t.name &&
          o.options.length === t.options.length &&
          o.options.every((opt, i) => opt.name === t.options[i]?.name),
      );
      if (same) {
        templates.set(t.id, same.id);
        continue;
      }
      const saved = await this.catalog.saveVariantTemplate(null, {
        draft: { name: t.name, options: t.options.map((o) => ({ name: o.name })) },
        applyToItems: false,
      });
      templates.set(t.id, saved.template.id);
      madeTemplates.push(saved.template.id);
    }
    if (madeTemplates.length > 0) {
      await this.db.tx.execute(sql`
        update public.variant_templates set is_sample = true
        where tenant_id = ${this.db.shopId} and id = any(${uuidList(madeTemplates)}::uuid[])`);
    }

    // 3. Categories and add-ons, in the pack's order.
    const cats = new Map<string, string>();
    for (const c of [...categories].sort((a, b) => a.sort - b.sort)) {
      // A pack's category picture would be a sample file: its icon stays a plain one.
      const icon: CategoryIcon =
        c.icon.kind === 'image' ? { kind: 'fluent', key: 'tag', style: 'flat' } : c.icon;
      const saved = await this.catalog.saveCategory(null, { name: c.name, icon });
      cats.set(c.id, saved.id);
    }
    const groups = new Map<string, string>();
    for (const g of optionGroups) {
      const saved = await this.catalog.saveOptionGroup(null, {
        name: g.name,
        min: g.min,
        max: g.max,
        options: g.options.map((o) => ({
          name: o.name,
          priceDelta: o.priceDelta,
          isDefault: o.isDefault,
          soldOut: o.soldOut,
        })),
      });
      groups.set(g.id, saved.id);
    }

    // 4. Items, then their pairings once every item has its new id.
    const madeItems = new Map<string, string>();
    const variants = new Map<string, string>();
    for (const item of items) {
      const categoryId = cats.get(item.categoryId);
      if (!categoryId) continue;
      const draft: ItemDraft = {
        categoryId,
        name: item.name,
        description: item.description,
        photos: item.photos.flatMap((ref) => photo(ref) ?? []),
        basePrice: item.basePrice,
        axes: item.axes.map((a) => ({
          name: a.name,
          templateId: a.templateId ? (templates.get(a.templateId) ?? null) : null,
          values: a.values.map((v) => ({ ...v, photo: photo(v.photo) })),
        })),
        variants: item.variants,
        optionGroupIds: item.optionGroupIds.flatMap((id) => groups.get(id) ?? []),
        pairingIds: [],
        featured: item.featured,
        isNew: item.isNew,
        status: item.status,
        noticeDays: item.noticeDays,
        dailyLimit: item.dailyLimit,
      };
      const saved = await this.catalog.saveItem(null, draft);
      madeItems.set(item.id, saved.id);
      for (const v of item.variants) {
        const match = saved.variants.find(
          (s) => s.values.join('\u0000') === v.values.join('\u0000'),
        );
        if (match) variants.set(v.id, match.id);
      }
    }
    const shopId = this.db.shopId;
    if (madeItems.size > 0) {
      await this.db.tx.execute(sql`
        update public.items set is_sample = true
        where tenant_id = ${shopId} and id = any(${uuidList([...madeItems.values()])}::uuid[])`);
    }
    const pairs = items.flatMap((item) => {
      const from = madeItems.get(item.id);
      return from
        ? item.pairingIds.flatMap((id) => {
            const to = madeItems.get(id);
            return to && to !== from ? [{ from, to }] : [];
          })
        : [];
    });
    for (const [sort, pair] of pairs.entries()) {
      const place = pairs.slice(0, sort).filter((p) => p.from === pair.from).length;
      if (place > 3) continue;
      await this.db.tx.execute(sql`
        insert into public.item_pairings (tenant_id, item_id, paired_item_id, sort)
        values (${shopId}::uuid, ${pair.from}::uuid, ${pair.to}::uuid, ${place})
        on conflict do nothing`);
    }

    // 5. The look: the pack's, with the shop's own brand colour (draft and live, as the Editor shows them).
    await this.setLook((current) => ({
      ...current,
      look: { ...pack.storefront.look, brandColor: current.look.brandColor },
    }));

    // 6. The stamp card: the pack's rule and prize, pointing at the new items.
    const card = pack.storefront.stampCard;
    const reward = card.reward;
    const next: StampCardSettings = {
      ...card,
      reward: {
        ...reward,
        itemId: reward.itemId ? (madeItems.get(reward.itemId) ?? null) : null,
        variantId: reward.variantId ? (variants.get(reward.variantId) ?? null) : null,
        image: photo(reward.image),
      },
    };
    await this.members.saveStampCard(
      next.reward.kind === 'free_item' && (!next.reward.itemId || !next.reward.variantId)
        ? { ...next, status: 'off', reward: OFF_CARD.reward }
        : next,
    );
    await this.pages.shopChanged();
    return this.shops.read('published');
  }

  /**
   * Removes the samples: sample items (an ordered one is archived instead, as Delete forever would refuse
   * it), the categories, add-ons and variants they leave empty, their photos, the sample banners and logo,
   * and the stamp card goes off.
   */
  async clear(): Promise<PublicShop> {
    await this.lock();
    const shopId = this.db.shopId;
    const sample = await this.sampleItemIds();
    const card = await this.shops.stampCard();
    const prizeGoes =
      card.reward.kind === 'free_item' &&
      card.reward.itemId !== null &&
      sample.includes(card.reward.itemId);
    if (prizeGoes) {
      await this.members.saveStampCard({ status: 'off', rule: card.rule, reward: OFF_CARD.reward });
    } else if (card.status !== 'off') {
      await this.members.setStampCardStatus('off');
    }
    if (sample.length > 0) {
      const ids = uuidList(sample);
      const ofItems = async (query: SQL) =>
        IdsSchema.parse((await this.db.tx.execute(query)).rows).map((r) => r.id);
      const photoIds = await ofItems(sql`
        select media_id as id from public.item_photos where tenant_id = ${shopId} and item_id = any(${ids}::uuid[])
        union
        select v.media_id from public.item_axis_values v
          join public.item_axes a on a.id = v.axis_id
          where v.tenant_id = ${shopId} and a.item_id = any(${ids}::uuid[]) and v.media_id is not null`);
      const categoryIds = await ofItems(sql`
        select distinct category_id as id from public.items
        where tenant_id = ${shopId} and id = any(${ids}::uuid[])`);
      const groupIds = await ofItems(sql`
        select distinct group_id as id from public.item_option_groups
        where tenant_id = ${shopId} and item_id = any(${ids}::uuid[])`);
      const ordered = await ofItems(sql`
        select distinct item_id as id from public.order_lines
        where tenant_id = ${shopId} and item_id = any(${ids}::uuid[])`);
      await this.db.tx.execute(sql`
        delete from public.items
        where tenant_id = ${shopId} and id = any(${ids}::uuid[])
          and not (id = any(${uuidList(ordered)}::uuid[]))`);
      if (ordered.length > 0) {
        await this.db.tx.execute(sql`
          update public.items set status = 'archived', featured = false, updated_at = now()
          where tenant_id = ${shopId} and id = any(${uuidList(ordered)}::uuid[])`);
      }
      await this.db.tx.execute(sql`
        delete from public.categories c
        where c.tenant_id = ${shopId} and c.id = any(${uuidList(categoryIds)}::uuid[])
          and not exists (select 1 from public.items i where i.tenant_id = c.tenant_id and i.category_id = c.id)`);
      await this.db.tx.execute(sql`
        delete from public.option_groups g
        where g.tenant_id = ${shopId} and g.id = any(${uuidList(groupIds)}::uuid[])
          and not exists (select 1 from public.item_option_groups l where l.tenant_id = g.tenant_id and l.group_id = g.id)`);
      // Photos only the removed items used go now (an archived item keeps its own).
      const gone = await this.db.tx.execute(sql`
        select m.id, m.bucket, m.path from public.media_files m
        where m.tenant_id = ${shopId} and m.id = any(${uuidList(photoIds)}::uuid[]) and m.deleted_at is null
          and not exists (select 1 from public.item_photos p where p.media_id = m.id)
          and not exists (select 1 from public.item_axis_values v where v.media_id = m.id)
          and not exists (select 1 from public.stamp_cards s where s.reward_media_id = m.id)`);
      await this.media.deleteFiles(
        z
          .array(z.object({ id: z.string(), bucket: z.string(), path: z.string() }))
          .parse(gone.rows),
      );
    }
    await this.db.tx.execute(sql`
      delete from public.variant_templates t
      where t.tenant_id = ${shopId} and t.is_sample
        and not exists (select 1 from public.item_axes a where a.tenant_id = t.tenant_id and a.template_id = t.id)`);
    // Sample pictures go from the look; the owner's own uploads stay.
    await this.setLook((current) => ({
      ...current,
      logo: current.logo && parseDemoRef(current.logo) ? null : current.logo,
      look: {
        ...current.look,
        banners: current.look.banners.filter((b) => !parseDemoRef(b.ref)),
        announcement: null,
      },
    }));
    await this.pages.shopChanged();
    return this.shops.read('published');
  }

  /** One samples change at a time per shop. */
  private async lock(): Promise<void> {
    await this.db.tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`samples:${this.db.shopId}`}))`,
    );
  }

  private async sampleItemIds(): Promise<string[]> {
    const result = await this.db.tx.execute(sql`
      select id from public.items where tenant_id = ${this.db.shopId} and is_sample`);
    return IdsSchema.parse(result.rows).map((r) => r.id);
  }

  /** The draft and the live page both change; other phones holding the old draft get draft_conflict. */
  private async setLook(
    change: (
      content: z.infer<typeof StorefrontContentSchema>,
    ) => z.infer<typeof StorefrontContentSchema>,
  ): Promise<void> {
    const row = z.object({ draft: z.unknown(), published: z.unknown() }).safeParse(
      (
        await this.db.tx.execute(sql`
            select draft, published from public.storefront_content
            where tenant_id = ${this.db.shopId} for update`)
      ).rows[0],
    );
    if (!row.success) return;
    const draft = StorefrontContentSchema.parse(
      change(StorefrontContentSchema.parse(row.data.draft)),
    );
    const published = StorefrontContentSchema.parse(
      change(StorefrontContentSchema.parse(row.data.published)),
    );
    await this.db.tx.execute(sql`
      update public.storefront_content
      set draft = ${JSON.stringify(draft)}::jsonb, published = ${JSON.stringify(published)}::jsonb,
        draft_version = draft_version + 1, published_version = published_version + 1,
        saved_at = now(), published_at = now(), updated_at = now()
      where tenant_id = ${this.db.shopId}`);
  }

  /** A sample photo's bytes: from the repository's storefront folder, else from the storefront's address. */
  private async readPhoto(ref: string): Promise<Buffer | null> {
    const path = parseDemoRef(ref) ? imageUrl(ref, PHOTO_WIDTH) : null;
    if (!path) return null;
    try {
      return await readFile(new URL(`${LOCAL_PUBLIC.href}${path}`));
    } catch {
      // Not in this deploy: the storefront serves the same file.
    }
    if (!this.storefrontUrl) return null;
    try {
      const res = await fetch(`${this.storefrontUrl}${path}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    } catch {
      return null;
    }
  }
}
