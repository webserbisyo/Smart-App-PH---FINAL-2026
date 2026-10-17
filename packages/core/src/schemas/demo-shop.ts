import { z } from 'zod'

export const ShopKind = ['food', 'retail'] as const
export const ShopKindEnum = z.enum(ShopKind)
export type ShopKind = z.infer<typeof ShopKindEnum>

export const DemoShopSummarySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  kind: ShopKindEnum,
  ownerName: z.string().min(1),
  ownerEmail: z.string().email(),
})

export type DemoShopSummary = z.infer<typeof DemoShopSummarySchema>
