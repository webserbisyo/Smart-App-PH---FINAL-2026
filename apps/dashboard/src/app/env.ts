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
  // Meta Pixel (dataset) ID for the sign-up page only (T90). Empty: no pixel loads; the server still sends.
  VITE_META_PIXEL_ID: z
    .string()
    .regex(/^\d{10,20}$/)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  // Smart App PH's Messenger link on the sign-up page.
  VITE_MESSENGER_URL: z.url().default('https://m.me/smartappph'),
});

export const env = envSchema.parse(import.meta.env);
