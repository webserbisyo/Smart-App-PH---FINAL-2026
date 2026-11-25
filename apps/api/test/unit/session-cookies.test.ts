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

  const live = {
    ...base,
    APP_ENV: 'production',
    SUPABASE_SECRET_KEY: 'sb_secret_0123456789abcdef',
    STOREFRONT_URL: 'https://shop.webserbisyo.com',
    STOREFRONT_REVALIDATE_SECRET: 'r'.repeat(32),
    SERVER_READ_SECRET: 's'.repeat(32),
    DASHBOARD_URL: 'https://app.webserbisyo.com',
    VAPID_PUBLIC_KEY: 'B'.repeat(87),
    VAPID_PRIVATE_KEY: 'k'.repeat(43),
    VAPID_SUBJECT: 'mailto:codes@mail.webserbisyo.com',
    RESEND_API_KEY: 're_0123456789abcdef',
    EMAIL_FROM: 'Smart App PH <alerts@mail.webserbisyo.com>',
    ADMIN_EMAIL: 'founder@example.com',
  };

  it('production refuses to start without the secret key', () => {
    expect(EnvSchema.safeParse({ ...base, APP_ENV: 'production' }).success).toBe(false);
    expect(EnvSchema.safeParse({ ...live, SUPABASE_SECRET_KEY: undefined }).success).toBe(false);
    expect(EnvSchema.safeParse(live).success).toBe(true);
  });

  it('production refuses to start without the storefront secrets', () => {
    expect(EnvSchema.safeParse({ ...live, SERVER_READ_SECRET: undefined }).success).toBe(false);
    expect(EnvSchema.safeParse({ ...live, STOREFRONT_URL: undefined }).success).toBe(false);
    for (const key of [
      'STOREFRONT_REVALIDATE_SECRET',
      'VAPID_PRIVATE_KEY',
      'RESEND_API_KEY',
      'ADMIN_EMAIL',
    ]) {
      expect(EnvSchema.safeParse({ ...live, [key]: undefined }).success).toBe(false);
    }
  });

  it('production refuses an http dashboard address', () => {
    const env = {
      ...live,
      CORS_ORIGINS: 'http://app.webserbisyo.com',
    };
    expect(EnvSchema.safeParse(env).success).toBe(false);
  });
});
