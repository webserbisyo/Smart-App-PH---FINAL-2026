import { z } from 'zod';
import { words } from '../words.js';

export const LoginSchema = z.object({
  email: z
    .string(words.validation.emailRequired)
    .min(1, words.validation.emailRequired)
    .email(words.validation.emailInvalid),
  password: z.string(words.validation.passwordRequired).min(1, words.validation.passwordRequired),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const SignUpSchema = z.object({
  fullName: z
    .string(words.validation.fullNameRequired)
    .min(1, words.validation.fullNameRequired)
    .max(80, words.validation.fullNameTooLong),
  email: z
    .string(words.validation.emailRequired)
    .min(1, words.validation.emailRequired)
    .email(words.validation.emailInvalid),
  password: z.string(words.validation.passwordMinLength).min(8, words.validation.passwordMinLength),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;

// ---------- owner session through NestJS (decision T116: the browser never talks to Supabase) ----------

const AuthEmailSchema = z
  .string(words.validation.emailRequired)
  .trim()
  .toLowerCase()
  .min(1, words.validation.emailRequired)
  .pipe(z.email(words.validation.emailInvalid).max(254));

// The 6-digit code from the email (T89, T108); spaces typed between digits are dropped.
export const EmailCodeSchema = z
  .string()
  .transform((v) => v.replace(/\s/g, ''))
  .pipe(z.string().regex(/^\d{6}$/));

export const NewPasswordSchema = z
  .string(words.validation.passwordMinLength)
  .min(8, words.validation.passwordMinLength)
  .max(72);

export const EmailInputSchema = z.object({ email: AuthEmailSchema });
export type EmailInput = z.infer<typeof EmailInputSchema>;

export const VerifyCodeInputSchema = z.object({ email: AuthEmailSchema, code: EmailCodeSchema });
export type VerifyCodeInput = z.input<typeof VerifyCodeInputSchema>;

export const ResetPasswordInputSchema = z.object({
  email: AuthEmailSchema,
  code: EmailCodeSchema,
  newPassword: NewPasswordSchema,
});
export type ResetPasswordInput = z.input<typeof ResetPasswordInputSchema>;

// Settings › Account: the signed-in owner's own email gets the code.
export const ChangePasswordInputSchema = z.object({
  code: EmailCodeSchema,
  newPassword: NewPasswordSchema,
});
export type ChangePasswordInput = z.input<typeof ChangePasswordInputSchema>;

export const OwnerSessionSchema = z.object({
  userId: z.string().min(1),
  email: z.string(),
  fullName: z.string().nullable(),
  // The founder's Super Admin (app_metadata.platform_admin on the account, never set by the user).
  isAdmin: z.boolean(),
});
export type OwnerSession = z.infer<typeof OwnerSessionSchema>;

export const OkSchema = z.object({ ok: z.literal(true) });
export type Ok = z.infer<typeof OkSchema>;
