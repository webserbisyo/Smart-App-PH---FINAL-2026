// Sign-up and going live (T89, T90).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RegisterShopInput, SignupLeadInput, TrackInput } from '@smartapp/core';
import { useAdapters } from '../../adapters/index';

export const onboardingQk = {
  all: ['onboarding'] as const,
  status: () => ['onboarding', 'status'] as const,
};

/** The owner's shop stage and go-live checklist; while asked, it looks again every 30 s. */
export function useOnboarding() {
  const { onboarding } = useAdapters();
  return useQuery({
    queryKey: onboardingQk.status(),
    queryFn: () => onboarding.getOnboarding(),
    refetchInterval: (query) => (query.state.data?.stage === 'asked' ? 30_000 : false),
  });
}

export function useAskToGoLive() {
  const { onboarding } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => onboarding.askToGoLive(),
    onSuccess: (status) => qc.setQueryData(onboardingQk.status(), status),
  });
}

/** Step 1 of sign-up: saved as a lead the moment the person taps Continue. */
export function useSaveSignupLead() {
  const { onboarding } = useAdapters();
  return useMutation({ mutationFn: (input: SignupLeadInput) => onboarding.saveSignupLead(input) });
}

/** After the email code: makes the shop for the new login. */
export function useRegisterShop() {
  const { onboarding } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterShopInput) => onboarding.registerShop(input),
    onSuccess: (status) => qc.setQueryData(onboardingQk.status(), status),
  });
}

/** A browser event the server sends on to Meta with the same id (T90). Never blocks the page. */
export function useTrackEvent() {
  const { onboarding } = useAdapters();
  return useMutation({ mutationFn: (input: TrackInput) => onboarding.trackEvent(input) });
}
