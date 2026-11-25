import { Body, Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
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
import type { CallerShop, CallerUser } from '../auth/caller.js';
import { Can, CurrentShop, CurrentUser, NoTransaction, Public } from '../auth/decorators.js';
import { ShopService } from './shop.service.js';

const SIGNUP_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@Controller()
export class ShopController {
  constructor(@Inject(ShopService) private readonly shops: ShopService) {}

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
    @Body({ schema: SignupLeadInputSchema }) body: SignupLeadInput,
  ): Promise<SignupLeadResult> {
    return this.shops.saveSignupLead(body);
  }

  /**
   * The sign-up page's Meta events (T90). Checked and answered now, so the page never waits on Meta; sending
   * them on to the Conversions API is its own launch phase (Meta), which adds the outbox behind this route.
   */
  @Post('track')
  @Public()
  @NoTransaction()
  @HttpCode(200)
  @Throttle(SIGNUP_LIMIT)
  track(@Body({ schema: TrackInputSchema }) body: TrackInput): Ok {
    void body; // checked by the schema; nothing is kept yet
    return { ok: true };
  }

  @Post('signup/shop')
  @Can('account')
  @HttpCode(201)
  @Throttle(SIGNUP_LIMIT)
  registerShop(
    @CurrentUser() user: CallerUser,
    @Body({ schema: RegisterShopInputSchema }) body: RegisterShopInput,
  ): Promise<OwnerOnboarding> {
    return this.shops.registerShop(user, body);
  }

  @Get('owner/onboarding')
  @Can('shop:view')
  getOnboarding(@CurrentShop() shop: CallerShop): Promise<OwnerOnboarding> {
    return this.shops.getOnboarding(shop.id);
  }

  @Post('owner/onboarding/ask')
  @Can('settings:manage')
  @HttpCode(200)
  askToGoLive(@CurrentShop() shop: CallerShop): Promise<OwnerOnboarding> {
    return this.shops.askToGoLive(shop.id);
  }
}
