import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  RegisterShopInputSchema,
  SignupLeadInputSchema,
  TrackInputSchema,
  type MyShop,
  type OwnerOnboarding,
  type RegisterShopInput,
  type SignupLeadInput,
  type SignupLeadResult,
  type TrackInput,
  type Ok,
} from '@smartapp/core';
import type { Request } from 'express';
import type { CallerShop, CallerUser } from '../auth/caller.js';
import {
  Can,
  CurrentShop,
  CurrentUser,
  MaybeUser,
  NoTransaction,
  Public,
} from '../auth/decorators.js';
import { Db } from '../db/db.service.js';
import { userAgentOf } from '../platform/track-writer.js';
import { ShopService, type RequestClient } from './shop.service.js';

function clientOf(req: Request, user: CallerUser | null): RequestClient {
  return {
    ip: req.ip ?? null,
    ua: userAgentOf(req.headers['user-agent']),
    adminCaller: user?.isAdmin === true,
  };
}

const SIGNUP_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@Controller()
export class ShopController {
  constructor(
    @Inject(ShopService) private readonly shops: ShopService,
    @Inject(Db) private readonly db: Db,
  ) {}

  @Get('slugs/:slug')
  @Public()
  async isSlugFree(@Param('slug') slug: string): Promise<{ free: boolean }> {
    return { free: await this.shops.isSlugFree(slug.toLowerCase()) };
  }

  @Get('owner/shop')
  @Can('account')
  async getMyShop(@CurrentUser() user: CallerUser): Promise<{ shop: MyShop | null }> {
    return { shop: await this.shops.getMyShop(user) };
  }

  @Post('signup/leads')
  @Public()
  @HttpCode(201)
  @Throttle(SIGNUP_LIMIT)
  saveSignupLead(
    @Req() req: Request,
    @MaybeUser() user: CallerUser | null,
    @Body({ schema: SignupLeadInputSchema }) body: SignupLeadInput,
  ): Promise<SignupLeadResult> {
    return this.shops.saveSignupLead(body, clientOf(req, user));
  }

  /**
   * The sign-up page's Meta events (T90, T118). Kept in the outbox and answered at once, so the page never
   * waits on Meta; the sender job sends them on to the Conversions API.
   */
  @Post('track')
  @Public()
  @NoTransaction()
  @HttpCode(200)
  @Throttle(SIGNUP_LIMIT)
  async track(
    @Req() req: Request,
    @MaybeUser() user: CallerUser | null,
    @Body({ schema: TrackInputSchema }) body: TrackInput,
  ): Promise<Ok> {
    await this.db.run({ userId: null, shopId: null, role: 'api' }, () =>
      this.shops.trackBrowser(body, clientOf(req, user)),
    );
    return { ok: true };
  }

  @Post('signup/shop')
  @Can('account')
  @HttpCode(201)
  @Throttle(SIGNUP_LIMIT)
  registerShop(
    @CurrentUser() user: CallerUser,
    @Req() req: Request,
    @Body({ schema: RegisterShopInputSchema }) body: RegisterShopInput,
  ): Promise<OwnerOnboarding> {
    return this.shops.registerShop(user, body, clientOf(req, user));
  }

  @Get('owner/onboarding')
  @Can('shop:view')
  getOnboarding(@CurrentShop() shop: CallerShop): Promise<OwnerOnboarding> {
    return this.shops.getOnboarding(shop.id);
  }

  @Post('owner/onboarding/ask')
  @Can('settings:manage')
  @HttpCode(200)
  askToGoLive(
    @CurrentShop() shop: CallerShop,
    @CurrentUser() user: CallerUser,
    @Req() req: Request,
  ): Promise<OwnerOnboarding> {
    return this.shops.askToGoLive(shop.id, user, clientOf(req, user));
  }
}
