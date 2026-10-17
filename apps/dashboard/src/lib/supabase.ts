import { createAuthClient } from '@smartapp/data';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'placeholder-key';

export const supabase = createAuthClient(supabaseUrl, supabaseKey);
