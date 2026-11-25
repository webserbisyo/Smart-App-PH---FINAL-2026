import {
  AppEnvSchema,
  CommitShaSchema,
  DashboardUrlSchema,
  DataSourceSchema,
  SwitchSchema,
} from '@smartapp/data/env';

// Checked at start. DATA_SOURCE picks the mock adapters or the API, area by area (default: mock).
export const dataSource = DataSourceSchema.parse(process.env.NEXT_PUBLIC_DATA_SOURCE || undefined);

// development, preview (hosted sample data with the Preview panel, T100) or production.
export const appEnv = AppEnvSchema.parse(process.env.NEXT_PUBLIC_APP_ENV || undefined);

// The NestJS address and the areas a sample-data build takes from it (launch phase 5, per-area switch).
// Plain text here, so no schema reaches the shop pages' JS; server/env.ts checks both with Zod at start.
export const apiUrl = process.env.NEXT_PUBLIC_API_URL || undefined;
export const apiAreas = (process.env.NEXT_PUBLIC_API_AREAS || '')
  .split(',')
  .map((area) => area.trim())
  .filter((area) => area.length > 0);

// SERWIST_DEV=1 turns the service worker on in `next dev` (off by default, so hot reload stays sane).
export const serwistDev = SwitchSchema.parse(process.env.SERWIST_DEV || undefined) === '1';

// Vercel's commit for the offline page's precache revision when git is not there (server only).
export const vercelCommit = CommitShaSchema.parse(process.env.VERCEL_GIT_COMMIT_SHA || undefined);

// The dashboard's origin: the only page that may frame the Editor preview and send it a draft (T72).
export const dashboardOrigin = new URL(
  DashboardUrlSchema.parse(process.env.NEXT_PUBLIC_DASHBOARD_URL || undefined),
).origin;
