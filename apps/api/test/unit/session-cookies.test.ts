import { describe, expect, it } from 'vitest';
import { cookieNames, readCookie } from '../../src/auth/session-cookies.js';
import { EnvSchema } from '../../src/env.js';

describe('session cookies', () => {
  it('reads one cookie among others', () => {
    expect(readCookie('a=1; sa_owner_at=abc.def; b=2', 'sa_owner_at')).toBe('abc.def');
    expect(readCookie('a=1', 'sa_owner_at')).toBeNull();
    expect(readCookie(undefined, 'sa_owner_at')).toBeNull();
    expect(readCookie('sa_owner_at=', 'sa_owner_at')).toBeNull();
  });

  it('uses the __Host- prefix outside development', () => {
    expect(cookieNames('development').access).toBe('sa_owner_at');
    expect(cookieNames('production')).toEqual({
      access: '__Host-sa_owner_at',
      refresh: '__Host-sa_owner_rt',
    });
  });
});

describe('settings', () => {
  const base = {
    SUPABASE_URL: 'https://abc.supabase.co',
    DATABASE_URL: 'postgresql://u:p@pooler.supabase.com:6543/postgres',
    CORS_ORIGINS: 'https://app.webserbisyo.com',
    STOREFRONT_URL: 'https://shop.webserbisyo.com',
    STOREFRONT_REVALIDATE_SECRET: 'x'.repeat(40),
  };

  it('production refuses to start without the storefront values (phase 4)', () => {
    const rest = { ...base, STOREFRONT_URL: '' };
    expect(
      EnvSchema.safeParse({
        ...rest,
        APP_ENV: 'production',
        SUPABASE_SECRET_KEY: 'sb_secret_0123456789abcdef',
      }).success,
    ).toBe(false);
  });

  it('production refuses to start without the secret key', () => {
    expect(EnvSchema.safeParse({ ...base, APP_ENV: 'production' }).success).toBe(false);
    expect(
      EnvSchema.safeParse({
        ...base,
        APP_ENV: 'production',
        SUPABASE_SECRET_KEY: 'sb_secret_0123456789abcdef',
      }).success,
    ).toBe(true);
  });

  it('production refuses an http dashboard address', () => {
    const env = {
      ...base,
      APP_ENV: 'production',
      SUPABASE_SECRET_KEY: 'sb_secret_0123456789abcdef',
      CORS_ORIGINS: 'http://app.webserbisyo.com',
    };
    expect(EnvSchema.safeParse(env).success).toBe(false);
  });
});
