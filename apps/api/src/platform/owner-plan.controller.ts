import { Body, Controller, Get, HttpCode, Inject, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  SendBillingNoteInputSchema,
  SendBillingPhotoInputSchema,
  SubmitPlanPaymentInputSchema,
  type Plan,
  type SendBillingNoteInput,
  type SendBillingPhotoInput,
  type SubmitPlanPaymentInput,
} from '@smartapp/core';
import type { Request } from 'express';
import type { CallerUser } from '../auth/caller.js';
import { Can, CurrentUser, NotInHelp } from '../auth/decorators.js';
import { userAgentOf } from './track-writer.js';
import { OwnerPlanService } from './owner-plan.service.js';

const PAYMENT_LIMIT = { default: { limit: 10, ttl: 60_000 } };

/** api.md "Settings › Plan" (T67, T88, T107, T118): the owner's plan, payments and Billing chat. */
@Controller('owner/plan')
export class OwnerPlanController {
  constructor(@Inject(OwnerPlanService) private readonly plan: OwnerPlanService) {}

  @Get()
  @Can('shop:view')
  getPlan(): Promise<Plan> {
    return this.plan.getPlan();
  }

  @Post('payments')
  @NotInHelp()
  @Can('settings:manage')
  @HttpCode(201)
  @Throttle(PAYMENT_LIMIT)
  submitPayment(
    @CurrentUser() user: CallerUser,
    @Req() req: Request,
    @Body({ schema: SubmitPlanPaymentInputSchema }) body: SubmitPlanPaymentInput,
  ): Promise<Plan> {
    return this.plan.submitPayment(
      user,
      { ip: req.ip ?? null, ua: userAgentOf(req.headers['user-agent']) },
      body,
    );
  }

  @Post('notes')
  @Can('settings:manage')
  @HttpCode(201)
  sendNote(
    @Body({ schema: SendBillingNoteInputSchema }) body: SendBillingNoteInput,
  ): Promise<Plan> {
    return this.plan.sendNote(body);
  }

  @Post('photos')
  @NotInHelp()
  @Can('settings:manage')
  @HttpCode(201)
  sendPhoto(
    @Body({ schema: SendBillingPhotoInputSchema }) body: SendBillingPhotoInput,
  ): Promise<Plan> {
    return this.plan.sendPhoto(body);
  }

  @Post('seen')
  @Can('shop:view')
  @HttpCode(200)
  markSeen(): Promise<Plan> {
    return this.plan.markSeen();
  }
}
