import { z } from 'zod';

// DATA_SOURCE per app, checked with Zod at start. Each area moves to 'api' when its backend lands (phase 4).
export const DATA_SOURCES = ['mock', 'api'] as const;
export const DataSourceSchema = z.enum(DATA_SOURCES).default('mock');
export type DataSource = z.infer<typeof DataSourceSchema>;
