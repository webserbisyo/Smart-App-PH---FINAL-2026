import { z } from 'zod';
import { ApiAreasSchema, AppEnvSchema, DataSourceSchema } from '@smartapp/data/env';

const envSchema = z.object({
  // NestJS (decision T34): the only server the dashboard talks to. No Supabase address or key here (T116).
  VITE_API_URL: z.url(),
  VITE_STOREFRONT_URL: z.url(),
  VITE_SHOW_KIT: z.enum(['true', 'false']).default('false'),
  // development, preview (hosted sample data with the Preview panel, T100) or production.
  VITE_APP_ENV: AppEnvSchema,
  // Mock adapters or the API, area by area (default: mock).
  VITE_DATA_SOURCE: DataSourceSchema,
  // Areas taken from the API on a sample-data build (staging, T116), e.g. ownerAuth,onboarding.
  VITE_API_AREAS: ApiAreasSchema,
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
