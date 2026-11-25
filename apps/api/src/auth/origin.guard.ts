import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ApiFailure } from '../common/api-failure.js';
import { corsOrigins } from '../env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** The header every write from our apps carries (packages/data api-client). */
export const CSRF_HEADER = 'x-smartapp';

/**
 * Cookie logins need a guard against other sites posting on the owner's behalf (CSRF). Every write must
 * carry our own header, which a plain form or image cannot send and which makes browsers ask CORS first,
 * and a browser's Origin, when sent, must be one of ours.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly origins: Set<string>;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.origins = new Set(corsOrigins(config.getOrThrow<string>('CORS_ORIGINS')));
  }

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;
    const origin = req.headers.origin;
    if (req.headers[CSRF_HEADER] !== '1' || (origin !== undefined && !this.origins.has(origin))) {
      throw new ApiFailure('not_allowed', 403);
    }
    return true;
  }
}
