import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  canAskToGoLive,
  defaultVariantTemplates,
  isShopSlug,
  metaEventId,
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
  type BrowserTrackEvent,
  type RegisterShopInput,
  type SignupLeadInput,
  type TrackInput,
} from '@smartapp/core';
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
  variantTemplates,
  variantTemplateValues,
} from '../db/generated/schema.js';
import type { CallerUser } from '../auth/caller.js';
import { TrackWriter } from '../platform/track-writer.js';

/** The visitor's or owner's own request, for Meta (T118 Q2): never the founder's. */
export interface RequestClient {
  ip: string | null;
  ua: string | null;
  // A Super Admin is signed in (the founder trying sign-up): events are kept as skipped (T118 section 4.3).
  adminCaller: boolean;
}

// The browser may report these on /track; Lead and CompleteRegistration come with their own steps.
const TRACKED_BY_BROWSER: readonly BrowserTrackEvent[] = ['PageView', 'Contact'];

/**
 * Shops: their links, sign-up and going live (api.md "Shop" and "Sign-up and going live"). Every method runs
 * inside the request's transaction (ScopeInterceptor), so registerShop's rows all land or none do (X11).
 */
@Injectable()
export class ShopService {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(TrackWriter) private readonly track: TrackWriter,
  ) {}

  async isSlugFree(slug: string): Promise<boolean> {
    if (!isShopSlug(slug)) return false;
    const result = await this.db.tx.execute<{ free: boolean }>(
      sql`select private.slug_is_free(${slug}) as free`,
    );
    return result.rows[0]?.free === true;
  }

  /** The signed-in owner's shop or null (sign-up stopped before the shop step). In help mode, the helped shop. */
  async getMyShop(user: CallerUser): Promise<MyShop | null> {
    const shopId = this.db.helping ? this.db.shopId : await this.shopIdOf(user.id);
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

  /** Sign-up step 1 (T89): saved before any account exists, with Meta's Lead (the browser's event id). */
  async saveSignupLead(input: SignupLeadInput, client: RequestClient): Promise<{ leadId: string }> {
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
    await this.track.write({
      name: 'Lead',
      eventId: input.eventId,
      via: 'browser_server',
      status: 'queued',
      tenantId: null,
      leadId,
      person: {
        email: input.email,
        phone: input.phone,
        fullName: input.fullName,
        externalId: leadId,
        fbp: input.fbp,
        fbc: input.fbc,
      },
      pageUrl: input.pageUrl,
      actionSource: 'website',
      causedBy: 'visitor',
      client,
      block: { adminCaller: client.adminCaller },
    });
    return { leadId };
  }

  /** The sign-up page's PageView and Contact (T90): kept for the sender, never answered with Meta's reply. */
  async trackBrowser(input: TrackInput, client: RequestClient): Promise<void> {
    if (!TRACKED_BY_BROWSER.includes(input.name)) return;
    await this.track.write({
      name: input.name,
      eventId: input.eventId,
      via: 'browser_server',
      status: 'queued',
      tenantId: null,
      person: { fbp: input.fbp, fbc: input.fbc },
      pageUrl: input.pageUrl,
      actionSource: 'website',
      causedBy: 'visitor',
      client,
      block: { adminCaller: client.adminCaller },
    });
  }

  /**
   * Sign-up step 3, after the email code (X11): the shop, its owner, its settings and look rows, and the
   * lead hand-over, in one transaction. The price comes from platform_settings, never from the browser.
   */
  async registerShop(
    user: CallerUser,
    input: RegisterShopInput,
    client: RequestClient,
  ): Promise<OwnerOnboarding> {
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
    // The kind's ready-made variants (Size, Cup size...), as a new shop on sample data starts with.
    for (const [i, template] of defaultVariantTemplates(input.shop.kind).entries()) {
      const templateId = randomUUID();
      // The list shows them oldest first; a millisecond apart keeps the kind's own order.
      await this.db.tx.insert(variantTemplates).values({
        id: templateId,
        tenantId: shopId,
        name: template.name,
        createdAt: sql`now() + make_interval(secs => ${i} / 1000.0)`,
      });
      await this.db.tx.insert(variantTemplateValues).values(
        template.options.map((option, sort) => ({
          tenantId: shopId,
          templateId,
          label: option.name,
          sort,
        })),
      );
    }
    if (lead?.phone) {
      await this.db.tx
        .update(profiles)
        .set({ phone: lead.phone, updatedAt: sql`now()` })
        .where(eq(profiles.id, user.id));
    }
    const fromLead = lead ? await this.leadCookies(shopId) : null;
    await this.track.write({
      name: 'CompleteRegistration',
      eventId: input.eventId,
      via: 'browser_server',
      status: 'queued',
      tenantId: shopId,
      leadId: input.leadId,
      person: {
        email: user.email,
        phone: lead?.phone ?? null,
        fullName: user.fullName,
        city: input.shop.city,
        externalId: user.id,
        fbp: input.fbp ?? fromLead?.fbp ?? null,
        fbc: input.fbc ?? fromLead?.fbc ?? null,
      },
      pageUrl: input.pageUrl,
      actionSource: 'website',
      causedBy: 'owner',
      client,
      block: { adminCaller: client.adminCaller || user.isAdmin },
    });
    return this.onboardingOf(shopId);
  }

  async getOnboarding(shopId: string): Promise<OwnerOnboarding> {
    return this.onboardingOf(shopId);
  }

  async askToGoLive(
    shopId: string,
    user: CallerUser,
    client: RequestClient,
  ): Promise<OwnerOnboarding> {
    const current = await this.onboardingOf(shopId);
    if (!canAskToGoLive(current.stage, current.steps))
      throw new ApiFailure('setup_incomplete', 409);
    await this.db.tx
      .update(tenants)
      .set({ stage: 'asked', askedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(tenants.id, shopId));
    const [shop] = await this.db.tx
      .select({ city: tenants.city, isDemo: tenants.isDemo, isTest: tenants.isTest })
      .from(tenants)
      .where(eq(tenants.id, shopId));
    const helping = this.db.helping !== null;
    const cookies = await this.leadCookies(shopId);
    await this.track.write({
      name: 'SubmitApplication',
      eventId: metaEventId('SubmitApplication', shopId),
      via: 'server',
      status: 'queued',
      tenantId: shopId,
      person: {
        email: user.email,
        fullName: user.fullName,
        city: shop?.city ?? null,
        externalId: user.id,
        fbp: cookies?.fbp ?? null,
        fbc: cookies?.fbc ?? null,
      },
      actionSource: 'website',
      causedBy: 'owner',
      client,
      block: {
        adminCaller: !helping && client.adminCaller,
        helpMode: helping,
        isDemo: shop?.isDemo === true,
        isTest: shop?.isTest === true,
      },
    });
    return this.onboardingOf(shopId);
  }

  /** Meta's own cookies from the shop's sign-up lead, so later events match the same person. */
  private async leadCookies(
    shopId: string,
  ): Promise<{ fbp: string | null; fbc: string | null } | null> {
    const [lead] = await this.db.tx
      .select({ fbp: signupLeads.fbp, fbc: signupLeads.fbc })
      .from(signupLeads)
      .where(eq(signupLeads.tenantId, shopId))
      .limit(1);
    return lead ?? null;
  }

  /** The owner's mobile on their profile (a shop the founder makes for a client). */
  async setOwnerPhone(userId: string, phone: string): Promise<void> {
    await this.db.tx
      .update(profiles)
      .set({ phone, updatedAt: sql`now()` })
      .where(eq(profiles.id, userId));
  }

  /** The shop an owner just made; Not found when there is none. */
  async shopOfOwner(userId: string): Promise<string> {
    const shopId = await this.shopIdOf(userId);
    if (!shopId) throw notFound();
    return shopId;
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
