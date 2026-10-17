import { z } from 'zod';

export const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().url(),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }
  return result.data;
}
