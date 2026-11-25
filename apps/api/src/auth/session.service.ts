import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { createRemoteJWKSet, errors as joseErrors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { ApiEnv } from '../env.js';
import {
  AUTH_PROVIDER,
  type AuthProvider,
  type AuthSession,
  type ClientInfo,
} from './auth-provider.js';
import type { CallerUser } from './caller.js';
import {
  clearSessionCookies,
  cookieNames,
  readCookie,
  setSessionCookies,
  type SessionAudience,
} from './session-cookies.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** The phone's address as Express sees it (trust proxy set from TRUST_PROXY_HOPS in main.ts). */
export function clientInfo(req: Request): ClientInfo {
  return { ip: req.ip ?? null };
}

/**
 * Finds who is calling: a Bearer token (tests, tools) or the owner's cookies (the dashboard). An expired
 * access cookie is renewed with the refresh cookie on the way in, so the owner never sees a sign-in page
 * after an hour. Tokens are checked against Supabase's published keys (JWKS), with issuer and audience.
 */
@Injectable()
export class SessionService {
  private readonly env: ApiEnv;
  private readonly issuer: string;
  private readonly jwks: JWTVerifyGetKey;

  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject(AUTH_PROVIDER) private readonly auth: AuthProvider,
  ) {
    const url = config.getOrThrow<string>('SUPABASE_URL').replace(/\/+$/, '');
    this.env = config.getOrThrow<ApiEnv>('APP_ENV');
    this.issuer = `${url}/auth/v1`;
    this.jwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`), {
      cooldownDuration: 30_000,
      cacheMaxAge: 10 * 60_000,
    });
  }

  async verify(token: string): Promise<CallerUser | null> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: 'authenticated',
      });
      if (typeof payload.sub !== 'string') return null;
      const appMeta = isRecord(payload['app_metadata']) ? payload['app_metadata'] : {};
      const userMeta = isRecord(payload['user_metadata']) ? payload['user_metadata'] : {};
      const fullName = userMeta['full_name'];
      return {
        id: payload.sub,
        email: typeof payload['email'] === 'string' ? payload['email'] : '',
        fullName: typeof fullName === 'string' && fullName.length > 0 ? fullName : null,
        isAdmin: appMeta['platform_admin'] === true,
      };
    } catch (error) {
      // A project still signing with the shared secret has no public key: ask Supabase instead.
      if (
        error instanceof joseErrors.JWKSNoMatchingKey ||
        error instanceof joseErrors.JOSEAlgNotAllowed
      ) {
        return this.auth.getUser(token);
      }
      return null;
    }
  }

  /** The caller, or null. Sets fresh cookies on `res` when it had to refresh. */
  async authenticate(req: Request, res: Response): Promise<CallerUser | null> {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return this.verify(header.slice(7).trim());
    }
    return this.fromCookies(req, res, 'owner');
  }

  /**
   * The storefront's signed-in member (launch phase 6): only the member cookies, never a Bearer token or the
   * owner's cookies, so an owner trying their own shop is a customer there like anyone else.
   */
  async member(req: Request, res: Response): Promise<CallerUser | null> {
    return this.fromCookies(req, res, 'member');
  }

  memberAccessToken(req: Request): string | null {
    return readCookie(req.headers.cookie, cookieNames(this.env, 'member').access);
  }

  startMember(res: Response, session: AuthSession): void {
    setSessionCookies(res, this.env, session, 'member');
  }

  endMember(res: Response): void {
    clearSessionCookies(res, this.env, 'member');
  }

  private async fromCookies(
    req: Request,
    res: Response,
    audience: SessionAudience,
  ): Promise<CallerUser | null> {
    const names = cookieNames(this.env, audience);
    const access = readCookie(req.headers.cookie, names.access);
    if (access) {
      const user = await this.verify(access);
      if (user) return user;
    }
    const refresh = readCookie(req.headers.cookie, names.refresh);
    if (!refresh) return null;
    try {
      const session = await this.auth.refresh(refresh, clientInfo(req));
      setSessionCookies(res, this.env, session, audience);
      return session.user;
    } catch {
      clearSessionCookies(res, this.env, audience);
      return null;
    }
  }

  /** The current access token (cookie or Bearer), for sign-out. */
  accessToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7).trim();
    return readCookie(req.headers.cookie, cookieNames(this.env).access);
  }

  start(res: Response, session: AuthSession): void {
    setSessionCookies(res, this.env, session);
  }

  end(res: Response): void {
    clearSessionCookies(res, this.env);
  }
}
