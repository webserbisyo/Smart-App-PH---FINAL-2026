import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  BulkItemsResultSchema,
  CategorySchema,
  CleanupPreviewSchema,
  OwnerItemSchema,
  OwnerOptionGroupSchema,
  OwnerVariantTemplateSchema,
  RemoveVariantTemplateResultSchema,
  SaveVariantTemplateResultSchema,
  StorageSummarySchema,
  type ItemDraft,
  type OwnerItem,
} from '@smartapp/core';
import { Db } from '../../src/db/db.service.js';
import { integrationApp, ownerWithShop, upload } from './support.js';

type Agent = Awaited<ReturnType<typeof ownerWithShop>>['agent'];

const ItemsSchema = z.array(OwnerItemSchema);

async function category(agent: Agent, name: string): Promise<string> {
  const res = await agent.post('/owner/categories').send({ name, icon: 'burger' }).expect(201);
  return CategorySchema.parse(res.body).id;
}

async function addOns(agent: Agent): Promise<{ id: string; optionIds: string[] }> {
  const res = await agent
    .post('/owner/option-groups')
    .send({
      name: 'Extras',
      min: 0,
      max: 2,
      options: [
        { name: 'Cheese', priceDelta: 2000, isDefault: false, soldOut: false },
        { name: 'Egg', priceDelta: 1500, isDefault: false, soldOut: false },
      ],
    })
    .expect(201);
  const group = OwnerOptionGroupSchema.parse(res.body);
  return { id: group.id, optionIds: group.options.map((o) => o.id) };
}

function simpleDraft(categoryId: string, name: string, basePrice = 10000): ItemDraft {
  return {
    categoryId,
    name,
    description: null,
    photos: [],
    basePrice,
    axes: [],
    variants: [
      {
        id: 'new',
        values: [],
        price: basePrice,
        priceOverride: null,
        availability: 'available',
        soldOutUntil: null,
      },
    ],
    optionGroupIds: [],
    pairingIds: [],
    featured: false,
    isNew: false,
    status: 'active',
    noticeDays: 0,
    dailyLimit: null,
  };
}

function draftOf(item: OwnerItem): ItemDraft {
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    description: item.description,
    photos: item.photos,
    basePrice: item.basePrice,
    axes: item.axes,
    variants: item.variants,
    optionGroupIds: item.optionGroupIds,
    pairingIds: item.pairingIds,
    featured: item.featured,
    isNew: item.isNew,
    status: item.status,
    noticeDays: item.noticeDays,
    dailyLimit: item.dailyLimit,
  };
}

async function saveNew(agent: Agent, draft: ItemDraft): Promise<OwnerItem> {
  return OwnerItemSchema.parse((await agent.post('/owner/items').send(draft).expect(201)).body);
}

describe('menu (phase 4)', () => {
  let app: NestExpressApplication;
  let db: Db;

  beforeAll(async () => {
    app = await integrationApp();
    db = app.get(Db);
  });

  afterAll(async () => {
    await app.close();
  });

  /** Runs SQL as the founder's role, for set-up a screen can't do yet (orders arrive in phase 5). */
  const asAdmin = <T>(fn: () => Promise<T>) =>
    db.run({ userId: null, shopId: null, role: 'admin' }, fn);

  it("a new shop starts with its kind's ready-made variants and an empty menu", async () => {
    const food = await ownerWithShop(app, 'menu-new');
    const templates = z
      .array(OwnerVariantTemplateSchema)
      .parse((await food.agent.get('/owner/variant-templates').expect(200)).body);
    expect(templates.map((t) => t.name)).toEqual([
      'Size',
      'Size',
      'Cup size',
      'Patty',
      'Temperature',
    ]);
    expect(templates.every((t) => t.usedBy === 0 && !t.sample)).toBe(true);
    expect((await food.agent.get('/owner/items').expect(200)).body).toEqual([]);
    expect((await food.agent.get('/owner/categories').expect(200)).body).toEqual([]);

    const retail = await ownerWithShop(app, 'menu-new-retail', 'retail');
    const names = z
      .array(OwnerVariantTemplateSchema)
      .parse((await retail.agent.get('/owner/variant-templates').expect(200)).body)
      .map((t) => t.name);
    expect(names).toEqual(['Size', 'Size', 'Shoe size', 'Colour']);
  });

  it('categories: add, rename, reorder, and one with items cannot go', async () => {
    const { agent } = await ownerWithShop(app, 'menu-cats');
    const burgers = await category(agent, 'Burgers');
    const drinks = await category(agent, 'Drinks');
    const renamed = CategorySchema.parse(
      (
        await agent
          .put(`/owner/categories/${burgers}`)
          .send({ name: 'Smash burgers', icon: { kind: 'emoji', char: '🍔' } })
          .expect(200)
      ).body,
    );
    expect(renamed.name).toBe('Smash burgers');
    await agent
      .put('/owner/sort')
      .send({ kind: 'category', ids: [drinks, burgers] })
      .expect(200);
    const list = z
      .array(CategorySchema)
      .parse((await agent.get('/owner/categories').expect(200)).body);
    expect(list.map((c) => c.id)).toEqual([drinks, burgers]);

    await saveNew(agent, simpleDraft(burgers, 'Classic'));
    const busy = await agent.delete(`/owner/categories/${burgers}`).expect(400);
    expect(busy.body.code).toBe('category_not_empty');
    await agent.delete(`/owner/categories/${drinks}`).expect(200);
    await agent.delete('/owner/categories/not-a-uuid').expect(404);
  });

  it('a food item with sizes, add-ons and a photo saves and reads back the same', async () => {
    const { agent } = await ownerWithShop(app, 'menu-food');
    const burgers = await category(agent, 'Burgers');
    const extras = await addOns(agent);
    const photo = await upload(agent, 'item');
    const fries = await saveNew(agent, simpleDraft(burgers, 'Fries', 8900));
    const templates = z
      .array(OwnerVariantTemplateSchema)
      .parse((await agent.get('/owner/variant-templates').expect(200)).body);
    const patty = templates.find((t) => t.name === 'Patty');
    expect(patty).toBeDefined();

    const draft: ItemDraft = {
      ...simpleDraft(burgers, 'Classic Smash', 18900),
      description: 'Two smashed patties',
      photos: [photo.ref],
      axes: [
        {
          name: 'Patty',
          templateId: patty?.id ?? null,
          values: [
            { name: 'Single', photo: null, priceDelta: 0 },
            { name: 'Double', photo: null, priceDelta: 6000 },
          ],
        },
      ],
      variants: [
        // The phone's own price is ignored: the server owns every price.
        {
          id: 'a',
          values: ['Single'],
          price: 1,
          priceOverride: null,
          availability: 'available',
          soldOutUntil: null,
        },
        {
          id: 'b',
          values: ['Double'],
          price: 1,
          priceOverride: null,
          availability: 'sold_out',
          soldOutUntil: null,
        },
      ],
      optionGroupIds: [extras.id],
      pairingIds: [fries.id],
      featured: true,
      noticeDays: 1,
      dailyLimit: 40,
    };
    const saved = await saveNew(agent, draft);
    expect(saved.photos).toEqual([photo.ref]);
    expect(saved.variants.map((v) => [v.values, v.price, v.availability])).toEqual([
      [['Single'], 18900, 'available'],
      [['Double'], 24900, 'sold_out'],
    ]);
    expect(saved.optionGroupIds).toEqual([extras.id]);
    expect(saved.pairingIds).toEqual([fries.id]);
    expect(saved).toMatchObject({
      featured: true,
      noticeDays: 1,
      dailyLimit: 40,
      hasOrders: false,
    });

    // Rename Double to Twin and add Triple: Twin keeps its size id (and its sold-out state).
    const double = saved.variants[1];
    const edited = OwnerItemSchema.parse(
      (
        await agent
          .put(`/owner/items/${saved.id}`)
          .send({
            ...draftOf(saved),
            axes: [
              {
                name: 'Patty',
                templateId: null,
                values: [
                  { name: 'Single', photo: null, priceDelta: 0 },
                  { name: 'Twin', photo: null, priceDelta: 6000 },
                  { name: 'Triple', photo: null, priceDelta: 11000 },
                ],
              },
            ],
            variants: saved.variants.map((v) =>
              v.id === double?.id ? { ...v, values: ['Twin'] } : v,
            ),
          })
          .expect(200)
      ).body,
    );
    expect(edited.variants.map((v) => v.values[0])).toEqual(['Single', 'Twin', 'Triple']);
    expect(edited.variants[1]?.id).toBe(double?.id);
    expect(edited.variants[1]?.availability).toBe('sold_out');
    expect(edited.variants[2]?.price).toBe(29900);

    const list = ItemsSchema.parse((await agent.get('/owner/items').expect(200)).body);
    expect(list.find((i) => i.id === saved.id)).toEqual(edited);
  });

  it('a retail item with colour x size makes every combination, and a special price sticks', async () => {
    const { agent } = await ownerWithShop(app, 'menu-retail', 'retail');
    const shirts = await category(agent, 'Shirts');
    const colours = ['Sand', 'Black'];
    const sizes = ['S', 'M', 'L'];
    const draft: ItemDraft = {
      ...simpleDraft(shirts, 'Basic Tee', 59900),
      axes: [
        {
          name: 'Colour',
          templateId: null,
          values: colours.map((name) => ({ name, photo: null, priceDelta: 0 })),
        },
        {
          name: 'Size',
          templateId: null,
          values: sizes.map((name) => ({ name, photo: null, priceDelta: name === 'L' ? 5000 : 0 })),
        },
      ],
      variants: [
        {
          id: 'x',
          values: ['Black', 'L'],
          price: 0,
          priceOverride: 69900,
          availability: 'available',
          soldOutUntil: null,
        },
      ],
    };
    const saved = await saveNew(agent, draft);
    expect(saved.variants).toHaveLength(6);
    const blackL = saved.variants.find((v) => v.values.join('/') === 'Black/L');
    const sandL = saved.variants.find((v) => v.values.join('/') === 'Sand/L');
    expect(blackL?.price).toBe(69900);
    expect(sandL?.price).toBe(64900);
  });

  it('an ordered size can be removed; the ordered item can only be archived', async () => {
    const { agent, shopId } = await ownerWithShop(app, 'menu-history');
    const cat = await category(agent, 'Cakes');
    const draft: ItemDraft = {
      ...simpleDraft(cat, 'Ube Cake', 45000),
      axes: [
        {
          name: 'Size',
          templateId: null,
          values: [
            { name: 'Slice', photo: null, priceDelta: 0 },
            { name: 'Whole', photo: null, priceDelta: 90000 },
          ],
        },
      ],
      variants: [],
    };
    draft.variants = [
      {
        id: 'a',
        values: ['Slice'],
        price: 0,
        priceOverride: null,
        availability: 'available',
        soldOutUntil: null,
      },
      {
        id: 'b',
        values: ['Whole'],
        price: 0,
        priceOverride: null,
        availability: 'available',
        soldOutUntil: null,
      },
    ];
    const cake = await saveNew(agent, draft);
    const whole = cake.variants[1];
    await asAdmin(async () => {
      await db.tx.execute(sql`
        insert into public.orders (id, tenant_id, business_date, order_no, token, pickup_code, type, payment_method, customer_name, due_at, start_by, subtotal, total)
        values ('${sql.raw(shopId.slice(0, 8))}-0d00-4000-8000-000000000001', ${shopId}, '2026-11-25', 1, ${`tok-${shopId}`}, 'K7QX', 'pickup', 'cash', 'Maya', now(), now(), 135000, 135000)`);
      await db.tx.execute(sql`
        insert into public.order_lines (tenant_id, order_id, item_id, variant_id, name, variant_label, qty, unit_price, line_total)
        values (${shopId}, '${sql.raw(shopId.slice(0, 8))}-0d00-4000-8000-000000000001', ${cake.id}, ${whole?.id ?? ''}, 'Ube Cake', 'Whole', 1, 135000, 135000)`);
    });

    const afterSave = OwnerItemSchema.parse(
      (
        await agent
          .put(`/owner/items/${cake.id}`)
          .send({
            ...draftOf(cake),
            axes: [
              {
                name: 'Size',
                templateId: null,
                values: [{ name: 'Slice', photo: null, priceDelta: 0 }],
              },
            ],
            variants: cake.variants.slice(0, 1),
          })
          .expect(200)
      ).body,
    );
    expect(afterSave.variants).toHaveLength(1);
    expect(afterSave.hasOrders).toBe(true);
    const line = await asAdmin(() =>
      db.tx.execute<{ variant_id: string | null; variant_label: string }>(
        sql`select variant_id, variant_label from public.order_lines where item_id = ${cake.id}`,
      ),
    );
    expect(line.rows).toEqual([{ variant_id: null, variant_label: 'Whole' }]);

    const blocked = await agent.delete(`/owner/items/${cake.id}`).expect(400);
    expect(blocked.body.code).toBe('item_has_orders');
    const archived = OwnerItemSchema.parse(
      (await agent.patch(`/owner/items/${cake.id}/status`).send({ status: 'archived' }).expect(200))
        .body,
    );
    expect(archived.status).toBe('archived');
  });

  it('the prize item stays shown and its prize size stays (M10)', async () => {
    const { agent, shopId } = await ownerWithShop(app, 'menu-prize');
    const cat = await category(agent, 'Drinks');
    const coffee = await saveNew(agent, simpleDraft(cat, 'Iced Coffee', 9000));
    await asAdmin(() =>
      db.tx.execute(sql`
        insert into public.stamp_cards (tenant_id, reward_kind, reward_item_id, reward_variant_id, reward_title)
        values (${shopId}, 'free_item', ${coffee.id}, ${coffee.variants[0]?.id ?? ''}, 'Free Iced Coffee')`),
    );
    const hide = await agent
      .patch(`/owner/items/${coffee.id}/status`)
      .send({ status: 'hidden' })
      .expect(409);
    expect(hide.body.code).toBe('item_is_reward');
    const remove = await agent.delete(`/owner/items/${coffee.id}`).expect(409);
    expect(remove.body.code).toBe('item_is_reward');
    const bulk = await agent
      .post('/owner/items/bulk')
      .send({ action: 'status', ids: [coffee.id], status: 'archived' })
      .expect(409);
    expect(bulk.body.code).toBe('item_is_reward');
    const resized = await agent
      .put(`/owner/items/${coffee.id}`)
      .send({
        ...draftOf(coffee),
        axes: [
          {
            name: 'Size',
            templateId: null,
            values: [{ name: 'Large', photo: null, priceDelta: 0 }],
          },
        ],
        variants: [
          {
            id: 'new',
            values: ['Large'],
            price: 0,
            priceOverride: null,
            availability: 'available',
            soldOutUntil: null,
          },
        ],
      })
      .expect(400);
    expect(resized.body.code).toBe('variant_is_reward');
  });

  it('sold out today comes back by itself after its time', async () => {
    const { agent, shopId } = await ownerWithShop(app, 'menu-soldout');
    const cat = await category(agent, 'Mains');
    const item = await saveNew(agent, simpleDraft(cat, 'Sisig', 15000));
    const variantId = item.variants[0]?.id ?? '';
    const today = OwnerItemSchema.parse(
      (
        await agent
          .patch(`/owner/variants/${variantId}`)
          .send({ availability: 'sold_out_today' })
          .expect(200)
      ).body,
    );
    // No opening hours: tomorrow at midnight in Manila.
    expect(today.variants[0]?.availability).toBe('sold_out_today');
    expect(today.variants[0]?.soldOutUntil).not.toBeNull();
    await asAdmin(() =>
      db.tx.execute(
        sql`update public.item_variants set sold_out_until = now() - interval '1 minute' where tenant_id = ${shopId}`,
      ),
    );
    const [back] = ItemsSchema.parse((await agent.get('/owner/items').expect(200)).body);
    expect(back?.variants[0]).toMatchObject({ availability: 'available', soldOutUntil: null });
  });

  it('bulk actions change every item or none', async () => {
    const { agent } = await ownerWithShop(app, 'menu-bulk');
    const mains = await category(agent, 'Mains');
    const sides = await category(agent, 'Sides');
    const a = await saveNew(agent, simpleDraft(mains, 'Adobo'));
    const b = await saveNew(agent, simpleDraft(mains, 'Sinigang'));

    const missing = await agent
      .post('/owner/items/bulk')
      .send({
        action: 'status',
        ids: [a.id, '00000000-0000-4000-8000-000000000000'],
        status: 'hidden',
      })
      .expect(404);
    expect(missing.body.code).toBe('not_found');
    let list = ItemsSchema.parse((await agent.get('/owner/items').expect(200)).body);
    expect(list.every((i) => i.status === 'active')).toBe(true);

    const hidden = BulkItemsResultSchema.parse(
      (
        await agent
          .post('/owner/items/bulk')
          .send({ action: 'status', ids: [a.id, b.id], status: 'hidden' })
          .expect(200)
      ).body,
    );
    expect(hidden.count).toBe(2);
    await agent
      .post('/owner/items/bulk')
      .send({ action: 'move', ids: [a.id, b.id], categoryId: sides })
      .expect(200);
    await agent
      .post('/owner/items/bulk')
      .send({
        action: 'soldOut',
        variants: [a, b].map((i) => ({
          variantId: i.variants[0]?.id ?? '',
          availability: 'sold_out',
        })),
      })
      .expect(200);
    list = ItemsSchema.parse((await agent.get('/owner/items').expect(200)).body);
    expect(list.map((i) => [i.status, i.categoryId, i.variants[0]?.availability])).toEqual([
      ['hidden', sides, 'sold_out'],
      ['hidden', sides, 'sold_out'],
    ]);
  });

  it('a variant change follows to the items that link it', async () => {
    const { agent } = await ownerWithShop(app, 'menu-template');
    const cat = await category(agent, 'Drinks');
    const made = SaveVariantTemplateResultSchema.parse(
      (
        await agent
          .post('/owner/variant-templates')
          .send({
            draft: { name: 'Cup', options: [{ name: '12 oz' }, { name: '16 oz' }] },
            applyToItems: false,
          })
          .expect(200)
      ).body,
    ).template;
    const tea = await saveNew(agent, {
      ...simpleDraft(cat, 'Milk Tea', 9000),
      axes: [
        {
          name: 'Cup',
          templateId: made.id,
          values: [
            { name: '12 oz', photo: null, priceDelta: 0 },
            { name: '16 oz', photo: null, priceDelta: 2000 },
          ],
        },
      ],
      variants: [
        {
          id: 'a',
          values: ['12 oz'],
          price: 0,
          priceOverride: null,
          availability: 'available',
          soldOutUntil: null,
        },
        {
          id: 'b',
          values: ['16 oz'],
          price: 0,
          priceOverride: null,
          availability: 'available',
          soldOutUntil: null,
        },
      ],
    });
    // Out of step with the template: refused.
    await agent
      .put(`/owner/items/${tea.id}`)
      .send({ ...draftOf(tea), axes: [{ ...tea.axes[0], name: 'Cups' }] })
      .expect(400);

    const big = tea.variants[1];
    const result = SaveVariantTemplateResultSchema.parse(
      (
        await agent
          .put(`/owner/variant-templates/${made.id}`)
          .send({
            draft: {
              id: made.id,
              name: 'Cup',
              options: made.options.map((o) =>
                o.name === '16 oz' ? { id: o.id, name: '16 oz Large' } : o,
              ),
            },
            applyToItems: true,
          })
          .expect(200)
      ).body,
    );
    expect(result.updatedItemIds).toEqual([tea.id]);
    expect(result.template.usedBy).toBe(1);
    const [after] = ItemsSchema.parse((await agent.get('/owner/items').expect(200)).body);
    expect(after?.variants[1]).toMatchObject({
      id: big?.id,
      values: ['16 oz Large'],
      price: 11000,
    });

    const removed = RemoveVariantTemplateResultSchema.parse(
      (await agent.delete(`/owner/variant-templates/${made.id}`).expect(200)).body,
    );
    expect(removed.unlinkedItemIds).toEqual([tea.id]);
    const [unlinked] = ItemsSchema.parse((await agent.get('/owner/items').expect(200)).body);
    expect(unlinked?.axes[0]?.templateId).toBeNull();
  });

  it("another shop's menu is Not found, never forbidden", async () => {
    const a = await ownerWithShop(app, 'menu-wall-a');
    const b = await ownerWithShop(app, 'menu-wall-b');
    const cat = await category(a.agent, 'Mine');
    const item = await saveNew(a.agent, simpleDraft(cat, 'Secret'));
    await b.agent.put(`/owner/items/${item.id}`).send(draftOf(item)).expect(404);
    await b.agent.patch(`/owner/items/${item.id}/status`).send({ status: 'hidden' }).expect(404);
    await b.agent
      .patch(`/owner/variants/${item.variants[0]?.id ?? ''}`)
      .send({ availability: 'sold_out' })
      .expect(404);
    await b.agent.delete(`/owner/items/${item.id}`).expect(404);
    await b.agent
      .post('/owner/items/bulk')
      .send({ action: 'status', ids: [item.id], status: 'hidden' })
      .expect(404);
    // An item in B's shop cannot use A's category.
    const own = await category(b.agent, 'Theirs');
    const stolen = await b.agent.post('/owner/items').send(simpleDraft(cat, 'Nope')).expect(400);
    expect(stolen.body.fieldErrors).toEqual({ categoryId: ['invalid'] });
    expect((await b.agent.get('/owner/items').expect(200)).body).toEqual([]);
    await saveNew(b.agent, simpleDraft(own, 'Fine'));
  });

  it("archived items' photos can be cleaned up from Storage", async () => {
    const { agent } = await ownerWithShop(app, 'menu-cleanup');
    const cat = await category(agent, 'Old');
    const photo = await upload(agent, 'item');
    const item = await saveNew(agent, { ...simpleDraft(cat, 'Retired'), photos: [photo.ref] });
    let storage = StorageSummarySchema.parse((await agent.get('/owner/storage').expect(200)).body);
    expect(storage.cleanups.find((c) => c.kind === 'archived_photos')?.files).toBe(0);
    await agent.patch(`/owner/items/${item.id}/status`).send({ status: 'archived' }).expect(200);
    const preview = CleanupPreviewSchema.parse(
      (await agent.get('/owner/storage/cleanup?kind=archived_photos').expect(200)).body,
    );
    expect(preview.files).toBe(1);
    const stale = await agent
      .post('/owner/storage/cleanup')
      .send({ kind: 'archived_photos', token: 'not-the-token' })
      .expect(409);
    expect(stale.body.code).toBe('cleanup_changed');
    storage = StorageSummarySchema.parse(
      (
        await agent
          .post('/owner/storage/cleanup')
          .send({ kind: 'archived_photos', token: preview.token })
          .expect(200)
      ).body,
    );
    expect(storage.usedBytes).toBe(0);
    const [after] = ItemsSchema.parse((await agent.get('/owner/items').expect(200)).body);
    expect(after?.photos).toEqual([]);
  });

  it('reads a 200-item menu quickly (one pass per table, never one query per item)', async () => {
    const { agent, shopId } = await ownerWithShop(app, 'menu-big');
    const cat = await category(agent, 'Everything');
    await asAdmin(async () => {
      await db.tx.execute(sql`
        with made as (
          insert into public.items (tenant_id, category_id, name, base_price, sort)
          select ${shopId}, ${cat}, 'Item ' || n, 10000 + n, n from generate_series(1, 200) n
          returning id, tenant_id
        )
        insert into public.item_variants (tenant_id, item_id, combo_key) select tenant_id, id, '' from made`);
    });
    await agent.get('/owner/items').expect(200);
    const started = performance.now();
    const res = await agent.get('/owner/items').expect(200);
    const took = performance.now() - started;
    expect(ItemsSchema.parse(res.body)).toHaveLength(200);
    expect(took).toBeLessThan(300);
  });
});
