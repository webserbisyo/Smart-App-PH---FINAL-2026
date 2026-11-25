import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  addDays,
  applyTemplateToItem,
  buildVersions,
  HoursSettingsSchema,
  isInSync,
  manilaDate,
  manilaToDate,
  nextOpening,
  VARIANT_LIMITS,
  type Availability,
  type BulkItemsInput,
  type BulkItemsResult,
  type Category,
  type CategoryDraft,
  type ItemDraft,
  type ItemStatus,
  type OptionGroupDraft,
  type OwnerItem,
  type OwnerOptionGroup,
  type RemoveVariantTemplateResult,
  type SaveVariantTemplateInput,
  type SaveVariantTemplateResult,
  type SortOrderInput,
  type Variant,
} from '@smartapp/core';
import { and, count, eq, gte, inArray, notInArray, sql } from 'drizzle-orm';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import {
  categories,
  closures,
  itemAxes,
  itemAxisValues,
  itemOptionGroups,
  itemPairings,
  itemPhotos,
  items,
  itemVariants,
  itemVariantValues,
  openingHours,
  optionGroups,
  options,
  orderLines,
  stampCards,
  variantTemplates,
  variantTemplateValues,
} from '../db/generated/schema.js';
import { MediaService } from '../media/media.service.js';
import { StorefrontCache } from '../public/pages-cache.service.js';
import { CatalogReader, isUuid } from './catalog-reader.js';

/** One field's problem, worded on the screen from the code (rule 7). */
function fieldError(field: string, problem = 'invalid'): ApiFailure {
  return new ApiFailure('invalid_input', 400, { [field]: [problem] });
}

function uniq<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

/** The text form of a uuid list for `unnest(...::uuid[])` (every id was checked as a uuid first). */
function uuidArray(ids: readonly string[]): string {
  return `{${ids.join(',')}}`;
}

interface Reward {
  itemId: string | null;
  variantId: string | null;
}

/**
 * The owner's Menu (api.md "Catalog (owner)", launch phase 4, T117). Every write runs in the request's one
 * transaction, so a save lands whole or not at all; RLS keeps every row to the caller's shop and each id from
 * the browser is checked to be the shop's own before it is used. After a change the storefront is told to
 * read the shop's pages again (R8).
 */
@Injectable()
export class CatalogService {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(CatalogReader) private readonly reader: CatalogReader,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(StorefrontCache) private readonly storefront: StorefrontCache,
  ) {}

  // ---------- categories ----------

  async saveCategory(id: string | null, draft: CategoryDraft): Promise<Category> {
    const shopId = this.db.shopId;
    const tx = this.db.tx;
    let iconMediaId: string | null = null;
    let icon: unknown = draft.icon;
    if (draft.icon.kind === 'image') {
      const file = await this.media.fileOf(draft.icon.ref, ['category']);
      if (!file) throw fieldError('icon');
      iconMediaId = file.id;
      // The address comes from the file when read, so only the kind is kept.
      icon = { kind: 'image' };
    }
    let categoryId = id;
    if (categoryId) {
      if (!isUuid(categoryId)) throw notFound();
      const updated = await tx
        .update(categories)
        .set({ name: draft.name, icon, iconMediaId })
        .where(and(eq(categories.tenantId, shopId), eq(categories.id, categoryId)))
        .returning({ id: categories.id });
      if (updated.length === 0) throw notFound();
    } else {
      categoryId = randomUUID();
      const sort = await this.nextSort('categories');
      await tx
        .insert(categories)
        .values({ id: categoryId, tenantId: shopId, name: draft.name, icon, iconMediaId, sort });
    }
    await this.storefront.shopChanged();
    const saved = (await this.reader.listCategories()).find((c) => c.id === categoryId);
    if (!saved) throw notFound();
    return saved;
  }

  async removeCategory(id: string): Promise<void> {
    if (!isUuid(id)) throw notFound();
    const shopId = this.db.shopId;
    const [used] = await this.db.tx
      .select({ n: count() })
      .from(items)
      .where(and(eq(items.tenantId, shopId), eq(items.categoryId, id)));
    // Archived items count too: they still belong to the category (the owner moves them first).
    if ((used?.n ?? 0) > 0) throw new ApiFailure('category_not_empty', 400);
    const gone = await this.db.tx
      .delete(categories)
      .where(and(eq(categories.tenantId, shopId), eq(categories.id, id)))
      .returning({ id: categories.id });
    if (gone.length === 0) throw notFound();
    await this.storefront.shopChanged();
  }

  // ---------- items ----------

  async saveItem(id: string | null, draft: ItemDraft): Promise<OwnerItem> {
    if (id !== null && !isUuid(id)) throw notFound();
    const itemId = await this.writeItem(id, draft, { checkTemplates: true });
    await this.storefront.shopChanged();
    return this.itemOrNotFound(itemId);
  }

  /** Delete forever: only an item that was never ordered and is not the stamp card's prize (M10). */
  async removeItem(id: string): Promise<void> {
    if (!isUuid(id)) throw notFound();
    const shopId = this.db.shopId;
    const tx = this.db.tx;
    const [item] = await tx
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.tenantId, shopId), eq(items.id, id)))
      .for('update');
    if (!item) throw notFound();
    const [ordered] = await tx
      .select({ n: count() })
      .from(orderLines)
      .where(and(eq(orderLines.tenantId, shopId), eq(orderLines.itemId, id)));
    if ((ordered?.n ?? 0) > 0) throw new ApiFailure('item_has_orders', 400);
    const reward = await this.reward();
    if (reward.itemId === id) throw new ApiFailure('item_is_reward', 409);
    // Its photos are no longer used and leave with the nightly clean-up (or Storage › Files).
    await tx.delete(items).where(and(eq(items.tenantId, shopId), eq(items.id, id)));
    await this.storefront.shopChanged();
  }

  async setItemStatus(id: string, status: ItemStatus): Promise<OwnerItem> {
    if (!isUuid(id)) throw notFound();
    if (status !== 'active' && (await this.reward()).itemId === id) {
      throw new ApiFailure('item_is_reward', 409);
    }
    const updated = await this.db.tx
      .update(items)
      .set({ status, updatedAt: sql`now()` })
      .where(and(eq(items.tenantId, this.db.shopId), eq(items.id, id)))
      .returning({ id: items.id });
    if (updated.length === 0) throw notFound();
    await this.storefront.shopChanged();
    return this.itemOrNotFound(id);
  }

  async setSoldOut(
    variantId: string,
    availability: Availability,
    soldOutUntil: string | null,
  ): Promise<OwnerItem> {
    if (!isUuid(variantId)) throw notFound();
    const until = await this.untilFor(availability, soldOutUntil);
    const updated = await this.db.tx
      .update(itemVariants)
      .set({ availability, soldOutUntil: until })
      .where(and(eq(itemVariants.tenantId, this.db.shopId), eq(itemVariants.id, variantId)))
      .returning({ itemId: itemVariants.itemId });
    const row = updated[0];
    if (!row) throw notFound();
    await this.storefront.shopChanged();
    return this.itemOrNotFound(row.itemId);
  }

  /** Bulk actions (Q7): every id is checked first, then one change for all of them, or nothing. */
  async bulk(input: BulkItemsInput): Promise<BulkItemsResult> {
    const shopId = this.db.shopId;
    const tx = this.db.tx;
    if (input.action === 'soldOut') {
      const ids = uniq(input.variants.map((v) => v.variantId));
      if (!ids.every(isUuid)) throw notFound();
      const found = await tx
        .select({ id: itemVariants.id, itemId: itemVariants.itemId })
        .from(itemVariants)
        .where(and(eq(itemVariants.tenantId, shopId), inArray(itemVariants.id, ids)));
      if (found.length !== ids.length) throw notFound();
      // One update per distinct state: a typical bulk action is one or two statements.
      const byState = new Map<string, { availability: Availability; until: string | null; ids: string[] }>();
      for (const change of input.variants) {
        const until = await this.untilFor(change.availability, change.soldOutUntil ?? null);
        const key = `${change.availability}|${until ?? ''}`;
        const entry = byState.get(key);
        if (entry) entry.ids.push(change.variantId);
        else byState.set(key, { availability: change.availability, until, ids: [change.variantId] });
      }
      for (const state of byState.values()) {
        await tx
          .update(itemVariants)
          .set({ availability: state.availability, soldOutUntil: state.until })
          .where(and(eq(itemVariants.tenantId, shopId), inArray(itemVariants.id, uniq(state.ids))));
      }
      await this.storefront.shopChanged();
      return { count: new Set(found.map((f) => f.itemId)).size };
    }

    const ids = uniq(input.ids);
    if (!ids.every(isUuid)) throw notFound();
    const found = await tx
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.tenantId, shopId), inArray(items.id, ids)))
      .for('update');
    if (found.length !== ids.length) throw notFound();

    if (input.action === 'status') {
      const reward = await this.reward();
      if (input.status !== 'active' && reward.itemId && ids.includes(reward.itemId)) {
        throw new ApiFailure('item_is_reward', 409);
      }
      await tx
        .update(items)
        .set({ status: input.status, updatedAt: sql`now()` })
        .where(and(eq(items.tenantId, shopId), inArray(items.id, ids)));
    } else {
      if (!isUuid(input.categoryId) || !(await this.categoryExists(input.categoryId))) {
        throw notFound();
      }
      await tx
        .update(items)
        .set({ categoryId: input.categoryId, updatedAt: sql`now()` })
        .where(and(eq(items.tenantId, shopId), inArray(items.id, ids)));
    }
    await this.storefront.shopChanged();
    return { count: ids.length };
  }

  // ---------- add-ons ----------

  async saveOptionGroup(id: string | null, draft: OptionGroupDraft): Promise<OwnerOptionGroup> {
    const shopId = this.db.shopId;
    const tx = this.db.tx;
    let groupId = id;
    if (groupId) {
      if (!isUuid(groupId)) throw notFound();
      const updated = await tx
        .update(optionGroups)
        .set({ name: draft.name, minPick: draft.min, maxPick: draft.max })
        .where(and(eq(optionGroups.tenantId, shopId), eq(optionGroups.id, groupId)))
        .returning({ id: optionGroups.id });
      if (updated.length === 0) throw notFound();
    } else {
      groupId = randomUUID();
      await tx.insert(optionGroups).values({
        id: groupId,
        tenantId: shopId,
        name: draft.name,
        minPick: draft.min,
        maxPick: draft.max,
      });
    }
    // Same ids stay (orders and carts point at them); a removed add-on leaves ordered lines their words (X1).
    const existing = await tx
      .select({ id: options.id })
      .from(options)
      .where(and(eq(options.tenantId, shopId), eq(options.groupId, groupId)));
    const existingIds = new Set(existing.map((o) => o.id));
    const keptIds = draft.options.flatMap((o) => (o.id && existingIds.has(o.id) ? [o.id] : []));
    await tx
      .delete(options)
      .where(
        and(
          eq(options.tenantId, shopId),
          eq(options.groupId, groupId),
          ...(keptIds.length > 0 ? [notInArray(options.id, keptIds)] : []),
        ),
      );
    for (const [sort, option] of draft.options.entries()) {
      const fields = {
        name: option.name,
        priceDelta: option.priceDelta,
        isDefault: option.isDefault,
        soldOut: option.soldOut,
        sort,
      };
      if (option.id && existingIds.has(option.id)) {
        await tx
          .update(options)
          .set(fields)
          .where(and(eq(options.tenantId, shopId), eq(options.id, option.id)));
      } else {
        await tx.insert(options).values({ tenantId: shopId, groupId, ...fields });
      }
    }
    await this.storefront.shopChanged();
    const [saved] = await this.reader.listOptionGroups([groupId]);
    if (!saved) throw notFound();
    return saved;
  }

  async removeOptionGroup(id: string): Promise<void> {
    if (!isUuid(id)) throw notFound();
    // Its links to items go with it (cascade); ordered lines keep their words (X1).
    const gone = await this.db.tx
      .delete(optionGroups)
      .where(and(eq(optionGroups.tenantId, this.db.shopId), eq(optionGroups.id, id)))
      .returning({ id: optionGroups.id });
    if (gone.length === 0) throw notFound();
    await this.storefront.shopChanged();
  }

  // ---------- variant templates ----------

  async saveVariantTemplate(
    id: string | null,
    input: SaveVariantTemplateInput,
  ): Promise<SaveVariantTemplateResult> {
    const shopId = this.db.shopId;
    const tx = this.db.tx;
    const { draft, applyToItems } = input;
    const result: Omit<SaveVariantTemplateResult, 'template'> = {
      updatedItemIds: [],
      unlinkedItemIds: [],
      skippedItemIds: [],
      soldOutItemIds: [],
    };

    if (!id) {
      const [have] = await tx
        .select({ n: count() })
        .from(variantTemplates)
        .where(eq(variantTemplates.tenantId, shopId));
      if ((have?.n ?? 0) >= VARIANT_LIMITS.templates) throw fieldError('name', 'too_many');
      const templateId = randomUUID();
      await tx.insert(variantTemplates).values({ id: templateId, tenantId: shopId, name: draft.name });
      await this.writeTemplateOptions(templateId, draft.options, new Set());
      return { template: await this.templateOrNotFound(templateId), ...result };
    }

    if (!isUuid(id)) throw notFound();
    const [before] = await this.reader.listTemplates([id]);
    if (!before) throw notFound();
    await tx
      .update(variantTemplates)
      .set({ name: draft.name })
      .where(and(eq(variantTemplates.tenantId, shopId), eq(variantTemplates.id, id)));
    const existingIds = new Set(before.options.map((o) => o.id));
    await this.writeTemplateOptions(id, draft.options, existingIds);

    // The items that link it follow the mock's rules (applyTemplateToItem): renamed options keep their sizes,
    // removed ones retire theirs, and "keep" unlinks an item that would fall out of step.
    const linked = await tx
      .selectDistinct({ itemId: itemAxes.itemId })
      .from(itemAxes)
      .where(and(eq(itemAxes.tenantId, shopId), eq(itemAxes.templateId, id)));
    const after = { id, name: draft.name, options: draft.options };
    for (const item of await this.reader.listItems(linked.map((l) => l.itemId))) {
      const applied = applyTemplateToItem(item, before, after, applyToItems ? 'update' : 'keep');
      if (applied.outcome === 'unchanged') continue;
      if (applied.outcome === 'updated') result.updatedItemIds.push(item.id);
      if (applied.outcome === 'unlinked') result.unlinkedItemIds.push(item.id);
      if (applied.outcome === 'skipped') result.skippedItemIds.push(item.id);
      if (applied.soldOut) result.soldOutItemIds.push(item.id);
      // The prize rule still holds: a removed prize size stops the whole save (variant_is_reward).
      await this.writeItem(item.id, applied.item, { checkTemplates: false });
    }
    if (linked.length > 0) await this.storefront.shopChanged();
    return { template: await this.templateOrNotFound(id), ...result };
  }

  async removeVariantTemplate(id: string): Promise<RemoveVariantTemplateResult> {
    if (!isUuid(id)) throw notFound();
    const shopId = this.db.shopId;
    const linked = await this.db.tx
      .selectDistinct({ itemId: itemAxes.itemId })
      .from(itemAxes)
      .where(and(eq(itemAxes.tenantId, shopId), eq(itemAxes.templateId, id)));
    // Linked choices keep their options and price changes as the item's own (the key sets template_id null).
    const gone = await this.db.tx
      .delete(variantTemplates)
      .where(and(eq(variantTemplates.tenantId, shopId), eq(variantTemplates.id, id)))
      .returning({ id: variantTemplates.id });
    if (gone.length === 0) throw notFound();
    return { unlinkedItemIds: linked.map((l) => l.itemId) };
  }

  // ---------- order on screen ----------

  /** The whole list in one statement: the ids sent first, in that order, then the rest as they were. */
  async saveSortOrder(input: SortOrderInput): Promise<void> {
    if (input.kind === 'option') return;
    const shopId = this.db.shopId;
    const table = input.kind === 'category' ? categories : items;
    const rows = await this.db.tx
      .select({ id: table.id })
      .from(table)
      .where(eq(table.tenantId, shopId))
      .orderBy(table.sort, table.createdAt);
    const known = new Set(rows.map((r) => r.id));
    const listed = uniq(input.ids.filter((id) => known.has(id)));
    const listedSet = new Set(listed);
    const order = [...listed, ...rows.map((r) => r.id).filter((id) => !listedSet.has(id))];
    if (order.length === 0) return;
    const name = input.kind === 'category' ? sql`public.categories` : sql`public.items`;
    await this.db.tx.execute(sql`
      update ${name} as t set sort = o.idx - 1
        from unnest(${uuidArray(order)}::uuid[]) with ordinality as o(id, idx)
        where t.id = o.id and t.tenant_id = ${shopId}`);
    await this.storefront.shopChanged();
  }

  // ---------- the item writer ----------

  /**
   * Writes a whole item (ItemDraft) and returns its id. Compared with what's stored by id: the item, its
   * sizes (variants) and add-on links keep their ids; choice rows and their values are written again (only
   * this item's sizes point at them); anything gone is removed (X1 keeps ordered lines' words).
   */
  private async writeItem(
    id: string | null,
    draft: ItemDraft,
    { checkTemplates }: { checkTemplates: boolean },
  ): Promise<string> {
    const shopId = this.db.shopId;
    const tx = this.db.tx;
    if (id) {
      const [row] = await tx
        .select({ id: items.id })
        .from(items)
        .where(and(eq(items.tenantId, shopId), eq(items.id, id)))
        .for('update');
      if (!row) throw notFound();
    }
    const itemId = id ?? randomUUID();

    // 1. Everything the draft points at must be the shop's own.
    if (!isUuid(draft.categoryId) || !(await this.categoryExists(draft.categoryId))) {
      throw fieldError('categoryId');
    }
    const photoIds: string[] = [];
    for (const [i, ref] of draft.photos.entries()) {
      const file = await this.media.fileOf(ref, ['item']);
      if (!file) throw fieldError(`photos.${i}`);
      photoIds.push(file.id);
    }
    const valuePhotoIds = new Map<string, string>();
    for (const [a, axis] of draft.axes.entries()) {
      for (const [v, value] of axis.values.entries()) {
        if (!value.photo) continue;
        const file = await this.media.fileOf(value.photo, ['item']);
        if (!file) throw fieldError(`axes.${a}.values.${v}.photo`);
        valuePhotoIds.set(`${a}:${value.name}`, file.id);
      }
    }
    const groupIds = uniq(draft.optionGroupIds);
    if (groupIds.length > 0) {
      if (!groupIds.every(isUuid)) throw fieldError('optionGroupIds');
      const found = await tx
        .select({ id: optionGroups.id })
        .from(optionGroups)
        .where(and(eq(optionGroups.tenantId, shopId), inArray(optionGroups.id, groupIds)));
      if (found.length !== groupIds.length) throw fieldError('optionGroupIds');
    }
    const pairingIds = uniq(draft.pairingIds);
    if (pairingIds.length > 0) {
      if (!pairingIds.every(isUuid) || pairingIds.includes(itemId)) throw fieldError('pairingIds');
      const found = await tx
        .select({ id: items.id })
        .from(items)
        .where(and(eq(items.tenantId, shopId), inArray(items.id, pairingIds)));
      if (found.length !== pairingIds.length) throw fieldError('pairingIds');
    }
    if (checkTemplates) {
      const templateIds = draft.axes.flatMap((a) => (a.templateId ? [a.templateId] : []));
      const templates = await this.reader.listTemplates(templateIds);
      for (const [a, axis] of draft.axes.entries()) {
        if (!axis.templateId) continue;
        const template = templates.find((t) => t.id === axis.templateId);
        if (!template || !isInSync(axis, template)) throw fieldError(`axes.${a}.templateId`);
      }
    }

    // 2. The server owns every price: base plus option changes, or the special price (the Zod rule).
    const priced: Variant[] = buildVersions(draft.axes, draft.variants, draft.basePrice);
    const existingVariants = id
      ? await tx
          .select({ id: itemVariants.id })
          .from(itemVariants)
          .where(and(eq(itemVariants.tenantId, shopId), eq(itemVariants.itemId, itemId)))
      : [];
    const existingIds = new Set(existingVariants.map((v) => v.id));
    const finalIds = priced.map((v) => (existingIds.has(v.id) ? v.id : randomUUID()));

    // 3. The prize (M10): the prize item stays shown and its prize size stays.
    const reward = await this.reward();
    if (id && reward.itemId === id) {
      if (reward.variantId && !finalIds.includes(reward.variantId)) {
        throw new ApiFailure('variant_is_reward', 400);
      }
      if (draft.status !== 'active') throw new ApiFailure('item_is_reward', 409);
    }

    // 4. The item row.
    const fields = {
      categoryId: draft.categoryId,
      name: draft.name,
      description: draft.description,
      basePrice: draft.basePrice,
      status: draft.status,
      featured: draft.featured,
      isNew: draft.isNew,
      noticeDays: draft.noticeDays,
      dailyLimit: draft.dailyLimit,
    };
    if (id) {
      await tx
        .update(items)
        .set({ ...fields, updatedAt: sql`now()` })
        .where(and(eq(items.tenantId, shopId), eq(items.id, id)));
    } else {
      const sort = await this.nextSort('items');
      await tx.insert(items).values({ id: itemId, tenantId: shopId, sort, ...fields });
    }

    // 5. Photos, cover first.
    await tx.delete(itemPhotos).where(and(eq(itemPhotos.tenantId, shopId), eq(itemPhotos.itemId, itemId)));
    if (photoIds.length > 0) {
      await tx.insert(itemPhotos).values(
        photoIds.map((mediaId, sort) => ({ tenantId: shopId, itemId, mediaId, sort, isCover: sort === 0 })),
      );
    }

    // 6. Choice rows and their values, written again; names map to the new value ids.
    await tx.delete(itemAxes).where(and(eq(itemAxes.tenantId, shopId), eq(itemAxes.itemId, itemId)));
    const valueIdAt: Map<string, string>[] = [];
    for (const [position, axis] of draft.axes.entries()) {
      const axisId = randomUUID();
      await tx.insert(itemAxes).values({
        id: axisId,
        tenantId: shopId,
        itemId,
        name: axis.name,
        templateId: axis.templateId && isUuid(axis.templateId) ? axis.templateId : null,
        position,
      });
      const ids = new Map<string, string>();
      const rows = axis.values.map((value, sort) => {
        const valueId = randomUUID();
        ids.set(value.name, valueId);
        return {
          id: valueId,
          tenantId: shopId,
          axisId,
          label: value.name,
          priceDelta: value.priceDelta,
          mediaId: valuePhotoIds.get(`${position}:${value.name}`) ?? null,
          sort,
        };
      });
      if (rows.length > 0) await tx.insert(itemAxisValues).values(rows);
      valueIdAt.push(ids);
    }

    // 7. Sizes: removed ones go first, then the kept ones change and the new ones arrive.
    const keep = finalIds.filter((v) => existingIds.has(v));
    await tx
      .delete(itemVariants)
      .where(
        and(
          eq(itemVariants.tenantId, shopId),
          eq(itemVariants.itemId, itemId),
          ...(keep.length > 0 ? [notInArray(itemVariants.id, keep)] : []),
        ),
      );
    const links: { tenantId: string; variantId: string; axisValueId: string }[] = [];
    for (const [sort, variant] of priced.entries()) {
      const variantId = finalIds[sort] ?? randomUUID();
      const valueIds = variant.values.map((name, position) => valueIdAt[position]?.get(name));
      const known = valueIds.filter((v): v is string => typeof v === 'string');
      if (known.length !== valueIds.length) throw fieldError('variants');
      const until = await this.untilFor(variant.availability, variant.soldOutUntil);
      const fieldsV = {
        comboKey: [...known].sort().join(','),
        priceOverride: variant.priceOverride,
        availability: variant.availability,
        soldOutUntil: until,
        sort,
      };
      if (existingIds.has(variantId)) {
        await tx
          .update(itemVariants)
          .set(fieldsV)
          .where(and(eq(itemVariants.tenantId, shopId), eq(itemVariants.id, variantId)));
      } else {
        await tx.insert(itemVariants).values({ id: variantId, tenantId: shopId, itemId, ...fieldsV });
      }
      for (const axisValueId of known) links.push({ tenantId: shopId, variantId, axisValueId });
    }
    if (links.length > 0) await tx.insert(itemVariantValues).values(links);

    // 8. Add-on questions and "Goes well with", in the draft's order.
    await tx
      .delete(itemOptionGroups)
      .where(and(eq(itemOptionGroups.tenantId, shopId), eq(itemOptionGroups.itemId, itemId)));
    if (groupIds.length > 0) {
      await tx
        .insert(itemOptionGroups)
        .values(groupIds.map((groupId, sort) => ({ tenantId: shopId, itemId, groupId, sort })));
    }
    await tx
      .delete(itemPairings)
      .where(and(eq(itemPairings.tenantId, shopId), eq(itemPairings.itemId, itemId)));
    if (pairingIds.length > 0) {
      await tx.insert(itemPairings).values(
        pairingIds.map((pairedItemId, sort) => ({ tenantId: shopId, itemId, pairedItemId, sort })),
      );
    }
    return itemId;
  }

  private async writeTemplateOptions(
    templateId: string,
    draftOptions: readonly { id?: string | undefined; name: string }[],
    existingIds: ReadonlySet<string>,
  ): Promise<void> {
    const shopId = this.db.shopId;
    const tx = this.db.tx;
    const kept = draftOptions.flatMap((o) => (o.id && existingIds.has(o.id) ? [o.id] : []));
    await tx
      .delete(variantTemplateValues)
      .where(
        and(
          eq(variantTemplateValues.tenantId, shopId),
          eq(variantTemplateValues.templateId, templateId),
          ...(kept.length > 0 ? [notInArray(variantTemplateValues.id, kept)] : []),
        ),
      );
    // Two options may swap names; a short-lived unique name first keeps the unique index happy.
    for (const optionId of kept) {
      await tx
        .update(variantTemplateValues)
        .set({ label: `~${randomUUID().slice(0, 12)}` })
        .where(eq(variantTemplateValues.id, optionId));
    }
    for (const [sort, option] of draftOptions.entries()) {
      if (option.id && existingIds.has(option.id)) {
        await tx
          .update(variantTemplateValues)
          .set({ label: option.name, sort })
          .where(eq(variantTemplateValues.id, option.id));
      } else {
        await tx
          .insert(variantTemplateValues)
          .values({ tenantId: shopId, templateId, label: option.name, sort });
      }
    }
  }

  // ---------- helpers ----------

  private async itemOrNotFound(id: string): Promise<OwnerItem> {
    const item = await this.reader.item(id);
    if (!item) throw notFound();
    return item;
  }

  private async templateOrNotFound(id: string) {
    const [template] = await this.reader.listTemplates([id]);
    if (!template) throw notFound();
    return template;
  }

  private async categoryExists(id: string): Promise<boolean> {
    const [row] = await this.db.tx
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.tenantId, this.db.shopId), eq(categories.id, id)));
    return row !== undefined;
  }

  private async nextSort(table: 'categories' | 'items'): Promise<number> {
    const t = table === 'categories' ? categories : items;
    const [row] = await this.db.tx
      .select({ next: sql<number>`coalesce(max(${t.sort}) + 1, 0)::int` })
      .from(t)
      .where(eq(t.tenantId, this.db.shopId));
    return Number(row?.next ?? 0);
  }

  private async reward(): Promise<Reward> {
    const [card] = await this.db.tx
      .select({ itemId: stampCards.rewardItemId, variantId: stampCards.rewardVariantId })
      .from(stampCards)
      .where(eq(stampCards.tenantId, this.db.shopId));
    return { itemId: card?.itemId ?? null, variantId: card?.variantId ?? null };
  }

  /**
   * When a "sold out today" size comes back: the time sent, else the shop's next opening, else tomorrow at
   * midnight in Manila. Any other state has no time (the database CHECK).
   */
  private async untilFor(availability: Availability, sent: string | null): Promise<string | null> {
    if (availability !== 'sold_out_today') return null;
    if (sent) return new Date(sent).toISOString();
    const shopId = this.db.shopId;
    const hours = await this.db.tx
      .select({ day: openingHours.weekday, open: openingHours.opens, close: openingHours.closes })
      .from(openingHours)
      .where(eq(openingHours.tenantId, shopId));
    const daysOff = await this.db.tx
      .select({ date: closures.date, reason: closures.reason })
      .from(closures)
      .where(
        and(
          eq(closures.tenantId, shopId),
          gte(closures.date, sql`(now() at time zone 'Asia/Manila')::date`),
        ),
      );
    const now = new Date();
    const known = HoursSettingsSchema.parse({
      hours: hours.map((h) => ({ day: h.day, open: h.open.slice(0, 5), close: h.close.slice(0, 5) })),
      closures: daysOff,
    });
    const next = nextOpening(
      {
        ...known,
        pause: { paused: false, busyUntil: null },
        prepMinutes: 0,
        takeOrdersWhileClosed: false,
      },
      now,
    );
    return next ?? manilaToDate(addDays(manilaDate(now), 1), '00:00').toISOString();
  }
}
