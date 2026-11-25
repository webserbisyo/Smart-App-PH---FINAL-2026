import { Body, Controller, Get, Headers, HttpCode, Inject, Post } from '@nestjs/common';
import { z } from 'zod';
import type { CallerUser } from '../auth/caller.js';
import { Can, CurrentUser, NoTransaction, Public } from '../auth/decorators.js';
import { platformOf, PushSubscriptionInputSchema } from './push-endpoints.js';
import { PushSender } from './push-sender.js';
import { PushSubscriptions } from './push-subscriptions.service.js';

const OwnerSubscribeSchema = z.object({ subscription: PushSubscriptionInputSchema }).strict();
type OwnerSubscribe = z.infer<typeof OwnerSubscribeSchema>;
const EndpointSchema = z.object({ endpoint: z.string().min(10).max(1000) }).strict();
type EndpointInput = z.infer<typeof EndpointSchema>;

/**
 * Push keys and the owner's own devices (launch phase 5, section 5 and Q2): the public key every browser
 * subscribes with, and "Turn on new-order alerts" in Settings › Notifications.
 */
@Controller()
export class PushController {
  constructor(
    @Inject(PushSender) private readonly sender: PushSender,
    @Inject(PushSubscriptions) private readonly subscriptions: PushSubscriptions,
  ) {}

  /** The platform's public key (Q5); null on a laptop without keys, where pushes are only recorded. */
  @Get('push/key')
  @Public()
  @NoTransaction()
  key(): { key: string | null } {
    return { key: this.sender.publicKey };
  }

  @Post('owner/push')
  @HttpCode(200)
  @Can('shop:view')
  async subscribe(
    @CurrentUser() user: CallerUser,
    @Body({ schema: OwnerSubscribeSchema }) body: OwnerSubscribe,
    @Headers('user-agent') userAgent: string | undefined,
  ): Promise<{ on: boolean }> {
    await this.subscriptions.save(body.subscription, platformOf(userAgent), user.id);
    return { on: true };
  }

  @Post('owner/push/check')
  @HttpCode(200)
  @Can('shop:view')
  async check(
    @CurrentUser() user: CallerUser,
    @Body({ schema: EndpointSchema }) body: EndpointInput,
  ): Promise<{ on: boolean }> {
    return { on: await this.subscriptions.isOwnerDevice(body.endpoint, user.id) };
  }

  @Post('owner/push/off')
  @HttpCode(200)
  @Can('shop:view')
  async off(
    @CurrentUser() user: CallerUser,
    @Body({ schema: EndpointSchema }) body: EndpointInput,
  ): Promise<{ on: boolean }> {
    await this.subscriptions.removeOwnerDevice(body.endpoint, user.id);
    return { on: false };
  }
}
