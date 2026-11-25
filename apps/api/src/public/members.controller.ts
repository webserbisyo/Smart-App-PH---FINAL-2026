import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CustomerAddressSchema,
  OwnerAvatarSchema,
  type CustomerAddress,
  type MemberAccount,
  type RewardClaim,
} from '@smartapp/core';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Public } from '../auth/decorators.js';
import { SessionService } from '../auth/session.service.js';
import { MembersService } from './members.service.js';
import { STOREFRONT_LIMIT } from './storefront.controller.js';

const JoinInputSchema = z
  .object({
    name: z.string().min(1).max(80),
    phone: z.string().min(1).max(20),
    orderToken: z.string().min(1).max(64).optional(),
    avatar: OwnerAvatarSchema.optional(),
  })
  .strict();
type JoinBody = z.infer<typeof JoinInputSchema>;

const AvatarInputSchema = z.object({ avatar: OwnerAvatarSchema.nullable() }).strict();
type AvatarBody = z.infer<typeof AvatarInputSchema>;

/**
 * A member's own routes on a shop (api.md "Storefront", launch phase 6). The person comes from the member
 * cookie only (never the owner's), the shop from the link.
 */
@Controller('s/:slug')
@Public()
@Throttle(STOREFRONT_LIMIT)
export class MembersController {
  constructor(
    @Inject(MembersService) private readonly members: MembersService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  @Post('members')
  @HttpCode(200)
  async join(
    @Param('slug') slug: string,
    @Body({ schema: JoinInputSchema }) body: JoinBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MemberAccount> {
    return this.members.join(slug, await this.sessions.member(req, res), body);
  }

  // `null` is an answer here (not a member), so it is written out: an empty body is not JSON.
  @Get('me')
  async me(@Param('slug') slug: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    const account = await this.members.me(slug, await this.sessions.member(req, res));
    res.status(200).json(account);
  }

  @Put('me/avatar')
  async saveAvatar(
    @Param('slug') slug: string,
    @Body({ schema: AvatarInputSchema }) body: AvatarBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MemberAccount> {
    return this.members.saveAvatar(slug, await this.sessions.member(req, res), body.avatar);
  }

  @Put('me/addresses')
  async saveAddress(
    @Param('slug') slug: string,
    @Body({ schema: CustomerAddressSchema }) body: CustomerAddress,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CustomerAddress[]> {
    return this.members.saveAddress(slug, await this.sessions.member(req, res), body);
  }

  @Delete('me/addresses/:id')
  async removeAddress(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CustomerAddress[]> {
    return this.members.removeAddress(slug, await this.sessions.member(req, res), id);
  }

  @Post('me/claims')
  @HttpCode(200)
  async claimReward(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RewardClaim> {
    return this.members.claimReward(slug, await this.sessions.member(req, res));
  }
}
