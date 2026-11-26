import type { ErrorCode } from '@smartapp/core';

/** The fields we read from a Postgres error (pg's DatabaseError), never its message or parameters. */
export interface PgErrorInfo {
  code: string;
  constraint: string | undefined;
  hint: string | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Finds the Postgres error inside a Drizzle error (DrizzleQueryError keeps it in `cause`). */
export function pgErrorOf(error: unknown): PgErrorInfo | null {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && isRecord(current); depth++) {
    const code = current['code'];
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) {
      const constraint = current['constraint'];
      const hint = current['hint'];
      return {
        code,
        constraint: typeof constraint === 'string' ? constraint : undefined,
        hint: typeof hint === 'string' ? hint : undefined,
      };
    }
    current = current['cause'];
  }
  return null;
}

export function isRetryableDbError(error: unknown): boolean {
  const pg = pgErrorOf(error);
  return pg !== null && (pg.code === '40001' || pg.code === '40P01');
}

// A unique key that means something to the owner (rule 7: screens word errors from the code).
const UNIQUE_CODES: Record<string, ErrorCode> = {
  tenants_slug_key: 'slug_taken',
  tenant_members_user_id_key: 'already_has_shop',
  tenant_members_pkey: 'already_has_shop',
  // The same reference number cannot pay two orders unless the shop turned it down.
  payment_proofs_reference: 'duplicate_reference',
  // A plan payment's reference across every shop (T88); one waiting payment per shop.
  plan_payments_reference: 'duplicate_reference',
  plan_payments_one_pending: 'payment_not_pending',
};

export interface MappedDbError {
  status: number;
  code: ErrorCode;
}

/**
 * Postgres codes to our closed list (decision T116):
 * unique 23505 by constraint, check 23514 and bad values to invalid_input, a missing row a key points at
 * (23503) to not_found, RLS refusing a write (42501) to not_found (rule 12), and our SQL guards raise
 * with the code in `hint` (`raise exception ... using hint = 'storage_full'`).
 */
export function mapDbError(
  error: unknown,
  isErrorCode: (v: string) => v is ErrorCode,
): MappedDbError | null {
  const pg = pgErrorOf(error);
  if (!pg) return null;
  if (pg.hint && isErrorCode(pg.hint)) return { status: 409, code: pg.hint };
  switch (pg.code) {
    case '23505': {
      const code = pg.constraint ? UNIQUE_CODES[pg.constraint] : undefined;
      return { status: 409, code: code ?? 'invalid_input' };
    }
    case '23514':
    case '23502':
    case '22001':
    case '22003':
    case '22007':
    case '22P02':
    case '22023':
      return { status: 400, code: 'invalid_input' };
    case '23503':
    case 'P0002':
    case '42501':
      return { status: 404, code: 'not_found' };
    default:
      return null;
  }
}
