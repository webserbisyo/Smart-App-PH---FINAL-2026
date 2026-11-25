import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  isShopSlug,
  MyShopSchema,
  newShopContent,
  OwnerOnboardingSchema,
  SETUP_MIN_ITEMS,
  ShopStageEnum,
  slugCandidates,
  StorefrontContentSchema,
  type MyShop,
  type OnboardingStep,
  type OwnerOnboarding,
  type RegisterShopInput,
  type SignupLeadInput,
} from '@smartapp/core';
import { canAskToGoLive } from '@smartapp/core/rules/platform.js';
import { and, count, eq, gt, isNull, sql } from 'drizzle-orm';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import {
  items,
  openingHours,
  paymentAccounts,
  platformSettings,
  profiles,
  shopSettings,
  signupLeads,
  storefrontContent,
  supportSessions,
  tenantMembers,
  tenants,
} from '../db/generated/schema.js';
import type { CallerUser } from '../auth/caller.js';

/**
 * Shops: their links, sign-up and going live (api.md "Shop" and "Sign-up and going live"). Every method runs
 * inside the request's transaction (ScopeInterceptor), so registerShop's rows all land or none do (X11).
 */
@Injectable()
export class ShopService {
  constructor(@Inject(Db) private readonly db: Db) {}

  async isSlugFree(slug: string): Promise<boolean> {
    if (!isShopSlug(slug)) return false;
    const result = await this.db.tx.execute<{ free: boolean }>(
      sql`select private.slug_is_free(${slug}) as free`,
    );
    return result.rows[0]?.free === true;
  }

  /** The signed-in owner's shop or null (sign-up stopped before the shop step). */
  async getMyShop(user: CallerUser): Promise<MyShop | null> {
    const shopId = await this.shopIdOf(user.id);
    if (!shopId) return null;
    await this.db.useShop(shopId);
    const [row] = await this.db.tx
      .select({
        id: tenants.id,
        slug: tenants.slug,
        name: tenants.name,
        kind: tenants.kind,
        stage: tenants.stage,
        isDemo: tenants.isDemo,
      })
      .from(tenants)
      .where(eq(tenants.id, shopId));
    return row ? MyShopSchema.parse(row) : null;
  }

  /** Sign-up step 1 (T89): saved before any account exists. Meta's Lead event comes in phase 7. */
  async saveSignupLead(input: SignupLeadInput): Promise<{ leadId: string }> {
    // The id is made here: the API's role may add a lead but not read one back (RLS), so no RETURNING.
    const leadId = randomUUID();
    await this.db.tx.insert(signupLeads).values({
      id: leadId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      termsVersion: input.termsVersion,
      channel: input.source.channel,
      campaign: input.source.campaign,
      fbp: input.fbp,
      fbc: input.fbc,
    });
    return { leadId };
  }

  /**
   * Sign-up step 3, after the email code (X11): the shop, its owner, its settings and look rows, and the
   * lead hand-over, in one transaction. The price comes from platform_settings, never from the browser.
   */
  async registerShop(user: CallerUser, input: RegisterShopInput): Promise<OwnerOnboarding> {
    if (await this.shopIdOf(user.id)) throw new ApiFailure('already_has_shop', 409);
    const [platform] = await this.db.tx
      .select({ priceMonthly: platformSettings.priceMonthly })
      .from(platformSettings)
      .limit(1);
    if (!platform) throw new ApiFailure('unknown', 500);

    const slug = await this.freeSlug(input.shop.shopName, input.shop.city);
    const shopId = randomUUID();
    await this.db.useShop(shopId);

    const lead = input.leadId ? await this.claimLead(input.leadId, user.email) : null;
    await this.db.tx.insert(tenants).values({
      id: shopId,
      slug,
      name: input.shop.shopName,
      kind: input.shop.kind,
      city: input.shop.city,
      facebookPage: input.shop.facebookPage,
      channel: lead?.channel ?? 'direct',
      campaign: lead?.campaign ?? null,
      priceMonthly: platform.priceMonthly,
    });
    await this.db.tx
      .insert(tenantMembers)
      .values({ tenantId: shopId, userId: user.id, role: 'owner' });
    await this.db.tx.insert(shopSettings).values({ tenantId: shopId });
    const content = StorefrontContentSchema.parse(newShopContent(input.shop.brandColor));
    await this.db.tx
      .insert(storefrontContent)
      .values({ tenantId: shopId, draft: content, published: content });
    if (lead?.phone) {
      await this.db.tx
        .update(profiles)
        .set({ phone: lead.phone, updatedAt: sql`now()` })
        .where(eq(profiles.id, user.id));
    }
    return this.onboardingOf(shopId);
  }

  async getOnboarding(shopId: string): Promise<OwnerOnboarding> {
    return this.onboardingOf(shopId);
  }

  async askToGoLive(shopId: string): Promise<OwnerOnboarding> {
    const current = await this.onboardingOf(shopId);
    if (!canAskToGoLive(current.stage, current.steps))
      throw new ApiFailure('setup_incomplete', 409);
    await this.db.tx
      .update(tenants)
      .set({ stage: 'asked', askedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(tenants.id, shopId));
    return this.onboardingOf(shopId);
  }

  private async shopIdOf(userId: string): Promise<string | null> {
    const [member] = await this.db.tx
      .select({ tenantId: tenantMembers.tenantId })
      .from(tenantMembers)
      .where(eq(tenantMembers.userId, userId))
      .limit(1);
    return member?.tenantId ?? null;
  }

  /** The first free link for this name; a random ending when the name and its city are all taken. */
  private async freeSlug(name: string, city: string): Promise<string> {
    for (const candidate of slugCandidates(name, city)) {
      if (await this.isSlugFree(candidate)) return candidate;
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const [first] = slugCandidates(name, city);
      const root = (first ?? 'shop').slice(0, 34).replace(/-+$/, '');
      const candidate = `${root}-${randomUUID().slice(0, 5)}`;
      if (await this.isSlugFree(candidate)) return candidate;
    }
    throw new ApiFailure('slug_taken', 409);
  }

  private async claimLead(
    leadId: string,
    email: string,
  ): Promise<{ channel: string; campaign: string | null; phone: string } | null> {
    const result = await this.db.tx.execute<{
      channel: string;
      campaign: string | null;
      phone: string;
    }>(
      sql`select channel, campaign, phone from private.claim_signup_lead(${leadId}::uuid, ${email})`,
    );
    return result.rows[0] ?? null;
  }

  private async onboardingOf(shopId: string): Promise<OwnerOnboarding> {
    const [shop] = await this.db.tx
      .select({ stage: tenants.stage, askedAt: tenants.askedAt, liveAt: tenants.liveAt })
      .from(tenants)
      .where(eq(tenants.id, shopId));
    if (!shop) throw notFound();

    const [activeItems] = await this.db.tx
      .select({ n: count() })
      .from(items)
      .where(and(eq(items.tenantId, shopId), eq(items.status, 'active')));
    const [content] = await this.db.tx
      .select({ published: storefrontContent.published })
      .from(storefrontContent)
      .where(eq(storefrontContent.tenantId, shopId));
    const [hours] = await this.db.tx
      .select({ n: count() })
      .from(openingHours)
      .where(eq(openingHours.tenantId, shopId));
    const [payments] = await this.db.tx
      .select({ n: count() })
      .from(paymentAccounts)
      .where(and(eq(paymentAccounts.tenantId, shopId), isNull(paymentAccounts.removedAt)));
    const [help] = await this.db.tx
      .select({ n: count() })
      .from(supportSessions)
      .where(
        and(
          eq(supportSessions.tenantId, shopId),
          isNull(supportSessions.endedAt),
          gt(supportSessions.endsAt, sql`now()`),
        ),
      );

    const published = StorefrontContentSchema.safeParse(content?.published);
    const steps: OnboardingStep[] = [
      { step: 'items', done: (activeItems?.n ?? 0) >= SETUP_MIN_ITEMS },
      { step: 'look', done: published.success && published.data.logo !== null },
      { step: 'hours', done: (hours?.n ?? 0) > 0 },
      { step: 'payments', done: (payments?.n ?? 0) > 0 },
    ];
    return OwnerOnboardingSchema.parse({
      stage: ShopStageEnum.parse(shop.stage),
      askedAt: shop.askedAt ? new Date(shop.askedAt).toISOString() : null,
      liveAt: shop.liveAt ? new Date(shop.liveAt).toISOString() : null,
      steps,
      helpedNow: (help?.n ?? 0) > 0,
    });
  }
}
