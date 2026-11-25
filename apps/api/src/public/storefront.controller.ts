import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  OrderPayloadSchema,
  OrderTypeEnum,
  type OrderPayload,
  type PublicShop,
  type Quote,
  type Schedule,
} from '@smartapp/core';
import { z } from 'zod';
import { Public } from '../auth/decorators.js';
import { StorefrontService, type PlacedOrder } from './storefront.service.js';

// Phones in the Philippines share addresses (carrier NAT, R12): a generous per-address ceiling here, and the
// real limits per phone and per shop inside Place order.
export const STOREFRONT_LIMIT = { default: { limit: 300, ttl: 60_000 } };

const ScheduleInputSchema = z
  .object({
    type: OrderTypeEnum,
    lines: z
      .array(z.object({ itemId: z.string().min(1).max(40), qty: z.number().int().min(1).max(999) }))
      .max(50),
  })
  .strict();
type ScheduleInput = z.infer<typeof ScheduleInputSchema>;

const PlaceOrderBodySchema = OrderPayloadSchema.extend({ clientKey: z.string().min(8).max(64) });
type PlaceOrderBody = z.infer<typeof PlaceOrderBodySchema>;

const PreviewQuerySchema = z.object({ token: z.string().min(1).max(200) });

/** api.md "Storefront (public)": anyone may call these; the shop comes from the link's slug. */
@Controller('s/:slug')
@Public()
@Throttle(STOREFRONT_LIMIT)
export class StorefrontController {
  constructor(@Inject(StorefrontService) private readonly storefront: StorefrontService) {}

  @Get()
  getStorefront(@Param('slug') slug: string): Promise<PublicShop> {
    return this.storefront.getStorefront(slug);
  }

  @Get('preview')
  getStorefrontPreview(
    @Param('slug') slug: string,
    @Query({ schema: PreviewQuerySchema }) query: z.infer<typeof PreviewQuerySchema>,
  ): Promise<PublicShop> {
    return this.storefront.getStorefrontPreview(slug, query.token);
  }

  // POST: the basket's lines ride in the body (a GET body is not dependable).
  @Post('schedule')
  @HttpCode(200)
  getSchedule(
    @Param('slug') slug: string,
    @Body({ schema: ScheduleInputSchema }) body: ScheduleInput,
  ): Promise<Schedule> {
    return this.storefront.getSchedule(slug, body.lines);
  }

  @Post('quote')
  @HttpCode(200)
  quoteOrder(
    @Param('slug') slug: string,
    @Body({ schema: OrderPayloadSchema }) body: OrderPayload,
  ): Promise<Quote> {
    return this.storefront.quoteOrder(slug, body);
  }

  @Post('orders')
  @HttpCode(200)
  placeOrder(
    @Param('slug') slug: string,
    @Body({ schema: PlaceOrderBodySchema }) body: PlaceOrderBody,
  ): Promise<PlacedOrder> {
    const { clientKey, ...payload } = body;
    return this.storefront.placeOrder(slug, payload, clientKey);
  }
}
