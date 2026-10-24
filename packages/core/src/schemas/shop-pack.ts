import { z } from 'zod';
import { CatalogSchema } from './catalog.js';
import { StorefrontSchema } from './storefront.js';

// A shop pack is copyable data: look, catalog, add-ons, stamp card, banners, hours and delivery.
// Activity (orders, members, stamps) is generated from a pack plus a date and never copied (T03b).
export const ShopPackSchema = z
  .object({
    storefront: StorefrontSchema,
    catalog: CatalogSchema,
  })
  .superRefine((pack, ctx) => {
    const groupIds = new Set(pack.catalog.optionGroups.map((g) => g.id));
    const itemIds = new Set(pack.catalog.items.map((i) => i.id));
    const categoryIds = new Set(pack.catalog.categories.map((c) => c.id));
    for (const item of pack.catalog.items) {
      if (!categoryIds.has(item.categoryId)) {
        ctx.addIssue({
          code: 'custom',
          message: `${item.id}: unknown category ${item.categoryId}`,
        });
      }
      for (const id of item.optionGroupIds) {
        if (!groupIds.has(id))
          ctx.addIssue({ code: 'custom', message: `${item.id}: unknown group ${id}` });
      }
      for (const id of item.pairingIds) {
        if (!itemIds.has(id))
          ctx.addIssue({ code: 'custom', message: `${item.id}: unknown pairing ${id}` });
      }
    }
    const reward = pack.storefront.stampCard.reward;
    if (reward.kind === 'free_item') {
      const item = pack.catalog.items.find((i) => i.id === reward.itemId);
      if (!item?.variants.some((v) => v.id === reward.variantId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'The free item reward points at a missing variant',
        });
      }
    }
    const zoneIds = pack.storefront.delivery.zones.map((z) => z.id);
    if (new Set(zoneIds).size !== zoneIds.length) {
      ctx.addIssue({ code: 'custom', message: 'Zone ids must be unique' });
    }
  });
export type ShopPack = z.infer<typeof ShopPackSchema>;
