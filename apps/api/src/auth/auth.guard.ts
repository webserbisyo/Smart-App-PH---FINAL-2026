import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { notSignedIn } from '../common/api-failure.js';
import { callerOf } from './caller.js';
import { Can, IS_PUBLIC_KEY } from './decorators.js';
import { SessionService } from './session.service.js';

/**
 * Who is calling (decision T116). Public routes still learn the caller when a session is there; every
 * other route needs one. Which shop and which permission is the ScopeInterceptor's job, inside the
 * request's transaction.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets) === true;
    const permission = this.reflector.getAllAndOverride(Can, targets);
    // The route test makes sure this never happens; if it does, nobody gets in.
    if (!isPublic && !permission) throw notSignedIn();

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const user = await this.sessions.authenticate(req, http.getResponse<Response>());
    callerOf(req).user = user;
    if (!isPublic && !user) throw notSignedIn();
    return true;
  }
}
