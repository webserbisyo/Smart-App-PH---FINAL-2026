import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  ChangePasswordInputSchema,
  EmailInputSchema,
  LoginSchema,
  ResetPasswordInputSchema,
  SecondStepCodeInputSchema,
  SignUpSchema,
  VerifyCodeInputSchema,
  type ChangePasswordInput,
  type EmailInput,
  type LoginInput,
  type Ok,
  type OwnerSession,
  type ResetPasswordInput,
  type SecondStepCodeInput,
  type SecondStepSetup,
  type SendCodeResult,
  type SignUpInput,
  type VerifyCodeInput,
} from '@smartapp/core';
import type { Request, Response } from 'express';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { secondStepRequired, type ApiEnv } from '../env.js';
import { AUTH_PROVIDER, type AuthProvider, type AuthUser } from './auth-provider.js';
import type { CallerUser } from './caller.js';
import { Can, CurrentUser, MaybeUser, NoTransaction, Public } from './decorators.js';
import { clientInfo, SessionService } from './session.service.js';

// Supabase waits 60 s between two codes to one email (R10); our answer tells the screen when to offer Resend.
const RESEND_SECONDS = 60;

// Sign-in tries per address (rule 12, phase 2 plan): 5 a minute; codes and sign-up 10 a minute.
const SIGN_IN_LIMIT = { default: { limit: 5, ttl: 60_000 } };
const CODE_LIMIT = { default: { limit: 10, ttl: 60_000 } };

function sessionOf(user: AuthUser | CallerUser): OwnerSession {
  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    isAdmin: user.isAdmin,
    adminStep: null,
  };
}

/** The session the dashboard sees, with Super Admin's second step when it applies (T118 Q16). */
async function sessionWithStep(
  auth: AuthProvider,
  required: boolean,
  user: AuthUser | CallerUser,
  aal2 = false,
): Promise<OwnerSession> {
  const session = sessionOf(user);
  if (!user.isAdmin || !required) return session;
  const passed = aal2 || ('aal2' in user && user.aal2 === true);
  const adminStep = passed ? 'done' : (await auth.hasTotp(user.id)) ? 'code' : 'enroll';
  return { ...session, adminStep };
}

function codeSent(): SendCodeResult {
  const sent = new Date();
  return {
    sentAt: sent.toISOString(),
    resendAt: new Date(sent.getTime() + RESEND_SECONDS * 1000).toISOString(),
    devCode: null,
  };
}

/**
 * The owner's login, all through NestJS (decision T34): the browser never holds a Supabase token. A
 * successful sign-in sets the httpOnly session cookies (session-cookies.ts). None of these routes opens
 * a database transaction: they only talk to Supabase Auth.
 */
@Controller('auth')
@NoTransaction()
export class AuthController {
  private readonly secondStep: boolean;

  constructor(
    @Inject(AUTH_PROVIDER) private readonly auth: AuthProvider,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.secondStep = secondStepRequired(
      config.get<ApiEnv>('APP_ENV') ?? 'development',
      config.get<'on' | 'off'>('ADMIN_SECOND_STEP'),
    );
  }

  @Get('session')
  @Public()
  async getSession(
    @MaybeUser() user: CallerUser | null,
  ): Promise<{ session: OwnerSession | null }> {
    // Wrapped: a bare null would go out as an empty body, which is not JSON.
    return { session: user ? await sessionWithStep(this.auth, this.secondStep, user) : null };
  }

  @Post('sign-in')
  @Public()
  @HttpCode(200)
  @Throttle(SIGN_IN_LIMIT)
  async signIn(
    @Body({ schema: LoginSchema }) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<OwnerSession> {
    const session = await this.auth.signInWithPassword(
      body.email.trim().toLowerCase(),
      body.password,
      clientInfo(req),
    );
    this.sessions.start(res, session);
    return sessionWithStep(this.auth, this.secondStep, session.user);
  }

  @Post('sign-out')
  @Public()
  @HttpCode(200)
  async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<Ok> {
    const token = this.sessions.accessToken(req);
    if (token) await this.auth.signOut(token, 'local');
    this.sessions.end(res);
    return { ok: true };
  }

  @Post('sign-up')
  @Public()
  @HttpCode(200)
  @Throttle(CODE_LIMIT)
  async signUp(
    @Body({ schema: SignUpSchema }) body: SignUpInput,
    @Req() req: Request,
  ): Promise<SendCodeResult> {
    await this.auth.signUp(
      {
        email: body.email.trim().toLowerCase(),
        password: body.password,
        fullName: body.fullName.trim(),
      },
      clientInfo(req),
    );
    return codeSent();
  }

  @Post('sign-up/verify')
  @Public()
  @HttpCode(200)
  @Throttle(CODE_LIMIT)
  async verifySignUp(
    @Body({ schema: VerifyCodeInputSchema }) body: VerifyCodeInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<OwnerSession> {
    const session = await this.auth.verifySignupCode(body.email, body.code, clientInfo(req));
    this.sessions.start(res, session);
    return sessionWithStep(this.auth, this.secondStep, session.user);
  }

  @Post('sign-up/resend')
  @Public()
  @HttpCode(200)
  @Throttle(CODE_LIMIT)
  async resendSignUp(
    @Body({ schema: EmailInputSchema }) body: EmailInput,
    @Req() req: Request,
  ): Promise<SendCodeResult> {
    await this.auth.resendSignupCode(body.email, clientInfo(req));
    return codeSent();
  }

  /** Forgot password, step 1 (T108). The same answer for every email; only rate_limited shows. */
  @Post('forgot/code')
  @Public()
  @HttpCode(200)
  @Throttle(CODE_LIMIT)
  async sendResetCode(
    @Body({ schema: EmailInputSchema }) body: EmailInput,
    @Req() req: Request,
  ): Promise<SendCodeResult> {
    await this.auth.sendRecoveryCode(body.email, clientInfo(req));
    return codeSent();
  }

  /** Forgot password, step 2: the code signs the owner in, the new password is saved, other phones sign out. */
  @Post('forgot/reset')
  @Public()
  @HttpCode(200)
  @Throttle(CODE_LIMIT)
  async resetPassword(
    @Body({ schema: ResetPasswordInputSchema }) body: ResetPasswordInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<OwnerSession> {
    const session = await this.auth.verifyRecoveryCode(body.email, body.code, clientInfo(req));
    await this.auth.setPassword(session.user.id, body.newPassword);
    await this.auth.signOut(session.accessToken, 'others');
    this.sessions.start(res, session);
    return sessionWithStep(this.auth, this.secondStep, session.user);
  }

  /** Settings › Account (T68): a code to the owner's own email. */
  @Post('password-code')
  @Can('account')
  @HttpCode(200)
  @Throttle(CODE_LIMIT)
  async sendPasswordCode(
    @CurrentUser() user: CallerUser,
    @Req() req: Request,
  ): Promise<SendCodeResult> {
    await this.auth.sendRecoveryCode(user.email, clientInfo(req));
    return codeSent();
  }

  @Post('password')
  @Can('account')
  @HttpCode(200)
  @Throttle(CODE_LIMIT)
  async changePassword(
    @CurrentUser() user: CallerUser,
    @Body({ schema: ChangePasswordInputSchema }) body: ChangePasswordInput,
    @Req() req: Request,
  ): Promise<Ok> {
    const session = await this.auth.verifyRecoveryCode(user.email, body.code, clientInfo(req));
    await this.auth.setPassword(session.user.id, body.newPassword);
    // The code made a second session just to prove the email; it ends here.
    await this.auth.signOut(session.accessToken, 'local');
    return { ok: true };
  }

  @Post('sign-out-all')
  @Can('account')
  @HttpCode(200)
  async signOutEverywhere(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Ok> {
    const token = this.sessions.accessToken(req);
    if (token) await this.auth.signOut(token, 'global');
    this.sessions.end(res);
    return { ok: true };
  }

  /**
   * Super Admin's second step, part 1 (T118 Q16): the authenticator app's QR, the first time only. Anyone
   * but the founder gets Not found (rule 12); once an app is set up, a new one cannot be added this way.
   */
  @Post('second-step/setup')
  @Can('account')
  @HttpCode(200)
  @Throttle(CODE_LIMIT)
  async startSecondStep(
    @CurrentUser() user: CallerUser,
    @Req() req: Request,
  ): Promise<SecondStepSetup> {
    if (!user.isAdmin || !this.secondStep) throw notFound();
    const token = this.sessions.accessToken(req);
    if (!token) throw new ApiFailure('not_signed_in', 401);
    return this.auth.enrollTotp(user.id, token);
  }

  /** Part 2: the app's code raises this login to the second step; new cookies carry it. */
  @Post('second-step/verify')
  @Can('account')
  @HttpCode(200)
  @Throttle(SIGN_IN_LIMIT)
  async verifySecondStep(
    @CurrentUser() user: CallerUser,
    @Body({ schema: SecondStepCodeInputSchema }) body: SecondStepCodeInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<OwnerSession> {
    if (!user.isAdmin || !this.secondStep) throw notFound();
    const token = this.sessions.accessToken(req);
    if (!token) throw new ApiFailure('not_signed_in', 401);
    const session = await this.auth.verifyTotp(user.id, token, body.code);
    this.sessions.start(res, session);
    return sessionWithStep(this.auth, this.secondStep, session.user, true);
  }
}
