import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const SignUpSchema = z.object({
  fullName: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;
