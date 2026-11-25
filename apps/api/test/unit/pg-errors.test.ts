import { describe, expect, it } from 'vitest';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { ErrorCodeEnum, type ErrorCode } from '@smartapp/core';
import { isRetryableDbError, mapDbError } from '../../src/db/pg-errors.js';

const isErrorCode = (v: string): v is ErrorCode => ErrorCodeEnum.safeParse(v).success;

function pg(code: string, extra: Record<string, string> = {}): DrizzleQueryError {
  const cause = Object.assign(new Error('raw text that must never reach a screen'), {
    code,
    ...extra,
  });
  return new DrizzleQueryError('select 1', ['customer value'], cause);
}

describe('Postgres errors to our codes', () => {
  it('a taken shop link is slug_taken', () => {
    expect(mapDbError(pg('23505', { constraint: 'tenants_slug_key' }), isErrorCode)).toEqual({
      status: 409,
      code: 'slug_taken',
    });
  });

  it('a second shop for one owner is already_has_shop', () => {
    expect(
      mapDbError(pg('23505', { constraint: 'tenant_members_user_id_key' }), isErrorCode)?.code,
    ).toBe('already_has_shop');
  });

  it('a CHECK is invalid_input', () => {
    expect(mapDbError(pg('23514'), isErrorCode)).toEqual({ status: 400, code: 'invalid_input' });
  });

  it('a missing key target and an RLS refusal are not_found (rule 12)', () => {
    expect(mapDbError(pg('23503'), isErrorCode)?.code).toBe('not_found');
    expect(mapDbError(pg('42501'), isErrorCode)?.code).toBe('not_found');
  });

  it('our SQL guards raise with the code in the hint', () => {
    expect(mapDbError(pg('P0001', { hint: 'storage_full' }), isErrorCode)).toEqual({
      status: 409,
      code: 'storage_full',
    });
  });

  it('a hint that is not our code is ignored', () => {
    expect(mapDbError(pg('P0001', { hint: 'something else' }), isErrorCode)).toBeNull();
  });

  it('deadlocks and serialization failures are retried once', () => {
    expect(isRetryableDbError(pg('40001'))).toBe(true);
    expect(isRetryableDbError(pg('40P01'))).toBe(true);
    expect(isRetryableDbError(pg('23505'))).toBe(false);
  });

  it('a non-database error maps to nothing', () => {
    expect(mapDbError(new Error('boom'), isErrorCode)).toBeNull();
  });
});
