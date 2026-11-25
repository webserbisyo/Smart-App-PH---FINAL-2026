import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Query } from '@nestjs/common';
import {
  AdjustStampsInputSchema,
  ClaimCancelReasonEnum,
  CustomerFilterEnum,
  MemberSortEnum,
  StampCardSettingsSchema,
  StampCardStatusEnum,
  type AdjustStampsInput,
  type CounterChange,
  type CustomerPage,
  type FoundMember,
  type MemberDetail,
  type MembersOverview,
  type OwnerClaim,
  type StampCardImpact,
  type StampCardSettings,
} from '@smartapp/core';
import { z } from 'zod';
import { Can } from '../auth/decorators.js';
import { OwnerMembersService } from './owner-members.service.js';

const ListQuerySchema = z.object({
  filter: CustomerFilterEnum,
  q: z.string().max(80).default(''),
  sort: MemberSortEnum,
  cursor: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  stamps: z.coerce.number().int().min(0).max(50).optional(),
});
type ListQuery = z.infer<typeof ListQuerySchema>;

const FindQuerySchema = z.object({ code: z.string().min(1).max(300) });
type FindQuery = z.infer<typeof FindQuerySchema>;

const StatusInputSchema = z.object({ status: StampCardStatusEnum }).strict();
type StatusInput = z.infer<typeof StatusInputSchema>;

const TapInputSchema = z
  .object({ clientKey: z.string().min(8).max(64), confirmRecent: z.boolean().default(false) })
  .strict();
type TapInput = z.infer<typeof TapInputSchema>;

const UndoInputSchema = z.object({ entryId: z.string().min(1).max(64) }).strict();
type UndoInput = z.infer<typeof UndoInputSchema>;

const AdjustBodySchema = AdjustStampsInputSchema.omit({ customerId: true });
type AdjustBody = Omit<AdjustStampsInput, 'customerId'>;

const CancelInputSchema = z.object({ reason: ClaimCancelReasonEnum }).strict();
type CancelInput = z.infer<typeof CancelInputSchema>;

/** api.md "Members (owner)": reads need `shop:view`, every change `members:manage` (phase 6, T117). */
@Controller('owner')
export class OwnerMembersController {
  constructor(@Inject(OwnerMembersService) private readonly members: OwnerMembersService) {}

  @Get('stamp-card')
  @Can('shop:view')
  getStampCard(): Promise<StampCardSettings> {
    return this.members.getStampCard();
  }

  @Post('stamp-card/preview')
  @HttpCode(200)
  @Can('shop:view')
  previewStampCardChange(
    @Body({ schema: StampCardSettingsSchema }) body: StampCardSettings,
  ): Promise<StampCardImpact> {
    return this.members.previewStampCardChange(body);
  }

  @Put('stamp-card')
  @Can('members:manage')
  saveStampCard(
    @Body({ schema: StampCardSettingsSchema }) body: StampCardSettings,
  ): Promise<StampCardSettings> {
    return this.members.saveStampCard(body);
  }

  @Post('stamp-card/status')
  @HttpCode(200)
  @Can('members:manage')
  setStampCardStatus(
    @Body({ schema: StatusInputSchema }) body: StatusInput,
  ): Promise<StampCardSettings> {
    return this.members.setStampCardStatus(body.status);
  }

  @Get('members/overview')
  @Can('shop:view')
  getMembersOverview(): Promise<MembersOverview> {
    return this.members.getMembersOverview();
  }

  @Get('members/find')
  @Can('shop:view')
  findMember(@Query({ schema: FindQuerySchema }) query: FindQuery): Promise<FoundMember> {
    return this.members.findMember(query.code);
  }

  @Get('members')
  @Can('shop:view')
  listCustomers(@Query({ schema: ListQuerySchema }) query: ListQuery): Promise<CustomerPage> {
    return this.members.listCustomers({ ...query, stamps: query.stamps ?? null });
  }

  @Get('members/:id')
  @Can('shop:view')
  getMember(@Param('id') id: string): Promise<MemberDetail> {
    return this.members.getMember(id);
  }

  @Post('members/:id/stamp')
  @HttpCode(200)
  @Can('members:manage')
  giveStamp(
    @Param('id') id: string,
    @Body({ schema: TapInputSchema }) body: TapInput,
  ): Promise<CounterChange> {
    return this.members.giveStamp(id, body.clientKey, body.confirmRecent);
  }

  @Post('members/:id/undo')
  @HttpCode(200)
  @Can('members:manage')
  undoChange(
    @Param('id') id: string,
    @Body({ schema: UndoInputSchema }) body: UndoInput,
  ): Promise<MemberDetail> {
    return this.members.undoChange(id, body.entryId);
  }

  @Post('members/:id/adjust')
  @HttpCode(200)
  @Can('members:manage')
  adjustStamps(
    @Param('id') id: string,
    @Body({ schema: AdjustBodySchema }) body: AdjustBody,
  ): Promise<MemberDetail> {
    return this.members.adjustStamps({ ...body, customerId: id });
  }

  @Post('members/:id/use-reward')
  @HttpCode(200)
  @Can('members:manage')
  useReward(
    @Param('id') id: string,
    @Body({ schema: TapInputSchema }) body: TapInput,
  ): Promise<CounterChange> {
    return this.members.useReward(id, body.clientKey);
  }

  // The note waits for its column (members.note); until then the panel reads back as it was.
  @Put('members/:id/note')
  @Can('members:manage')
  saveMemberNote(@Param('id') id: string): Promise<MemberDetail> {
    return this.members.saveMemberNote(id);
  }

  @Get('claims')
  @Can('shop:view')
  listRewardClaims(): Promise<OwnerClaim[]> {
    return this.members.listRewardClaims();
  }

  @Post('claims/:id/give')
  @HttpCode(200)
  @Can('members:manage')
  giveClaim(@Param('id') id: string): Promise<OwnerClaim> {
    return this.members.giveClaim(id);
  }

  @Post('claims/:id/cancel')
  @HttpCode(200)
  @Can('members:manage')
  cancelClaim(
    @Param('id') id: string,
    @Body({ schema: CancelInputSchema }) body: CancelInput,
  ): Promise<OwnerClaim> {
    return this.members.cancelClaim(id, body.reason);
  }
}
