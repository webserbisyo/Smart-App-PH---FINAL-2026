import { z } from 'zod';

export const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().url(),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
  // Meta Conversions API (T90): all optional until launch; without them events wait unsent.
  META_PIXEL_ID: z
    .string()
    .regex(/^\d{5,20}$/)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  META_CAPI_TOKEN: z
    .string()
    .min(20)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  META_TEST_EVENT_CODE: z.string().max(40).optional(),
  META_GRAPH_VERSION: z
    .string()
    .regex(/^v\d+\.\d+$/)
    .default('v27.0'),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }
  return result.data;
}
