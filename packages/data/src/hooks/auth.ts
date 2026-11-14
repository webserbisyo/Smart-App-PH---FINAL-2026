import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LoginInput, SignUpInput } from '@smartapp/core';
import { getClaims, mapAuthError, mapCodeError, type UserClaims } from '../auth';
import type { Database } from '../database.types';

export const authKeys = {
  session: ['auth', 'session'] as const,
};

export function useSession(client: SupabaseClient<Database>) {
  return useQuery<UserClaims | null>({
    queryKey: authKeys.session,
    queryFn: () => getClaims(client),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useSignIn(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password }: LoginInput) => {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw mapAuthError(error, true);
      }
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.session });
    },
  });
}

export function useSignUp(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fullName,
      email,
      password,
      phone,
    }: SignUpInput & { phone?: string | undefined }) => {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            ...(phone ? { phone } : {}),
          },
        },
      });
      if (error) {
        throw mapAuthError(error, false);
      }
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.session });
    },
  });
}

/** The 6-digit code from the sign-up email (T89): confirms the email and signs the owner in. */
export function useVerifySignupCode(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const { data, error } = await client.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) throw mapCodeError(error);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.session });
    },
  });
}

/** Sends the sign-up code again. */
export function useResendSignupCode(client: SupabaseClient<Database>) {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { error } = await client.auth.resend({ type: 'signup', email });
      if (error) throw mapAuthError(error, false);
    },
  });
}

export function useSignOut(client: SupabaseClient<Database>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await client.auth.signOut();
      if (error) {
        throw mapAuthError(error, false);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.session });
    },
  });
}
