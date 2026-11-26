import type { CookieOptions, Response } from 'express';
import type { ApiEnv } from '../env.js';

/**
 * The owner's login lives in two httpOnly cookies set by the API's own host (decision T116, Q3): no Domain,
 * so shop pages (<slug>.webserbisyo.com) never receive them, and no script can read them. Outside
 * development they carry the __Host- prefix, which browsers only accept with Secure, Path=/ and no Domain.
 * Members (storefront customers, phase 6) get their own pair.
 */
export const SESSION_AUDIENCES = ['owner', 'member'] as const;
export type SessionAudience = (typeof SESSION_AUDIENCES)[number];

// The refresh cookie is renewed on every refresh, so an owner who opens the dashboard weekly stays in.
const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  // Seconds the access token lives (Supabase's jwt_expiry, 3600 by default).
  expiresIn: number;
}

export interface CookieNames {
  access: string;
  refresh: string;
}

export function cookieNames(env: ApiEnv, audience: SessionAudience = 'owner'): CookieNames {
  const prefix = env === 'development' ? '' : '__Host-';
  return { access: `${prefix}sa_${audience}_at`, refresh: `${prefix}sa_${audience}_rt` };
}

function baseOptions(env: ApiEnv): CookieOptions {
  return { httpOnly: true, secure: env !== 'development', sameSite: 'lax', path: '/' };
}

export function setSessionCookies(
  res: Response,
  env: ApiEnv,
  tokens: SessionTokens,
  audience: SessionAudience = 'owner',
): void {
  const names = cookieNames(env, audience);
  const options = baseOptions(env);
  res.cookie(names.access, tokens.accessToken, { ...options, maxAge: tokens.expiresIn * 1000 });
  res.cookie(names.refresh, tokens.refreshToken, { ...options, maxAge: REFRESH_MAX_AGE_MS });
}

export function clearSessionCookies(
  res: Response,
  env: ApiEnv,
  audience: SessionAudience = 'owner',
): void {
  const names = cookieNames(env, audience);
  const options = baseOptions(env);
  res.clearCookie(names.access, options);
  res.clearCookie(names.refresh, options);
}

/** Reads one cookie from the Cookie header (no cookie-parser package needed for two values). */
export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() !== name) continue;
    const value = part.slice(index + 1).trim();
    try {
      return value.length > 0 ? decodeURIComponent(value) : null;
    } catch {
      return null;
    }
  }
  return null;
}

// Help mode (T91): the founder's open support session, for at most an hour. It only means something next to
// a Super Admin login: the API looks the session up for that login, so the cookie alone opens nothing.
export const SUPPORT_COOKIE_MAX_AGE_MS = 60 * 60 * 1000;

export function supportCookieName(env: ApiEnv): string {
  return env === 'development' ? 'sa_help' : '__Host-sa_help';
}

export function setSupportCookie(
  res: Response,
  env: ApiEnv,
  sessionId: string,
  maxAgeMs: number,
): void {
  res.cookie(supportCookieName(env), sessionId, { ...baseOptions(env), maxAge: maxAgeMs });
}

export function clearSupportCookie(res: Response, env: ApiEnv): void {
  res.clearCookie(supportCookieName(env), baseOptions(env));
}
