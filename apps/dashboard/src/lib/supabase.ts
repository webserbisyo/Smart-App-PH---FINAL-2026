import { createAuthClient } from '@smartapp/data';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

export const supabase = createAuthClient(supabaseUrl, supabaseKey);
