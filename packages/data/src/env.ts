import { z } from 'zod';

// DATA_SOURCE per app, checked with Zod at start. Each area moves to 'api' when its backend lands (phase 4).
export const DATA_SOURCES = ['mock', 'api'] as const;
export const DataSourceSchema = z.enum(DATA_SOURCES).default('mock');
export type DataSource = z.infer<typeof DataSourceSchema>;

// Which build this is (decision T100): `development` (pnpm dev), `preview` (a hosted link on sample data,
// with the Preview panel and the sample sign-in) or `production` (live). Checked with Zod at start.
export const APP_ENVS = ['development', 'preview', 'production'] as const;
export const AppEnvSchema = z.enum(APP_ENVS).default('development');
export type AppEnv = z.infer<typeof AppEnvSchema>;

// A 0/1 switch from the environment (e.g. SERWIST_DEV), off unless set to 1.
export const SwitchSchema = z.enum(['0', '1']).default('0');
// The commit a build came from (Vercel sets VERCEL_GIT_COMMIT_SHA); optional everywhere else.
export const CommitShaSchema = z
  .string()
  .regex(/^[0-9a-f]{7,40}$/)
  .optional();
// The owner dashboard's address (the storefront's Editor preview only answers it; decision T72). Defaults to
// the live dashboard so no dev address ships in a build; `pnpm dev` sets the local one.
export const DASHBOARD_URL_LIVE = 'https://app.webserbisyo.com';
export const DashboardUrlSchema = z.url().default(DASHBOARD_URL_LIVE);

// Areas wired to NestJS so far (decision T116, per-area switch). A sample-data build can take some areas from
// the API (staging: `VITE_API_AREAS=ownerAuth,onboarding,uploads,ownerSettings,ownerEditor`) while the rest stay on
// sample data. The list grows phase by phase; a live build never mixes (see dataPlan).
export const API_AREAS = [
  'ownerAuth',
  'onboarding',
  'uploads',
  'ownerSettings',
  'ownerEditor',
] as const;
export const ApiAreaEnum = z.enum(API_AREAS);
export type ApiArea = z.infer<typeof ApiAreaEnum>;

export const ApiAreasSchema = z
  .string()
  .default('')
  .transform((raw) =>
    raw
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
  )
  .pipe(z.array(ApiAreaEnum));

export interface DataPlan {
  source: DataSource;
  apiAreas: ReadonlySet<ApiArea>;
}

/**
 * Which areas come from the API. A live build (production) must be all API: it refuses to start on sample
 * data, so a paying shop can never see a fake order or member.
 */
export function dataPlan(
  source: DataSource,
  apiAreas: readonly ApiArea[],
  appEnv: AppEnv,
): DataPlan {
  if (appEnv === 'production' && source !== 'api') {
    throw new Error('A live build cannot use sample data: set DATA_SOURCE=api.');
  }
  return {
    source,
    apiAreas: new Set(source === 'api' ? API_AREAS : apiAreas),
  };
}

export function usesApi(plan: DataPlan, area: ApiArea): boolean {
  return plan.apiAreas.has(area);
}
