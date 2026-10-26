import { CommitShaSchema, DataSourceSchema, SwitchSchema } from '@smartapp/data/env';

// Checked at start. DATA_SOURCE picks the mock adapters or the API, area by area (default: mock).
export const dataSource = DataSourceSchema.parse(process.env.NEXT_PUBLIC_DATA_SOURCE || undefined);

// SERWIST_DEV=1 turns the service worker on in `next dev` (off by default, so hot reload stays sane).
export const serwistDev = SwitchSchema.parse(process.env.SERWIST_DEV || undefined) === '1';

// Vercel's commit for the offline page's precache revision when git is not there (server only).
export const vercelCommit = CommitShaSchema.parse(process.env.VERCEL_GIT_COMMIT_SHA || undefined);
