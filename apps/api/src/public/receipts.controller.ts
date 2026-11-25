import { Body, Controller, Get, Headers, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  PaymentMethodEnum,
  type OrderRating,
  type OrderReceipt,
  type OrderRow,
  type Payment,
} from '@smartapp/core';
import { z } from 'zod';
import { Public } from '../auth/decorators.js';
import { PushSubscriptionInputSchema } from '../push/push-endpoints.js';
import { MAX_TOKENS, ReceiptsService } from './receipts.service.js';
import { STOREFRONT_LIMIT } from './storefront.controller.js';

const MyOrdersInputSchema = z
  .object({ tokens: z.array(z.string().min(1).max(64)).max(MAX_TOKENS) })
  .strict();
type MyOrdersInput = z.infer<typeof MyOrdersInputSchema>;

const ProofInputSchema = z
  .object({
    method: PaymentMethodEnum,
    referenceNo: z.string().max(40),
    path: z.string().min(1).max(200),
  })
  .strict();
type ProofInput = z.infer<typeof ProofInputSchema>;

const RatingInputSchema = z
  .object({
    stars: z.number().int().min(1).max(5),
    comment: z.string().max(300).nullable(),
  })
  .strict();
type RatingInput = z.infer<typeof RatingInputSchema>;

const PushInputSchema = z.object({ subscription: PushSubscriptionInputSchema }).strict();
type PushInput = z.infer<typeof PushInputSchema>;

/**
 * The receipt link (`/[shop]/o/[token]`) and the orders a phone kept (api.md "Storefront"). The slug picks the
 * shop, the token picks the order; reading the tokens list rides in a POST body so the links stay out of
 * address logs.
 */
@Controller('s/:slug')
@Public()
@Throttle(STOREFRONT_LIMIT)
export class ReceiptsController {
  constructor(@Inject(ReceiptsService) private readonly receipts: ReceiptsService) {}

  @Post('my-orders')
  @HttpCode(200)
  listMyOrders(
    @Param('slug') slug: string,
    @Body({ schema: MyOrdersInputSchema }) body: MyOrdersInput,
  ): Promise<OrderRow[]> {
    return this.receipts.listMyOrders(slug, body.tokens);
  }

  @Get('o/:token')
  getOrder(@Param('slug') slug: string, @Param('token') token: string): Promise<OrderReceipt> {
    return this.receipts.getOrder(slug, token);
  }

  @Post('o/:token/proof-upload')
  @HttpCode(200)
  createProofUploadUrl(
    @Param('slug') slug: string,
    @Param('token') token: string,
  ): Promise<{ uploadUrl: string; path: string }> {
    return this.receipts.createProofUploadUrl(slug, token);
  }

  @Post('o/:token/proof')
  @HttpCode(200)
  submitProof(
    @Param('slug') slug: string,
    @Param('token') token: string,
    @Body({ schema: ProofInputSchema }) body: ProofInput,
  ): Promise<Payment> {
    return this.receipts.submitProof(slug, token, body);
  }

  @Post('o/:token/rating')
  @HttpCode(200)
  rateOrder(
    @Param('slug') slug: string,
    @Param('token') token: string,
    @Body({ schema: RatingInputSchema }) body: RatingInput,
  ): Promise<OrderRating> {
    return this.receipts.rateOrder(slug, token, body);
  }

  @Post('o/:token/push')
  @HttpCode(200)
  subscribePush(
    @Param('slug') slug: string,
    @Param('token') token: string,
    @Body({ schema: PushInputSchema }) body: PushInput,
    @Headers('user-agent') userAgent: string | undefined,
  ): Promise<{ ok: true }> {
    return this.receipts.subscribePush(slug, token, body.subscription, userAgent);
  }
}
