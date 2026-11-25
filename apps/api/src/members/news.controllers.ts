import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  NewsTestInputSchema,
  PushSettingsSchema,
  SaveNewsInputSchema,
  type NewsOverview,
  type NewsTestInput,
  type OwnerNews,
  type PushSettings,
  type SaveNewsInput,
  type ShopNewsItem,
} from '@smartapp/core';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Can, Public } from '../auth/decorators.js';
import { SessionService } from '../auth/session.service.js';
import { STOREFRONT_LIMIT } from '../public/storefront.controller.js';
import { PushSubscriptionInputSchema } from '../push/push-endpoints.js';
import { OwnerNewsService } from './owner-news.service.js';
import { ShopNewsService } from './shop-news.service.js';

/** api.md "News (owner)": reads need `shop:view`, every change `members:manage` (T106, phase 6). */
@Controller('owner')
export class OwnerNewsController {
  constructor(@Inject(OwnerNewsService) private readonly news: OwnerNewsService) {}

  @Get('news')
  @Can('shop:view')
  overview(): Promise<NewsOverview> {
    return this.news.overview();
  }

  // Before `news/:id`, so "test" is never read as an id.
  @Post('news/test')
  @HttpCode(200)
  @Can('members:manage')
  test(@Body({ schema: NewsTestInputSchema }) body: NewsTestInput): Promise<{ ok: true }> {
    return this.news.test(body);
  }

  @Get('news/:id')
  @Can('shop:view')
  get(@Param('id') id: string): Promise<OwnerNews> {
    return this.news.get(id);
  }

  @Post('news')
  @HttpCode(200)
  @Can('members:manage')
  create(@Body({ schema: SaveNewsInputSchema }) body: SaveNewsInput): Promise<OwnerNews> {
    return this.news.save(null, body);
  }

  @Patch('news/:id')
  @Can('members:manage')
  update(
    @Param('id') id: string,
    @Body({ schema: SaveNewsInputSchema }) body: SaveNewsInput,
  ): Promise<OwnerNews> {
    return this.news.save(id, body);
  }

  @Post('news/:id/cancel')
  @HttpCode(200)
  @Can('members:manage')
  cancel(@Param('id') id: string): Promise<OwnerNews> {
    return this.news.cancel(id);
  }

  @Delete('news/:id')
  @Can('members:manage')
  remove(@Param('id') id: string): Promise<{ ok: true }> {
    return this.news.remove(id);
  }

  @Put('push-settings')
  @Can('members:manage')
  savePushSettings(
    @Body({ schema: PushSettingsSchema }) body: PushSettings,
  ): Promise<PushSettings> {
    return this.news.savePushSettings(body);
  }
}

const EndpointSchema = z.object({ endpoint: z.string().min(10).max(1000) }).strict();
type EndpointInput = z.infer<typeof EndpointSchema>;
const ChoiceSchema = z
  .object({ subscription: PushSubscriptionInputSchema, news: z.boolean() })
  .strict();
type ChoiceInput = z.infer<typeof ChoiceSchema>;
const OpenedSchema = z.object({ deliveryId: z.string().min(1).max(64) }).strict();
type OpenedInput = z.infer<typeof OpenedSchema>;

/** The storefront's news rows (api.md "Storefront", T106): the phone's choice, the inbox, a tapped push. */
@Controller('s/:slug')
@Public()
@Throttle(STOREFRONT_LIMIT)
export class ShopNewsController {
  constructor(
    @Inject(ShopNewsService) private readonly news: ShopNewsService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  // The phone's push address goes in the body, never in an address that logs keep.
  @Post('push/news/check')
  @HttpCode(200)
  choice(
    @Param('slug') slug: string,
    @Body({ schema: EndpointSchema }) body: EndpointInput,
  ): Promise<{ news: boolean }> {
    return this.news.choice(slug, body.endpoint);
  }

  @Put('push/news')
  async setChoice(
    @Param('slug') slug: string,
    @Body({ schema: ChoiceSchema }) body: ChoiceInput,
    @Headers('user-agent') userAgent: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ news: boolean }> {
    return this.news.setChoice(slug, body, await this.sessions.member(req, res), userAgent);
  }

  @Get('news')
  inbox(@Param('slug') slug: string): Promise<ShopNewsItem[]> {
    return this.news.inbox(slug);
  }

  @Post('news/opened')
  @HttpCode(200)
  opened(
    @Param('slug') slug: string,
    @Body({ schema: OpenedSchema }) body: OpenedInput,
  ): Promise<{ ok: true }> {
    return this.news.opened(slug, body.deliveryId);
  }
}
