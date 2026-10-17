import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LoginInput, SignUpInput } from '@smartapp/core';
import { getClaims, mapAuthError, type UserClaims } from '../auth.js';
import type { Database } from '../database.types.js';

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
    mutationFn: async ({ fullName, email, password }: SignUpInput) => {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
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
