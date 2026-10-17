import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { errorWords, type ApiError } from '@smartapp/core';
import type { Database } from './database.types.js';

let browserClient: SupabaseClient<Database> | null = null;

export function createAuthClient(url: string, publishableKey: string): SupabaseClient<Database> {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url, publishableKey);
  }
  return browserClient;
}

export interface UserClaims {
  userId: string;
  email: string;
  fullName?: string | undefined;
}

export async function getClaims(client: SupabaseClient<Database>): Promise<UserClaims | null> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || !data.user.email) {
    return null;
  }
  return {
    userId: data.user.id,
    email: data.user.email,
    fullName:
      typeof data.user.user_metadata['full_name'] === 'string'
        ? data.user.user_metadata['full_name']
        : undefined,
  };
}

function hasMessage(err: unknown): err is { message: unknown } {
  return typeof err === 'object' && err !== null && 'message' in err;
}

export function mapAuthError(err: unknown, isLogin = false): ApiError {
  if (isLogin) {
    return {
      status: 401,
      code: 'invalid_login',
      message: errorWords('invalid_login'),
    };
  }

  if (hasMessage(err)) {
    const rawMsg = String(err.message).toLowerCase();
    if (
      rawMsg.includes('already registered') ||
      rawMsg.includes('taken') ||
      rawMsg.includes('unique')
    ) {
      return {
        status: 400,
        code: 'email_taken',
        message: errorWords('email_taken'),
        fieldErrors: {
          email: [errorWords('email_taken')],
        },
      };
    }
    if (
      rawMsg.includes('password') &&
      (rawMsg.includes('short') || rawMsg.includes('weak') || rawMsg.includes('least 8'))
    ) {
      return {
        status: 400,
        code: 'weak_password',
        message: errorWords('weak_password'),
        fieldErrors: {
          password: [errorWords('weak_password')],
        },
      };
    }
  }

  return {
    status: 400,
    code: 'unknown',
    message: errorWords('unknown'),
  };
}
