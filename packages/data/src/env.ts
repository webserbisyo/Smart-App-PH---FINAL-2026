import { z } from 'zod';

// DATA_SOURCE per app, checked with Zod at start. Each area moves to 'api' when its backend lands (phase 4).
export const DATA_SOURCES = ['mock', 'api'] as const;
export const DataSourceSchema = z.enum(DATA_SOURCES).default('mock');
export type DataSource = z.infer<typeof DataSourceSchema>;

// A 0/1 switch from the environment (e.g. SERWIST_DEV), off unless set to 1.
export const SwitchSchema = z.enum(['0', '1']).default('0');
// The commit a build came from (Vercel sets VERCEL_GIT_COMMIT_SHA); optional everywhere else.
export const CommitShaSchema = z
  .string()
  .regex(/^[0-9a-f]{7,40}$/)
  .optional();
