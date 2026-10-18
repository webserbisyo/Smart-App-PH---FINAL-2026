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
