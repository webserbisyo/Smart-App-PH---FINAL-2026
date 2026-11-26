import { randomUUID } from 'node:crypto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdminPaymentViewEnum,
  AdminShopFilterEnum,
  BillingNoteInputSchema,
  CloseShopInputSchema,
  CreateClientInputSchema,
  DeleteShopInputSchema,
  ExtendDaysInputSchema,
  PlatformSetupSchema,
  RecordPlanPaymentInputSchema,
  ReviewPlanPaymentInputSchema,
  SetTrackingInputSchema,
  StartSupportInputSchema,
  type AdminLead,
  type AdminPaymentList,
  type AdminShopDetail,
  type AdminShopList,
  type AdminToday,
  type CreateClientInput,
  type Ok,
  type PlatformSetup,
  type SetTrackingInput,
  type StartSupportInput,
  type SupportSession,
  type TrackingSummary,
} from '@smartapp/core';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AUTH_PROVIDER, type AuthProvider } from '../auth/auth-provider.js';
import type { CallerUser } from '../auth/caller.js';
import { Can, CurrentUser, NoTransaction } from '../auth/decorators.js';
import { clearSupportCookie, setSupportCookie } from '../auth/session-cookies.js';
import { clientInfo } from '../auth/session.service.js';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { secondStepRequired, type ApiEnv } from '../env.js';
import { ShopService } from '../shop/shop.service.js';
import { AdminReader } from './admin-reader.js';
import { AdminService } from './admin.service.js';
import { PlanReader } from './plan-reader.js';

const ReviewBodySchema = z.discriminatedUnion('verdict', [
  z.object({
    verdict: z.literal('approve'),
    amount: z.number().int().min(0).nullable(),
    amountReason: z.string().trim().max(120).nullable(),
  }),
  z.object({
    verdict: z.literal('reject'),
    reason: z.enum(['amount_short', 'unreadable', 'reference_not_found', 'wrong_account']),
  }),
]);
type ReviewBody = z.infer<typeof ReviewBodySchema>;
const RecordBodySchema = RecordPlanPaymentInputSchema.omit({ shopId: true });
type RecordBody = z.infer<typeof RecordBodySchema>;
const ExtendBodySchema = ExtendDaysInputSchema.omit({ shopId: true });
type ExtendBody = z.infer<typeof ExtendBodySchema>;
const NoteBodySchema = BillingNoteInputSchema.omit({ shopId: true });
type NoteBody = z.infer<typeof NoteBodySchema>;
const CloseBodySchema = CloseShopInputSchema.omit({ shopId: true });
type CloseBody = z.infer<typeof CloseBodySchema>;
const DeleteBodySchema = DeleteShopInputSchema.omit({ shopId: true });
type DeleteBody = z.infer<typeof DeleteBodySchema>;
const TestBodySchema = z.object({ isTest: z.boolean() });
type TestBody = z.infer<typeof TestBodySchema>;

// Any uuid: the demo shops' seeded ids are not all version 4.
const UUID = new ParseUUIDPipe();

/**
 * api.md "Super Admin" (T88 to T92, T118). Every route is `platform:admin`: ScopeInterceptor runs it as
 * app_admin and answers Not found to anyone without the admin flag (rule 12).
 */
@Controller('admin')
export class AdminController {
  private readonly env: ApiEnv;
  private readonly secondStep: boolean;

  constructor(
    @Inject(AdminReader) private readonly reader: AdminReader,
    @Inject(AdminService) private readonly admin: AdminService,
    @Inject(PlanReader) private readonly plans: PlanReader,
    @Inject(ShopService) private readonly shops: ShopService,
    @Inject(Db) private readonly db: Db,
    @Inject(AUTH_PROVIDER) private readonly auth: AuthProvider,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.env = config.get<ApiEnv>('APP_ENV') ?? 'development';
    this.secondStep = secondStepRequired(this.env, config.get<'on' | 'off'>('ADMIN_SECOND_STEP'));
  }

  @Get('today')
  @Can('platform:admin')
  today(): Promise<AdminToday> {
    return this.reader.today();
  }

  @Get('shops')
  @Can('platform:admin')
  shopList(
    @Query('filter') filter: string,
    @Query('q') q: string | undefined,
  ): Promise<AdminShopList> {
    return this.reader.list(AdminShopFilterEnum.catch('all').parse(filter), (q ?? '').slice(0, 60));
  }

  /**
   * A shop for a client (T88): their account, then the shop through sign-up's own steps as that owner, so it
   * is made exactly like any other. Three short transactions, so the founder's check runs here.
   */
  @Post('shops')
  @Can('platform:admin')
  @NoTransaction()
  @HttpCode(201)
  async createClient(
    @CurrentUser() user: CallerUser,
    @Req() req: Request,
    @Body({ schema: CreateClientInputSchema }) body: CreateClientInput,
  ): Promise<AdminShopDetail> {
    if (!user.isAdmin) throw notFound();
    // No transaction here, so the scope interceptor's second-step check is done by hand (T118 Q16).
    if (this.secondStep && user.aal2 !== true) throw new ApiFailure('second_step_needed', 403);
    const ownerId = await this.auth.createOwnerAccount(body.email, body.fullName);
    const owner: CallerUser = {
      id: ownerId,
      email: body.email,
      fullName: body.fullName,
      isAdmin: false,
    };
    await this.db.run({ userId: ownerId, shopId: null, role: 'api' }, async () => {
      await this.shops.setOwnerPhone(ownerId, body.phone);
      await this.shops.registerShop(
        owner,
        {
          leadId: null,
          shop: {
            shopName: body.shopName,
            kind: body.kind,
            city: body.city,
            facebookPage: null,
            brandColor: null,
          },
          eventId: `admin:${randomUUID()}`,
          fbp: null,
          fbc: null,
          pageUrl: 'https://webserbisyo.com/admin',
        },
        { ip: null, ua: null, adminCaller: true },
      );
    });
    const detail = await this.db.run({ userId: user.id, shopId: null, role: 'admin' }, async () => {
      const shopId = await this.shops.shopOfOwner(ownerId);
      return this.admin.markCreatedByAdmin(shopId);
    });
    // The owner sets a password with a 6-digit code (the same email as Forgot password).
    await this.auth.sendRecoveryCode(body.email, clientInfo(req));
    return detail;
  }

  @Get('shops/:id')
  @Can('platform:admin')
  shop(@Param('id', UUID) id: string): Promise<AdminShopDetail> {
    return this.reader.detail(id);
  }

  @Delete('shops/:id')
  @Can('platform:admin')
  @HttpCode(200)
  remove(
    @Param('id', UUID) id: string,
    @Body({ schema: DeleteBodySchema }) body: DeleteBody,
  ): Promise<Ok> {
    return this.admin.remove(id, body.confirmName);
  }

  @Post('shops/:id/approve')
  @Can('platform:admin')
  @HttpCode(200)
  approve(@Param('id', UUID) id: string): Promise<AdminShopDetail> {
    return this.admin.approveGoLive(id);
  }

  @Post('shops/:id/payments/:paymentId/review')
  @Can('platform:admin')
  @HttpCode(200)
  review(
    @Param('id', UUID) id: string,
    @Param('paymentId', UUID) paymentId: string,
    @Body({ schema: ReviewBodySchema }) body: ReviewBody,
  ): Promise<AdminShopDetail> {
    return this.admin.reviewPayment(
      ReviewPlanPaymentInputSchema.parse({ ...body, shopId: id, paymentId }),
    );
  }

  @Post('shops/:id/payments/:paymentId/undo')
  @Can('platform:admin')
  @HttpCode(200)
  undo(
    @Param('id', UUID) id: string,
    @Param('paymentId', UUID) paymentId: string,
  ): Promise<AdminShopDetail> {
    return this.admin.undoApproval(id, paymentId);
  }

  @Put('shops/:id/test')
  @Can('platform:admin')
  setTest(
    @Param('id', UUID) id: string,
    @Body({ schema: TestBodySchema }) body: TestBody,
  ): Promise<AdminShopDetail> {
    return this.admin.setTestShop(id, body.isTest);
  }

  @Post('shops/:id/payments')
  @Can('platform:admin')
  @HttpCode(201)
  record(
    @Param('id', UUID) id: string,
    @Body({ schema: RecordBodySchema }) body: RecordBody,
  ): Promise<AdminShopDetail> {
    return this.admin.recordPayment({ ...body, shopId: id });
  }

  @Post('shops/:id/extra-days')
  @Can('platform:admin')
  @HttpCode(200)
  extend(
    @Param('id', UUID) id: string,
    @Body({ schema: ExtendBodySchema }) body: ExtendBody,
  ): Promise<AdminShopDetail> {
    return this.admin.extend({ ...body, shopId: id });
  }

  @Post('shops/:id/reminder')
  @Can('platform:admin')
  @HttpCode(200)
  remind(@Param('id', UUID) id: string): Promise<AdminShopDetail> {
    return this.admin.remind(id);
  }

  @Post('shops/:id/notes')
  @Can('platform:admin')
  @HttpCode(201)
  note(
    @Param('id', UUID) id: string,
    @Body({ schema: NoteBodySchema }) body: NoteBody,
  ): Promise<AdminShopDetail> {
    return this.admin.note({ ...body, shopId: id });
  }

  @Post('shops/:id/close')
  @Can('platform:admin')
  @HttpCode(200)
  close(
    @Param('id', UUID) id: string,
    @Body({ schema: CloseBodySchema }) body: CloseBody,
  ): Promise<AdminShopDetail> {
    return this.admin.close({ ...body, shopId: id });
  }

  @Post('shops/:id/reopen')
  @Can('platform:admin')
  @HttpCode(200)
  reopen(@Param('id', UUID) id: string): Promise<AdminShopDetail> {
    return this.admin.reopen(id);
  }

  @Get('leads')
  @Can('platform:admin')
  leads(): Promise<AdminLead[]> {
    return this.reader.leads();
  }

  @Post('leads/:id/contacted')
  @Can('platform:admin')
  @HttpCode(200)
  contacted(@Param('id', UUID) id: string): Promise<AdminLead> {
    return this.admin.markLeadContacted(id);
  }

  @Get('payments')
  @Can('platform:admin')
  payments(@Query('view') view: string): Promise<AdminPaymentList> {
    return this.reader.paymentList(AdminPaymentViewEnum.catch('to_check').parse(view));
  }

  /** Help mode (T91): an hour as the shop's owner, logged, with money and account steps locked. */
  @Post('support')
  @Can('platform:admin')
  @HttpCode(201)
  async startSupport(
    @Res({ passthrough: true }) res: Response,
    @Body({ schema: StartSupportInputSchema }) body: StartSupportInput,
  ): Promise<SupportSession> {
    const session = await this.admin.startSupport(body);
    setSupportCookie(res, this.env, session.id, new Date(session.endsAt).getTime() - Date.now());
    return session;
  }

  @Post('support/end')
  @Can('platform:admin')
  @HttpCode(200)
  async endSupport(@Res({ passthrough: true }) res: Response): Promise<Ok> {
    clearSupportCookie(res, this.env);
    return this.admin.endSupport();
  }

  @Get('tracking')
  @Can('platform:admin')
  tracking(): Promise<TrackingSummary> {
    return this.reader.tracking();
  }

  @Put('tracking')
  @Can('platform:admin')
  setTracking(
    @Body({ schema: SetTrackingInputSchema }) body: SetTrackingInput,
  ): Promise<TrackingSummary> {
    return this.admin.setTracking(body);
  }

  @Post('tracking/retry')
  @Can('platform:admin')
  @HttpCode(200)
  retry(): Promise<TrackingSummary> {
    return this.admin.retryTracking();
  }

  @Post('tracking/test')
  @Can('platform:admin')
  @HttpCode(200)
  testEvent(): Promise<TrackingSummary> {
    return this.admin.sendTestEvent();
  }

  @Get('setup')
  @Can('platform:admin')
  setup(): Promise<PlatformSetup> {
    return this.plans.setup();
  }

  @Put('setup')
  @Can('platform:admin')
  saveSetup(@Body({ schema: PlatformSetupSchema }) body: PlatformSetup): Promise<PlatformSetup> {
    return this.admin.saveSetup(body);
  }
}
