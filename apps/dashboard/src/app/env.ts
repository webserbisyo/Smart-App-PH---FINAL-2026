import { z } from 'zod';
import { DataSourceSchema } from '@smartapp/data/env';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_API_URL: z.url(),
  VITE_STOREFRONT_URL: z.url(),
  VITE_SHOW_KIT: z.enum(['true', 'false']).default('false'),
  // Mock adapters or the API, area by area (default: mock).
  VITE_DATA_SOURCE: DataSourceSchema,
});

export const env = envSchema.parse(import.meta.env);
