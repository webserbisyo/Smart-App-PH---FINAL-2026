import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_API_URL: z.url(),
  VITE_STOREFRONT_URL: z.url(),
  VITE_SHOW_KIT: z.enum(['true', 'false']).default('false'),
});

export const env = envSchema.parse(import.meta.env);
