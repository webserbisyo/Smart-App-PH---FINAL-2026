import { DataSourceSchema } from '@smartapp/data/env';

// Checked at start. DATA_SOURCE picks the mock adapters or the API, area by area (default: mock).
export const dataSource = DataSourceSchema.parse(process.env.NEXT_PUBLIC_DATA_SOURCE || undefined);
