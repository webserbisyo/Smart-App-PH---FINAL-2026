import { describe, expect, it } from 'vitest'
import { DEMO_SHOPS } from '../src/demo/shops.js'
import { DemoShopSummarySchema } from '../src/schemas/demo-shop.js'

describe('Demo Shops', () => {
  it('parses every demo shop with DemoShopSummarySchema', () => {
    expect(DEMO_SHOPS).toHaveLength(5)
    for (const shop of DEMO_SHOPS) {
      const parsed = DemoShopSummarySchema.safeParse(shop)
      expect(parsed.success).toBe(true)
    }
  })

  it('has unique slugs', () => {
    const slugs = DEMO_SHOPS.map((s) => s.slug)
    const uniqueSlugs = new Set(slugs)
    expect(uniqueSlugs.size).toBe(slugs.length)
  })

  it('has unique owner emails', () => {
    const emails = DEMO_SHOPS.map((s) => s.ownerEmail)
    const uniqueEmails = new Set(emails)
    expect(uniqueEmails.size).toBe(emails.length)
  })
})
