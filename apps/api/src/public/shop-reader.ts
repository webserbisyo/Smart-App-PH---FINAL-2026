import { Inject, Injectable } from '@nestjs/common';
import {
  CatalogSchema,
  PublicShopSchema,
  ShopKindEnum,
  StorefrontContentSchema,
  type PublicShop,
  type PublicStampCard,
} from '@smartapp/core';
import { and, asc, count, eq, gte, isNull, sql } from 'drizzle-orm';
import { CatalogReader } from '../catalog/catalog-reader.js';
import { ApiFailure } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import {
  closures,
  deliveryDistanceRows,
  deliveryZones,
  members,
  openingHours,
  paymentAccounts,
  shopSettings,
  stampCards,
  storefrontContent,
  tenants,
} from '../db/generated/schema.js';
import { MediaService } from '../media/media.service.js';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// A shop that never set up its stamp card shows it Off, with the same starting rule as a blank shop
// (core demo test-blank). Nothing is stored until the owner saves the card (phase 6).
const OFF_CARD: PublicStampCard = {
  status: 'off',
  rule: { minOrderTotal: 0, stampsNeeded: 10, welcomeStamps: 1, maxEarned: 1, period: 'day' },
  reward: {
    kind: 'discount',
    amount: 10000,
    itemId: null,
    variantId: null,
    title: '₱100 off',
    description: null,
    image: null,
    quantityTotal: null,
    quantityLeft: null,
    onePerCustomer: false,
  },
};

/** "09:00:00" from Postgres to our "09:00". */
function clock(value: string): string {
  return value.slice(0, 5);
}

function iso(value: string | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

/**
 * What a customer's phone reads for one shop (api.md "Storefront", `PublicShop`): the shop's facts, the look
 * it published in the Editor (or the draft, for the owner's preview link), its hours, ways to order and pay,
 * delivery, stamp card and menu. Built from the tables in the request's transaction after `enterShop`, so
 * RLS keeps every read inside that one shop.
 */
@Injectable()
export class ShopReader {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(CatalogReader) private readonly catalog: CatalogReader,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  /**
   * Finds a live (or demo) shop by its link and makes it the transaction's shop. Anything else is Not found
   * (rule 12): a shop still setting up, closed, or a link that never existed all answer the same.
   */
  async enterShop(slug: string): Promise<string> {
    const id = await this.shopIdOf(slug);
    if (!id) throw new ApiFailure('shop_not_found', 404);
    await this.db.useShop(id);
    return id;
  }

  /** The shop behind a link, or null; the transaction's shop is left as it was. */
  async shopIdOf(slug: string): Promise<string | null> {
    const clean = slug.trim().toLowerCase();
    if (!SLUG.test(clean) || clean.length > 40) return null;
    const result = await this.db.tx.execute<{ id: string | null }>(
      sql`select private.tenant_by_slug(${clean}) as id`,
    );
    return result.rows[0]?.id ?? null;
  }

  /** The transaction's shop as customers see it (`published`), or the Editor's draft (`draft`). */
  async read(content: 'published' | 'draft' = 'published'): Promise<PublicShop> {
    const shopId = this.db.shopId;
    const tx = this.db.tx;
    const [shop] = await tx
      .select({
        slug: tenants.slug,
        name: tenants.name,
        kind: tenants.kind,
        isDemo: tenants.isDemo,
      })
      .from(tenants)
      .where(eq(tenants.id, shopId));
    const [s] = await tx.select().from(shopSettings).where(eq(shopSettings.tenantId, shopId));
    const [look] = await tx
      .select({ draft: storefrontContent.draft, published: storefrontContent.published })
      .from(storefrontContent)
      .where(eq(storefrontContent.tenantId, shopId));
    if (!shop || !s || !look) throw new ApiFailure('shop_not_found', 404);
    const shown = StorefrontContentSchema.parse(content === 'draft' ? look.draft : look.published);

    const hours = await tx
      .select({ day: openingHours.weekday, open: openingHours.opens, close: openingHours.closes })
      .from(openingHours)
      .where(eq(openingHours.tenantId, shopId))
      .orderBy(asc(openingHours.weekday), asc(openingHours.opens));
    const daysOff = await tx
      .select({ date: closures.date, reason: closures.reason })
      .from(closures)
      .where(
        and(
          eq(closures.tenantId, shopId),
          gte(closures.date, sql`(now() at time zone 'Asia/Manila')::date`),
        ),
      )
      .orderBy(asc(closures.date));
    const distance = await tx
      .select()
      .from(deliveryDistanceRows)
      .where(eq(deliveryDistanceRows.tenantId, shopId))
      .orderBy(asc(deliveryDistanceRows.fromM));
    const zones = await tx
      .select()
      .from(deliveryZones)
      .where(eq(deliveryZones.tenantId, shopId))
      .orderBy(asc(deliveryZones.sort), asc(deliveryZones.createdAt));
    const accounts = await tx
      .select()
      .from(paymentAccounts)
      .where(and(eq(paymentAccounts.tenantId, shopId), isNull(paymentAccounts.removedAt)))
      .orderBy(asc(paymentAccounts.sort), asc(paymentAccounts.createdAt));
    const [joined] = await tx
      .select({ n: count() })
      .from(members)
      .where(and(eq(members.tenantId, shopId), isNull(members.erasedAt)));

    const payments: unknown[] = [];
    for (const a of accounts) {
      payments.push({
        id: a.id,
        method: a.method,
        bank: a.bank,
        accountName: a.accountName,
        accountNumber: a.accountNumber,
        qr: await this.media.refById(a.qrMediaId),
        sample: a.isSample,
      });
    }
    // A shop that has not added a way to pay yet still takes cash at the counter (like core's blank shop).
    if (payments.length === 0) {
      payments.push({
        id: 'cash',
        method: 'cash',
        bank: null,
        accountName: null,
        accountNumber: null,
        qr: null,
        sample: false,
      });
    }

    const orderTypes: string[] = [];
    if (s.walkInOn) orderTypes.push('walk_in');
    if (s.pickupOn) orderTypes.push('pickup');
    if (s.deliveryOn) orderTypes.push('delivery');

    return PublicShopSchema.parse({
      storefront: {
        slug: shop.slug,
        info: {
          name: shop.name,
          tagline: shown.tagline,
          about: shown.about,
          kind: ShopKindEnum.parse(shop.kind),
          isDemo: shop.isDemo,
          logo: shown.logo,
          contact: {
            phone: s.phone,
            messengerUsername: s.messengerUsername,
            facebookUrl: s.facebookUrl,
            googleReviewUrl: s.googleReviewUrl,
            address: s.address,
            showAddress: s.showAddress,
            pin: s.pinLat !== null && s.pinLng !== null ? { lat: s.pinLat, lng: s.pinLng } : null,
            pickupNote: s.pickupNote,
          },
        },
        look: shown.look,
        hours: hours.map((h) => ({ day: h.day, open: clock(h.open), close: clock(h.close) })),
        closures: daysOff,
        pause: { busyUntil: iso(s.busyUntil), paused: s.paused },
        orderTypes,
        prepMinutes: s.prepMinutes,
        takeOrdersWhileClosed: s.takeOrdersWhileClosed,
        daysAhead: s.daysAhead,
        slotMinutes: s.slotMinutes,
        ordersPerSlot: s.ordersPerSlot,
        payments,
        codMaxTotal: s.codMaxTotal,
        delivery: {
          distance: distance.map((r) => ({
            fromKm: r.fromM / 1000,
            toKm: r.toM / 1000,
            fee: r.fee,
            etaText: r.etaText,
            minOrder: r.minOrder,
          })),
          zones: zones.map((z) => ({ id: z.id, name: z.name, fee: z.fee, etaText: z.etaText })),
          freeDeliveryFrom: s.freeDeliveryFrom,
        },
        stampCard: await this.stampCard(),
        membersCount: joined?.n ?? 0,
      },
      catalog: await this.menu(shop.isDemo),
    });
  }

  /** The public stamp card: the shop's saved card, or Off until the owner sets it up. */
  async stampCard(): Promise<PublicStampCard> {
    const [card] = await this.db.tx
      .select()
      .from(stampCards)
      .where(eq(stampCards.tenantId, this.db.shopId));
    if (!card) return OFF_CARD;
    return {
      status: card.status === 'on' || card.status === 'paused' ? card.status : 'off',
      rule: {
        minOrderTotal: card.minOrderTotal,
        stampsNeeded: card.stampsNeeded,
        welcomeStamps: card.welcomeStamps === 0 ? 0 : 1,
        maxEarned: card.maxEarned,
        period:
          card.period === 'day' || card.period === 'week' || card.period === 'month'
            ? card.period
            : null,
      },
      reward: {
        kind:
          card.rewardKind === 'free_item' || card.rewardKind === 'custom'
            ? card.rewardKind
            : 'discount',
        amount: card.rewardAmount,
        itemId: card.rewardItemId,
        variantId: card.rewardVariantId,
        title: card.rewardTitle,
        description: card.rewardDescription,
        image: await this.media.refById(card.rewardMediaId),
        quantityTotal: card.quantityTotal,
        quantityLeft: card.quantityLeft,
        onePerCustomer: card.onePerCustomer,
      },
    };
  }

  /**
   * The menu customers see: archived items stay out (hidden ones stay in, so an order or the prize can still
   * name them; the storefront shows active items only). Sample items show only on a demo shop.
   */
  private async menu(isDemo: boolean) {
    // The schema drops the owner-only fields (hasOrders, usedBy).
    return CatalogSchema.parse({
      categories: await this.catalog.listCategories(),
      items: (await this.catalog.listItems()).filter(
        (item) => item.status !== 'archived' && (isDemo || !item.sample),
      ),
      optionGroups: await this.catalog.listOptionGroups(),
    });
  }
}
