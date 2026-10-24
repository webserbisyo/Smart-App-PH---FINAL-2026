import { z } from 'zod';
import { words } from './words.js';

export const ErrorCode = [
  'invalid_login',
  'email_taken',
  'weak_password',
  'invalid_code',
  'code_expired',
  'rate_limited',
  'not_signed_in',
  'invalid_input',
  'unknown',
  // Storefront
  'shop_not_found',
  'shop_closed',
  'shop_busy',
  'fulfillment_unavailable',
  'payment_unavailable',
  'cod_not_allowed',
  'cod_limit',
  'pickup_time_invalid',
  'zone_required',
  'out_of_range',
  'item_unavailable',
  'out_of_stock',
  'invalid_options',
  'reward_unavailable',
  'reward_all_claimed',
  'reward_paused',
  'order_not_payable',
  'duplicate_reference',
  'too_many_proofs',
  'phone_in_use',
  'slot_unavailable',
  'stamps_insufficient',
  'preview_expired',
  'thread_rate_limited',
  // Orders and members (owner)
  'not_found',
  'invalid_transition',
  'not_paid',
  'payment_not_pending',
  'already_paid',
  'stamp_cap_reached',
  'stamp_daily_cap',
  'claim_not_pending',
] as const;

export const ErrorCodeEnum = z.enum(ErrorCode);
export type ErrorCode = z.infer<typeof ErrorCodeEnum>;

export const ApiErrorSchema = z.object({
  status: z.number(),
  code: ErrorCodeEnum,
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export function errorWords(code: ErrorCode): string {
  switch (code) {
    case 'invalid_login':
      return words.errors.invalidLogin;
    case 'email_taken':
      return words.errors.emailTaken;
    case 'weak_password':
      return words.errors.weakPassword;
    case 'invalid_code':
      return words.errors.invalidCode;
    case 'code_expired':
      return words.errors.codeExpired;
    case 'rate_limited':
      return words.errors.rateLimited;
    case 'not_signed_in':
      return words.errors.notSignedIn;
    case 'invalid_input':
      return words.errors.invalidInput;
    case 'unknown':
      return words.errors.unknown;
    default:
      return words.errors.codes[code];
  }
}
