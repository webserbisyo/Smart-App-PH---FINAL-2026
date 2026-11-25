import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  EmailInputSchema,
  VerifyCodeInputSchema,
  type EmailInput,
  type Ok,
  type SendCodeResult,
  type VerifyCodeInput,
} from '@smartapp/core';
import type { Request, Response } from 'express';
import { AUTH_PROVIDER, type AuthProvider } from './auth-provider.js';
import { NoTransaction, Public } from './decorators.js';
import { clientInfo, SessionService } from './session.service.js';

// Supabase waits 60 s between two codes to one email (R10).
const RESEND_SECONDS = 60;
const CODE_LIMIT = { default: { limit: 10, ttl: 60_000 } };

/**
 * A member's sign-in on the storefront (launch phase 6, D2): a 6-digit email code through NestJS, with the
 * session in the member's own cookies (sa_member_*), apart from the owner's. One account can be a member of
 * many shops; each shop's `members` row is made on Join.
 */
@Controller('auth/member')
@Public()
@NoTransaction()
export class MemberAuthController {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly auth: AuthProvider,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  @Post('code')
  @HttpCode(200)
  @Throttle(CODE_LIMIT)
  async sendCode(
    @Body({ schema: EmailInputSchema }) body: EmailInput,
    @Req() req: Request,
  ): Promise<SendCodeResult> {
    await this.auth.sendEmailCode(body.email.trim().toLowerCase(), clientInfo(req));
    const sent = new Date();
    return {
      sentAt: sent.toISOString(),
      resendAt: new Date(sent.getTime() + RESEND_SECONDS * 1000).toISOString(),
      devCode: null,
    };
  }

  @Post('verify')
  @HttpCode(200)
  @Throttle(CODE_LIMIT)
  async verify(
    @Body({ schema: VerifyCodeInputSchema }) body: VerifyCodeInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ email: string }> {
    const email = body.email.trim().toLowerCase();
    const session = await this.auth.verifySignupCode(
      email,
      body.code.replace(/\s/g, ''),
      clientInfo(req),
    );
    this.sessions.startMember(res, session);
    return { email: session.user.email || email };
  }

  @Post('sign-out')
  @HttpCode(200)
  async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<Ok> {
    const token = this.sessions.memberAccessToken(req);
    if (token) await this.auth.signOut(token, 'local').catch(() => undefined);
    this.sessions.endMember(res);
    return { ok: true };
  }
}
