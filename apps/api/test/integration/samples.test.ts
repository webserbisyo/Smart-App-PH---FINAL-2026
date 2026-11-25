import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  CategorySchema,
  OwnerItemSchema,
  OwnerVariantTemplateSchema,
  PublicShopSchema,
  SHOP_PACKS,
  StampCardSettingsSchema,
  StorageSummarySchema,
  StorefrontDraftStateSchema,
} from '@smartapp/core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { Db } from '../../src/db/db.service.js';
import { integrationApp, nextPhone, ownerWithShop, phone } from './support.js';

const ADMIN = { userId: null, shopId: null, role: 'admin' } as const;

describe('Start with samples and Clear samples (phase 4, X4)', () => {
  let app: NestExpressApplication;
  let db: Db;

  beforeAll(async () => {
    app = await integrationApp();
    db = app.get(Db);
  });

  afterAll(async () => {
    await app.close();
  });

  type Owner = Awaited<ReturnType<typeof ownerWithShop>>;

  const items = async (o: Owner) =>
    z.array(OwnerItemSchema).parse((await o.agent.get('/owner/items').expect(200)).body);
  const categories = async (o: Owner) =>
    z.array(CategorySchema).parse((await o.agent.get('/owner/categories').expect(200)).body);
  const templates = async (o: Owner) =>
    z
      .array(OwnerVariantTemplateSchema)
      .parse((await o.agent.get('/owner/variant-templates').expect(200)).body);
  const storage = async (o: Owner) =>
    StorageSummarySchema.parse((await o.agent.get('/owner/storage').expect(200)).body);
  const card = async (o: Owner) =>
    StampCardSettingsSchema.parse((await o.agent.get('/owner/stamp-card').expect(200)).body);

  for (const [kind, packSlug] of [
    ['food', 'kanto-smash'],
    ['retail', 'tala-apparel'],
  ] as const) {
    it(`copies the ${packSlug} pack into a new ${kind} shop, then clears it`, async () => {
      const pack = SHOP_PACKS[packSlug];
      const owner = await ownerWithShop(app, `samples-${kind}`, kind);
      await owner.agent.post('/owner/samples').send({ packSlug: 'no-such-pack' }).expect(404);

      const shop = PublicShopSchema.parse(
        (await owner.agent.post('/owner/samples').send({ packSlug }).expect(200)).body,
      );
      expect(shop.storefront.slug).toBe(owner.slug);
      const added = await items(owner);
      expect(added).toHaveLength(pack.catalog.items.length);
      expect(added.every((i) => i.sample)).toBe(true);
      expect(new Set(added.map((i) => i.name))).toEqual(
        new Set(pack.catalog.items.map((i) => i.name)),
      );
      expect((await categories(owner)).map((c) => c.name).sort()).toEqual(
        pack.catalog.categories.map((c) => c.name).sort(),
      );
      // Every photo is the shop's own file in its menu folder, counted in storage.
      const photos = added.flatMap((i) => i.photos);
      expect(photos.length).toBeGreaterThan(0);
      expect(photos.every((p) => p.includes('/storage/v1/object/public/menu/'))).toBe(true);
      const menu = (await storage(owner)).kinds.find((k) => k.kind === 'menu');
      expect(menu?.files).toBeGreaterThan(0);
      // Pairings point at the new items.
      const ids = new Set(added.map((i) => i.id));
      expect(added.flatMap((i) => i.pairingIds).every((id) => ids.has(id))).toBe(true);
      // Linked variants follow the pack's.
      const linked = added.flatMap((i) => i.axes.flatMap((a) => (a.templateId ? [a] : [])));
      const own = await templates(owner);
      for (const axis of linked) expect(own.some((t) => t.id === axis.templateId)).toBe(true);
      // The look and the card are the pack's, with the shop's own brand colour.
      const editor = StorefrontDraftStateSchema.parse(
        (await owner.agent.get('/owner/storefront/draft').expect(200)).body,
      );
      expect(editor.published.look.banners).toEqual(pack.storefront.look.banners);
      expect((await card(owner)).rule).toEqual(pack.storefront.stampCard.rule);

      // A second tap adds nothing.
      await owner.agent.post('/owner/samples').send({ packSlug }).expect(200);
      expect(await items(owner)).toHaveLength(added.length);

      PublicShopSchema.parse((await owner.agent.delete('/owner/samples').expect(200)).body);
      expect(await items(owner)).toEqual([]);
      expect(await categories(owner)).toEqual([]);
      expect((await templates(owner)).filter((t) => t.sample)).toEqual([]);
      // Only a custom prize's photo stays, with the card (now off).
      const after = await card(owner);
      expect(after.status).toBe('off');
      expect((await storage(owner)).kinds.find((k) => k.kind === 'menu')?.files).toBe(
        after.reward.image ? 1 : 0,
      );
      const cleared = StorefrontDraftStateSchema.parse(
        (await owner.agent.get('/owner/storefront/draft').expect(200)).body,
      );
      expect(cleared.published.look.banners).toEqual([]);
    });
  }

  it('keeps an ordered sample archived, and the owner’s own items stay', async () => {
    const owner = await ownerWithShop(app, 'samples-ordered');
    await owner.agent.post('/owner/samples').send({ packSlug: 'kanto-smash' }).expect(200);
    const added = await items(owner);
    const sold = added.find(
      (i) =>
        i.status === 'active' &&
        i.variants.length === 1 &&
        i.variants[0]?.availability === 'available' &&
        i.noticeDays === 0 &&
        i.dailyLimit === null &&
        i.optionGroupIds.length === 0,
    );
    if (!sold) throw new Error('The pack has a simple item.');
    const [mine] = await categories(owner);
    if (!mine) throw new Error('The pack has a category.');
    const own = OwnerItemSchema.parse(
      (
        await owner.agent
          .post('/owner/items')
          .send({
            categoryId: mine.id,
            name: 'House special',
            description: null,
            photos: [],
            basePrice: 9900,
            axes: [],
            variants: [
              {
                id: 'new',
                values: [],
                price: 9900,
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
          })
          .expect(201)
      ).body,
    );
    // Open the shop and order one sample item.
    await db.run(ADMIN, async () => {
      await db.tx.execute(sql`
        update public.tenants set stage = 'live', asked_at = now(), live_at = now() where id = ${owner.shopId}::uuid`);
      await db.tx.execute(
        sql`delete from public.opening_hours where tenant_id = ${owner.shopId}::uuid`,
      );
      await db.tx.execute(sql`
        insert into public.opening_hours (tenant_id, weekday, opens, closes)
        select ${owner.shopId}::uuid, d, '00:00', '23:59' from generate_series(0, 6) d`);
      // Customers of a real shop never see samples: this one is shown for the order, then marked again.
      await db.tx.execute(
        sql`update public.items set is_sample = false where id = ${sold.id}::uuid`,
      );
    });
    await phone(app)
      .post(`/s/${owner.slug}/orders`)
      .send({
        type: 'pickup',
        scheduledAt: null,
        lines: [
          {
            itemId: sold.id,
            variantId: sold.variants[0]?.id ?? '',
            optionIds: [],
            qty: 1,
            note: '',
          },
        ],
        customer: { name: 'Ana', phone: nextPhone(), email: null },
        delivery: null,
        paymentMethod: 'cash',
        paymentAccountId: null,
        note: null,
        useReward: false,
        clientKey: randomUUID(),
      })
      .expect(200);
    await db.run(ADMIN, async () => {
      await db.tx.execute(
        sql`update public.items set is_sample = true where id = ${sold.id}::uuid`,
      );
    });

    await owner.agent.delete('/owner/samples').expect(200);
    const left = await items(owner);
    expect(left.map((i) => i.name).sort()).toEqual([own.name, sold.name].sort());
    expect(left.find((i) => i.id === sold.id)?.status).toBe('archived');
    expect(left.find((i) => i.id === own.id)?.status).toBe('active');
    // The category with the owner's item stays.
    expect((await categories(owner)).map((c) => c.id)).toContain(mine.id);
  });
});
