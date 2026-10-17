import { Body, Controller, Get, Inject, Post, Req } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { LoginSchema, words, type LoginInput } from '@smartapp/core';
import { Can, Public } from './auth/decorators.js';
import type { AuthenticatedUser } from './auth/auth.guard.js';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

@Controller()
export class AppController {
  constructor(
    @Inject(HealthIndicatorService)
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  @Get('health')
  @Public()
  health(): { ok: boolean; app: string } {
    const indicator = this.healthIndicatorService.check('app');
    indicator.up({ app: words.appName });
    return { ok: true, app: words.appName };
  }

  @Get('me')
  @Can('self')
  getMe(@Req() req: RequestWithUser): { userId: string } {
    return { userId: req.user?.userId ?? '' };
  }

  @Post('test-validation')
  @Public()
  testValidation(@Body({ schema: LoginSchema }) body: LoginInput): LoginInput {
    return body;
  }
}
