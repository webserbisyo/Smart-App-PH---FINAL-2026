// The sign-up tour (decision T108): what the phone beside the sign-up form plays, read from our sample
// shops only. It is sample content in every build, so it has no API route; the sample adapter serves it.
import { z } from 'zod';
import { BoardOrderSchema, OwnerOrderSchema } from './owner-orders.js';
import { HomePeriodDataSchema } from './owner-home.js';
import { OwnerAvatarSchema } from './owner-avatar.js';
import { ShopNewsItemSchema } from './news.js';
import { PublicShopSchema } from './storefront.js';

export const ShowcaseShopSchema = z.object({
  slug: z.string().min(1),
  shop: PublicShopSchema,
});
export type ShowcaseShop = z.infer<typeof ShowcaseShopSchema>;

export const ShowcaseSchema = z.object({
  // Every sample shop, first the food shop the tour starts with.
  shops: z.array(ShowcaseShopSchema).min(1),
  // One order with a payment photo and its chat (scene 2), from the first shop.
  chat: z.object({ order: BoardOrderSchema, detail: OwnerOrderSchema }).nullable(),
  // The first shop's open orders (scene 6), newest first.
  board: z.array(BoardOrderSchema),
  // The first shop's day so far (scene 6).
  today: HomePeriodDataSchema,
  // The first shop's last 7 days (the log in phone): a full chart at any hour.
  week: HomePeriodDataSchema,
  // A member of the first shop with a face, signed in on the customer's phone.
  member: z.object({ name: z.string().min(1), avatar: OwnerAvatarSchema }).nullable(),
  // The first shop's sent news (scene 4).
  news: z.array(ShopNewsItemSchema),
});
export type Showcase = z.infer<typeof ShowcaseSchema>;
