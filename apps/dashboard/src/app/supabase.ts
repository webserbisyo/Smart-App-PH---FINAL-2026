import { createAuthClient } from '@smartapp/data';
import { env } from './env.js';

export const supabase = createAuthClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
