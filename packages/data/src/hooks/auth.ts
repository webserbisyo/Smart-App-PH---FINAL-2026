// The owner's login hooks (decision T116). They take the app's OwnerAuth (createOwnerAuth), which calls NestJS
// or, on sample data, the small mock: never Supabase from the browser (T34).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoginInput, ResetPasswordInput, SignUpInput, VerifyCodeInput } from '@smartapp/core';
import type { OwnerAuth, UserClaims } from '../owner-auth';

export const authKeys = {
  session: ['auth', 'session'] as const,
};

export function useSession(auth: OwnerAuth) {
  return useQuery<UserClaims | null>({
    queryKey: authKeys.session,
    queryFn: () => auth.getSession(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSignIn(auth: OwnerAuth) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => auth.signIn(input),
    onSuccess: (claims) => queryClient.setQueryData(authKeys.session, claims),
  });
}

/** Makes the account and emails the 6-digit code (T89). */
export function useSignUp(auth: OwnerAuth) {
  return useMutation({ mutationFn: (input: SignUpInput) => auth.signUp(input) });
}

/** The 6-digit code from the sign-up email: confirms the email and signs the owner in. */
export function useVerifySignupCode(auth: OwnerAuth) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VerifyCodeInput) => auth.verifySignupCode(input),
    onSuccess: (claims) => queryClient.setQueryData(authKeys.session, claims),
  });
}

export function useResendSignupCode(auth: OwnerAuth) {
  return useMutation({ mutationFn: (input: { email: string }) => auth.resendSignupCode(input) });
}

/** Forgot password, step 1 (T108): answers the same whether or not the email has an account (rule 12). */
export function useSendResetCode(auth: OwnerAuth) {
  return useMutation({ mutationFn: (input: { email: string }) => auth.sendResetCode(input) });
}

/** Forgot password, step 2: the code signs the owner in and the new password is saved. */
export function useResetPassword(auth: OwnerAuth) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => auth.resetPassword(input),
    onSuccess: (claims) => queryClient.setQueryData(authKeys.session, claims),
  });
}

export function useSignOut(auth: OwnerAuth) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => auth.signOut(),
    onSuccess: () => queryClient.setQueryData(authKeys.session, null),
  });
}
