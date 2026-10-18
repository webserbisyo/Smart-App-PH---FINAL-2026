import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { errorWords } from '@smartapp/core';
import { CAN_PERMISSION_KEY, IS_PUBLIC_KEY } from './decorators.js';

export interface AuthenticatedUser {
  userId: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private jwks: JWTVerifyGetKey | null = null;
  private readonly supabaseUrl: string;

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') ?? 'http://127.0.0.1:54321';
  }

  private getJWKS(): JWTVerifyGetKey {
    if (!this.jwks) {
      const jwksUrl = new URL('/auth/v1/.well-known/jwks.json', this.supabaseUrl);
      this.jwks = createRemoteJWKSet(jwksUrl);
    }
    return this.jwks;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const permission = this.reflector.getAllAndOverride<string>(CAN_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!permission) {
      throw new UnauthorizedException({
        status: 401,
        code: 'not_signed_in',
        message: errorWords('not_signed_in'),
      });
    }

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthenticatedUser;
    }>();

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        status: 401,
        code: 'not_signed_in',
        message: errorWords('not_signed_in'),
      });
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedException({
        status: 401,
        code: 'not_signed_in',
        message: errorWords('not_signed_in'),
      });
    }

    try {
      const issuer = `${this.supabaseUrl}/auth/v1`;
      const { payload } = await jwtVerify(token, this.getJWKS(), {
        issuer,
        audience: 'authenticated',
      });

      if (!payload.sub) {
        throw new UnauthorizedException({
          status: 401,
          code: 'not_signed_in',
          message: errorWords('not_signed_in'),
        });
      }

      request.user = {
        userId: payload.sub,
      };

      return true;
    } catch {
      throw new UnauthorizedException({
        status: 401,
        code: 'not_signed_in',
        message: errorWords('not_signed_in'),
      });
    }
  }
}
