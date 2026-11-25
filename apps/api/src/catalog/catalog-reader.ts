import { Inject, Injectable } from '@nestjs/common';
import {
  CategorySchema,
  computedVariantPrice,
  OwnerItemSchema,
  OwnerOptionGroupSchema,
  OwnerVariantTemplateSchema,
  type Availability,
  type Category,
  type OwnerItem,
  type OwnerOptionGroup,
  type OwnerVariantTemplate,
  type VariantAxis,
} from '@smartapp/core';
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { Db } from '../db/db.service.js';
import {
  categories,
  itemAxes,
  itemAxisValues,
  itemOptionGroups,
  itemPairings,
  itemPhotos,
  items,
  itemVariants,
  itemVariantValues,
  mediaFiles,
  optionGroups,
  options,
  orderLines,
  variantTemplates,
  variantTemplateValues,
} from '../db/generated/schema.js';
import { MediaService } from '../media/media.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids in the database are uuids; anything else is simply not there (X3, rule 12). */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}

function iso(value: string | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

/**
 * "Sold out today" turns back on by itself (phase 4 task 4): past its time it reads as available, with no
 * job needed. The row keeps its old values until the next save.
 */
export function readAvailability(
  availability: string,
  soldOutUntil: string | null,
  now: number,
): { availability: Availability; soldOutUntil: string | null } {
  if (availability === 'sold_out_today') {
    if (soldOutUntil && new Date(soldOutUntil).getTime() <= now) {
      return { availability: 'available', soldOutUntil: null };
    }
    return { availability, soldOutUntil: iso(soldOutUntil) };
  }
  return { availability: availability === 'sold_out' ? 'sold_out' : 'available', soldOutUntil: null };
}

function groupBy<T, K>(rows: readonly T[], key: (row: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = out.get(k);
    if (list) list.push(row);
    else out.set(k, [row]);
  }
  return out;
}

/**
 * Reads the shop's menu (api.md "Catalog (owner)"). `listItems` reads every catalog table once for the shop
 * (about 9 queries for any number of items, never one per item) and builds OwnerItem[] in memory. Every
 * query runs in the request's transaction, so RLS keeps it to the caller's shop; the tenant filter is there
 * for the indexes.
 */
@Injectable()
export class CatalogReader {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  async listCategories(): Promise<Category[]> {
    const rows = await this.db.tx
      .select({
        id: categories.id,
        name: categories.name,
        icon: categories.icon,
        sort: categories.sort,
        bucket: mediaFiles.bucket,
        path: mediaFiles.path,
      })
      .from(categories)
      .leftJoin(mediaFiles, eq(mediaFiles.id, categories.iconMediaId))
      .where(eq(categories.tenantId, this.db.shopId))
      .orderBy(asc(categories.sort), asc(categories.createdAt));
    return rows.map((row, i) =>
      CategorySchema.parse({
        id: row.id,
        name: row.name,
        icon: this.iconOf(row.icon, row.bucket, row.path),
        // The list's own order: a gap left by a removed category never shows.
        sort: i,
      }),
    );
  }

  async listItems(only?: readonly string[]): Promise<OwnerItem[]> {
    const shopId = this.db.shopId;
    const tx = this.db.tx;
    const ids = only?.filter(isUuid);
    if (only && (!ids || ids.length === 0)) return [];
    const itemRows = await tx
      .select()
      .from(items)
      .where(
        ids ? and(eq(items.tenantId, shopId), inArray(items.id, ids)) : eq(items.tenantId, shopId),
      )
      .orderBy(asc(items.sort), asc(items.createdAt));
    if (itemRows.length === 0) return [];
    const itemIds = itemRows.map((i) => i.id);

    const photos = await tx
      .select({
        itemId: itemPhotos.itemId,
        bucket: mediaFiles.bucket,
        path: mediaFiles.path,
      })
      .from(itemPhotos)
      .innerJoin(mediaFiles, eq(mediaFiles.id, itemPhotos.mediaId))
      .where(and(eq(itemPhotos.tenantId, shopId), inArray(itemPhotos.itemId, itemIds)))
      .orderBy(asc(itemPhotos.itemId), asc(itemPhotos.sort));
    const axes = await tx
      .select()
      .from(itemAxes)
      .where(and(eq(itemAxes.tenantId, shopId), inArray(itemAxes.itemId, itemIds)))
      .orderBy(asc(itemAxes.itemId), asc(itemAxes.position));
    const axisIds = axes.map((a) => a.id);
    const values =
      axisIds.length === 0
        ? []
        : await tx
            .select({
              id: itemAxisValues.id,
              axisId: itemAxisValues.axisId,
              label: itemAxisValues.label,
              priceDelta: itemAxisValues.priceDelta,
              bucket: mediaFiles.bucket,
              path: mediaFiles.path,
            })
            .from(itemAxisValues)
            .leftJoin(mediaFiles, eq(mediaFiles.id, itemAxisValues.mediaId))
            .where(
              and(eq(itemAxisValues.tenantId, shopId), inArray(itemAxisValues.axisId, axisIds)),
            )
            .orderBy(asc(itemAxisValues.axisId), asc(itemAxisValues.sort));
    const variants = await tx
      .select()
      .from(itemVariants)
      .where(and(eq(itemVariants.tenantId, shopId), inArray(itemVariants.itemId, itemIds)))
      .orderBy(asc(itemVariants.itemId), asc(itemVariants.sort));
    const variantValues =
      axisIds.length === 0
        ? []
        : await tx
            .select({
              variantId: itemVariantValues.variantId,
              valueId: itemVariantValues.axisValueId,
            })
            .from(itemVariantValues)
            .where(
              and(
                eq(itemVariantValues.tenantId, shopId),
                inArray(
                  itemVariantValues.variantId,
                  variants.map((v) => v.id),
                ),
              ),
            );
    const groups = await tx
      .select({ itemId: itemOptionGroups.itemId, groupId: itemOptionGroups.groupId })
      .from(itemOptionGroups)
      .where(and(eq(itemOptionGroups.tenantId, shopId), inArray(itemOptionGroups.itemId, itemIds)))
      .orderBy(asc(itemOptionGroups.itemId), asc(itemOptionGroups.sort));
    const pairings = await tx
      .select({ itemId: itemPairings.itemId, pairedId: itemPairings.pairedItemId })
      .from(itemPairings)
      .where(and(eq(itemPairings.tenantId, shopId), inArray(itemPairings.itemId, itemIds)))
      .orderBy(asc(itemPairings.itemId), asc(itemPairings.sort));
    const ordered = await tx
      .selectDistinct({ itemId: orderLines.itemId })
      .from(orderLines)
      .where(and(eq(orderLines.tenantId, shopId), inArray(orderLines.itemId, itemIds)));

    const photosOf = groupBy(photos, (p) => p.itemId);
    const axesOf = groupBy(axes, (a) => a.itemId);
    const valuesOf = groupBy(values, (v) => v.axisId);
    const variantsOf = groupBy(variants, (v) => v.itemId);
    const valuesOfVariant = groupBy(variantValues, (v) => v.variantId);
    const groupsOf = groupBy(groups, (g) => g.itemId);
    const pairingsOf = groupBy(pairings, (p) => p.itemId);
    const hasOrders = new Set(ordered.map((o) => o.itemId));
    const now = Date.now();

    return itemRows.map((item) => {
      const itemAxesRows = axesOf.get(item.id) ?? [];
      // Value id -> (axis position, label), to turn a variant's stored values back into names.
      const valueAt = new Map<string, { position: number; label: string }>();
      const axesOut: VariantAxis[] = itemAxesRows.map((axis) => {
        const vals = valuesOf.get(axis.id) ?? [];
        for (const v of vals) valueAt.set(v.id, { position: axis.position, label: v.label });
        return {
          name: axis.name,
          templateId: axis.templateId,
          values: vals.map((v) => ({
            name: v.label,
            priceDelta: v.priceDelta,
            photo: v.bucket && v.path ? this.media.refFor(v.bucket, v.path) : null,
          })),
        };
      });
      const variantsOut = (variantsOf.get(item.id) ?? []).map((variant) => {
        const names: string[] = new Array<string>(itemAxesRows.length).fill('');
        for (const link of valuesOfVariant.get(variant.id) ?? []) {
          const at = valueAt.get(link.valueId);
          if (at) names[itemAxesRows.findIndex((a) => a.position === at.position)] = at.label;
        }
        const state = readAvailability(variant.availability, variant.soldOutUntil, now);
        return {
          id: variant.id,
          values: names,
          price: computedVariantPrice(item.basePrice, axesOut, {
            values: names,
            priceOverride: variant.priceOverride,
          }),
          priceOverride: variant.priceOverride,
          availability: state.availability,
          soldOutUntil: state.soldOutUntil,
        };
      });
      return OwnerItemSchema.parse({
        id: item.id,
        categoryId: item.categoryId,
        name: item.name,
        description: item.description,
        photos: (photosOf.get(item.id) ?? []).flatMap((p) => {
          const ref = this.media.refFor(p.bucket, p.path);
          return ref ? [ref] : [];
        }),
        basePrice: item.basePrice,
        axes: axesOut,
        variants: variantsOut,
        optionGroupIds: (groupsOf.get(item.id) ?? []).map((g) => g.groupId),
        pairingIds: (pairingsOf.get(item.id) ?? []).map((p) => p.pairedId),
        featured: item.featured,
        isNew: item.isNew,
        status: item.status,
        noticeDays: item.noticeDays,
        dailyLimit: item.dailyLimit,
        sample: item.isSample,
        hasOrders: hasOrders.has(item.id),
      });
    });
  }

  async item(id: string): Promise<OwnerItem | null> {
    const [found] = await this.listItems([id]);
    return found ?? null;
  }

  async listOptionGroups(only?: readonly string[]): Promise<OwnerOptionGroup[]> {
    const shopId = this.db.shopId;
    const tx = this.db.tx;
    const ids = only?.filter(isUuid);
    if (only && (!ids || ids.length === 0)) return [];
    const groupRows = await tx
      .select()
      .from(optionGroups)
      .where(
        ids
          ? and(eq(optionGroups.tenantId, shopId), inArray(optionGroups.id, ids))
          : eq(optionGroups.tenantId, shopId),
      )
      .orderBy(asc(optionGroups.createdAt));
    if (groupRows.length === 0) return [];
    const groupIds = groupRows.map((g) => g.id);
    const optionRows = await tx
      .select()
      .from(options)
      .where(and(eq(options.tenantId, shopId), inArray(options.groupId, groupIds)))
      .orderBy(asc(options.groupId), asc(options.sort));
    const usage = await tx
      .select({ groupId: itemOptionGroups.groupId, n: sql<number>`count(*)::int` })
      .from(itemOptionGroups)
      .where(and(eq(itemOptionGroups.tenantId, shopId), inArray(itemOptionGroups.groupId, groupIds)))
      .groupBy(itemOptionGroups.groupId);
    const optionsOf = groupBy(optionRows, (o) => o.groupId);
    const usedBy = new Map(usage.map((u) => [u.groupId, Number(u.n)]));
    return groupRows.map((g) =>
      OwnerOptionGroupSchema.parse({
        id: g.id,
        name: g.name,
        min: g.minPick,
        max: g.maxPick,
        options: (optionsOf.get(g.id) ?? []).map((o) => ({
          id: o.id,
          name: o.name,
          priceDelta: o.priceDelta,
          isDefault: o.isDefault,
          soldOut: o.soldOut,
        })),
        usedBy: usedBy.get(g.id) ?? 0,
      }),
    );
  }

  async listTemplates(only?: readonly string[]): Promise<OwnerVariantTemplate[]> {
    const shopId = this.db.shopId;
    const tx = this.db.tx;
    const ids = only?.filter(isUuid);
    if (only && (!ids || ids.length === 0)) return [];
    const rows = await tx
      .select()
      .from(variantTemplates)
      .where(
        ids
          ? and(eq(variantTemplates.tenantId, shopId), inArray(variantTemplates.id, ids))
          : eq(variantTemplates.tenantId, shopId),
      )
      .orderBy(asc(variantTemplates.createdAt), asc(variantTemplates.id));
    if (rows.length === 0) return [];
    const templateIds = rows.map((t) => t.id);
    const valueRows = await tx
      .select()
      .from(variantTemplateValues)
      .where(
        and(
          eq(variantTemplateValues.tenantId, shopId),
          inArray(variantTemplateValues.templateId, templateIds),
        ),
      )
      .orderBy(asc(variantTemplateValues.templateId), asc(variantTemplateValues.sort));
    // usedBy counts the items that link it; archived items do not count (as the sample data does).
    const usage = await tx
      .select({ templateId: itemAxes.templateId, n: sql<number>`count(distinct ${items.id})::int` })
      .from(itemAxes)
      .innerJoin(items, eq(items.id, itemAxes.itemId))
      .where(
        and(
          eq(itemAxes.tenantId, shopId),
          isNotNull(itemAxes.templateId),
          inArray(itemAxes.templateId, templateIds),
          sql`${items.status} <> 'archived'`,
        ),
      )
      .groupBy(itemAxes.templateId);
    const valuesOf = groupBy(valueRows, (v) => v.templateId);
    const usedBy = new Map(usage.map((u) => [u.templateId, Number(u.n)]));
    return rows.map((t) =>
      OwnerVariantTemplateSchema.parse({
        id: t.id,
        name: t.name,
        options: (valuesOf.get(t.id) ?? []).map((v) => ({ id: v.id, name: v.label })),
        sample: t.isSample,
        usedBy: usedBy.get(t.id) ?? 0,
      }),
    );
  }

  private iconOf(icon: unknown, bucket: string | null, path: string | null): unknown {
    // An image icon keeps only its kind in the row; the address comes from the file (it never goes stale).
    const ref = bucket && path ? this.media.refFor(bucket, path) : null;
    return ref ? { kind: 'image', ref } : icon;
  }
}
