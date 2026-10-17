import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.js';

export interface CookieStoreLike {
  getAll(): Array<{ name: string; value: string }>;
  setAll(
    cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>,
  ): void;
}

export function createServerAuthClient(
  url: string,
  publishableKey: string,
  cookies: CookieStoreLike,
): SupabaseClient<Database> {
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookies.setAll(cookiesToSet);
      },
    },
  });
}

export async function refreshSession(
  request: Request,
  url: string,
  publishableKey: string,
): Promise<Response> {
  const response = new Response(null);
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get('Cookie') ?? '';
        return cookieHeader
          .split(';')
          .map((c) => {
            const parts = c.trim().split('=');
            const name = parts[0] ?? '';
            const value = parts.slice(1).join('=');
            return { name, value };
          })
          .filter((c) => c.name.length > 0);
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          response.headers.append('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`);
        }
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
