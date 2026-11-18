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
