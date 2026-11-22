// The sign-up tour (decision T108): what the phone beside the sign-up form plays, read from our sample
// shops only. It is sample content in every build, so it has no API route; the sample adapter serves it.
// Each shop carries its own story, so a shop picked from the strip plays its own orders, chat and members.
import { z } from 'zod';
import { BoardOrderSchema, OwnerOrderSchema } from './owner-orders.js';
import { HomePeriodDataSchema } from './owner-home.js';
import { OwnerAvatarSchema } from './owner-avatar.js';
import { ShopNewsItemSchema } from './news.js';
import { PublicShopSchema } from './storefront.js';

export const ShowcaseStorySchema = z.object({
  // One order with a payment photo and its chat, from this shop.
  chat: z.object({ order: BoardOrderSchema, detail: OwnerOrderSchema }).nullable(),
  // This shop's open orders, faces first.
  board: z.array(BoardOrderSchema),
  // This shop's last 7 days: a full chart at any hour.
  week: HomePeriodDataSchema,
  // A member of this shop with a face, signed in on the customer's phone.
  member: z.object({ name: z.string().min(1), avatar: OwnerAvatarSchema }).nullable(),
  // This shop's sent news.
  news: z.array(ShopNewsItemSchema),
});
export type ShowcaseStory = z.infer<typeof ShowcaseStorySchema>;

export const ShowcaseShopSchema = z.object({
  slug: z.string().min(1),
  shop: PublicShopSchema,
  story: ShowcaseStorySchema,
});
export type ShowcaseShop = z.infer<typeof ShowcaseShopSchema>;

export const ShowcaseSchema = z.object({
  // Every sample shop, first the food shop the tour starts with.
  shops: z.array(ShowcaseShopSchema).min(1),
});
export type Showcase = z.infer<typeof ShowcaseSchema>;
