import { z } from 'zod';

// Which API this is (decision T116): `development` (a laptop or a test), `staging` (api-staging., the dev
// database) or `production` (api., the live database). Staging and production refuse to start with a
// missing secret or an http address.
export const API_ENVS = ['development', 'staging', 'production'] as const;
export const ApiEnvEnum = z.enum(API_ENVS);
export type ApiEnv = z.infer<typeof ApiEnvEnum>;

const optionalText = (schema: z.ZodString) =>
  schema.optional().or(z.literal('').transform(() => undefined));

export const EnvSchema = z
  .object({
    APP_ENV: ApiEnvEnum.default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    SUPABASE_URL: z.url(),
    // The new secret key (sb_secret_...), only for Supabase Auth and Storage calls (R9). Never sent to a browser.
    SUPABASE_SECRET_KEY: optionalText(z.string().min(20)),
    // Postgres through Supabase's transaction pooler (port 6543) on Railway; the local database in development.
    DATABASE_URL: z
      .string()
      .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL must start with postgres:// or postgresql://'),
    // Supabase's server certificate (Database settings › SSL), so the pooler is verified, not only encrypted.
    DATABASE_CA_CERT: optionalText(z.string().min(100)),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
    CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
    // Proxies in front of the API (Railway: 1), so rate limits see the phone's address, not the proxy's.
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    // Meta Conversions API (T90): all optional until launch; without them events wait unsent.
    META_PIXEL_ID: optionalText(z.string().regex(/^\d{5,20}$/)),
    META_CAPI_TOKEN: optionalText(z.string().min(20)),
    META_TEST_EVENT_CODE: z.string().max(40).optional(),
    META_GRAPH_VERSION: z
      .string()
      .regex(/^v\d+\.\d+$/)
      .default('v27.0'),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV === 'development') return;
    if (!env.SUPABASE_SECRET_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['SUPABASE_SECRET_KEY'],
        message: 'Needed outside development',
      });
    }
    if (!env.SUPABASE_URL.startsWith('https://')) {
      ctx.addIssue({ code: 'custom', path: ['SUPABASE_URL'], message: 'Use https' });
    }
    for (const origin of corsOrigins(env.CORS_ORIGINS)) {
      if (!origin.startsWith('https://')) {
        ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: `Use https: ${origin}` });
      }
    }
  });

export type Env = z.infer<typeof EnvSchema>;

/** The dashboard and storefront addresses allowed to call with cookies (exact matches, never `*`). */
export function corsOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/** True when the database is on this machine (tests, `supabase start`): no TLS there. */
export function isLocalDatabase(url: string): boolean {
  const host = new URL(url).hostname;
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    // Names and reasons only, never the values (rule 9).
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Config validation error: ${problems}`);
  }
  return result.data;
}
