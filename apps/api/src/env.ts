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
    // Shops' own addresses (launch phase 5, X8): `https://<slug>.<SHOP_DOMAIN>` may call too, besides the
    // exact list above. Empty on a laptop.
    SHOP_DOMAIN: optionalText(z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/)),
    // The storefront's server reads send this (header x-server-read) so the per-address rate limit skips
    // them: every page render comes from a few Vercel addresses (launch phase 5).
    SERVER_READ_SECRET: optionalText(z.string().min(32)),
    // Proxies in front of the API (Railway: 1), so rate limits see the phone's address, not the proxy's.
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    // Meta Conversions API (T90): all optional until launch; without them events wait unsent.
    META_PIXEL_ID: optionalText(z.string().regex(/^\d{5,20}$/)),
    META_CAPI_TOKEN: optionalText(z.string().min(20)),
    META_TEST_EVENT_CODE: z.string().max(40).optional(),
    // The storefront (launch phase 4, R8): NestJS tells it which shop's cached pages to read again.
    STOREFRONT_URL: z
      .url()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    STOREFRONT_REVALIDATE_SECRET: optionalText(z.string().min(32)),
    // The dashboard's address (launch phase 5): links in the owner's pushes and emails.
    DASHBOARD_URL: z
      .url()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    // One platform key pair for every shop's pushes (Q5, R6). Without them on a laptop, pushes are only
    // recorded, never sent. The subject is a real mailto: or https: address (Apple refuses others).
    VAPID_PUBLIC_KEY: optionalText(z.string().regex(/^[A-Za-z0-9_-]{80,100}$/)),
    VAPID_PRIVATE_KEY: optionalText(z.string().regex(/^[A-Za-z0-9_-]{40,50}$/)),
    VAPID_SUBJECT: optionalText(z.string().regex(/^(mailto:[^\s@]+@[^\s@]+|https:\/\/\S+)$/)),
    // The owner's emails go through Resend's HTTPS API (Q4: Railway blocks mail ports). Without a key on a
    // laptop, emails are only recorded.
    RESEND_API_KEY: optionalText(z.string().regex(/^re_[A-Za-z0-9_]{10,200}$/)),
    EMAIL_FROM: optionalText(z.string().min(5).max(200)),
    // The founder's own login email: Super Admin on a laptop (seed:demo), and where an owner's account
    // delete request goes.
    ADMIN_EMAIL: optionalText(z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
    // Super Admin's authenticator app code (T118 Q16). Always on in staging and production; `on` tries it
    // on a laptop (local Supabase needs TOTP turned on in supabase/config.toml, which it is).
    ADMIN_SECOND_STEP: z.enum(['on', 'off']).default('off'),
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
    for (const key of [
      'STOREFRONT_URL',
      'STOREFRONT_REVALIDATE_SECRET',
      'SERVER_READ_SECRET',
      'DASHBOARD_URL',
      'VAPID_PUBLIC_KEY',
      'VAPID_PRIVATE_KEY',
      'VAPID_SUBJECT',
      'RESEND_API_KEY',
      'EMAIL_FROM',
      'ADMIN_EMAIL',
    ] as const) {
      if (!env[key])
        ctx.addIssue({ code: 'custom', path: [key], message: 'Needed outside development' });
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

/** Whether Super Admin needs the authenticator code (T118 Q16): never off outside a laptop. */
export function secondStepRequired(appEnv: ApiEnv, setting: 'on' | 'off' | undefined): boolean {
  return appEnv !== 'development' || setting === 'on';
}

/** The dashboard and storefront addresses allowed to call with cookies (exact matches, never `*`). */
export function corsOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

const SHOP_LABEL = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Whether a browser address may call with cookies: one of the exact list, or a shop's own address
 * `https://<slug>.<shopDomain>` (X8). Never a pattern wider than one label under our own domain.
 */
export function originAllowed(
  origin: string,
  exact: ReadonlySet<string>,
  shopDomain: string | undefined,
): boolean {
  if (exact.has(origin)) return true;
  if (!shopDomain) return false;
  const suffix = `.${shopDomain}`;
  const prefix = 'https://';
  if (!origin.startsWith(prefix) || !origin.endsWith(suffix)) return false;
  const label = origin.slice(prefix.length, -suffix.length);
  return label.length > 0 && label.length <= 40 && SHOP_LABEL.test(label);
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
