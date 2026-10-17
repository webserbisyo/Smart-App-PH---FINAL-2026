import { z } from 'zod'
import { words } from './words.js'

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
] as const

export const ErrorCodeEnum = z.enum(ErrorCode)
export type ErrorCode = z.infer<typeof ErrorCodeEnum>

export const ApiErrorSchema = z.object({
  status: z.number(),
  code: ErrorCodeEnum,
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
})

export type ApiError = z.infer<typeof ApiErrorSchema>

export function errorWords(code: ErrorCode): string {
  switch (code) {
    case 'invalid_login':
      return words.errors.invalidLogin
    case 'email_taken':
      return words.errors.emailTaken
    case 'weak_password':
      return words.errors.weakPassword
    case 'invalid_code':
      return words.errors.invalidCode
    case 'code_expired':
      return words.errors.codeExpired
    case 'rate_limited':
      return words.errors.rateLimited
    case 'not_signed_in':
      return words.errors.notSignedIn
    case 'invalid_input':
      return words.errors.invalidInput
    case 'unknown':
      return words.errors.unknown
  }
}
