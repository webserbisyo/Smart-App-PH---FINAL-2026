import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  AdminShopDetail,
  BillingNoteInput,
  CloseShopInput,
  CreateClientInput,
  DeleteShopInput,
  ExtendDaysInput,
  PlatformSetup,
  RecordPlanPaymentInput,
  ReviewPlanPaymentInput,
  SetTrackingInput,
  StartSupportInput,
  TrackingSummary,
} from '@smartapp/core';
import { useAdapters } from '../../adapters/index';
import { ownerSettingsQk } from '../owner-settings/qk';
import { onboardingQk } from '../onboarding/index';
import { platformQk } from './qk';

/** A changed shop goes straight into its panel; the lists, Today and Payments refresh behind it. */
function shopChanged(qc: QueryClient, shop: AdminShopDetail): void {
  qc.setQueryData(platformQk.shop(shop.id), shop);
  void qc.invalidateQueries({ queryKey: ['platform', 'shops'] });
  void qc.invalidateQueries({ queryKey: platformQk.today() });
  void qc.invalidateQueries({ queryKey: ['platform', 'payments'] });
  void qc.invalidateQueries({ queryKey: platformQk.tracking() });
  // The demo shares one browser: the owner's own Plan and go-live card show the change too.
  void qc.invalidateQueries({ queryKey: ownerSettingsQk.plan() });
  void qc.invalidateQueries({ queryKey: onboardingQk.status() });
}

function useShopMutation<I>(fn: (input: I) => Promise<AdminShopDetail>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: (shop) => shopChanged(qc, shop) });
}

export function useApproveGoLive() {
  const { platform } = useAdapters();
  return useShopMutation((input: { shopId: string }) => platform.approveGoLive(input));
}

export function useReviewPlanPayment() {
  const { platform } = useAdapters();
  return useShopMutation((input: ReviewPlanPaymentInput) => platform.reviewPlanPayment(input));
}

export function useRecordPlanPayment() {
  const { platform } = useAdapters();
  return useShopMutation((input: RecordPlanPaymentInput) => platform.recordPlanPayment(input));
}

export function useExtendPlan() {
  const { platform } = useAdapters();
  return useShopMutation((input: ExtendDaysInput) => platform.extendPlan(input));
}

export function useSendPlanReminder() {
  const { platform } = useAdapters();
  return useShopMutation((input: { shopId: string }) => platform.sendPlanReminder(input));
}

export function useSendBillingNote() {
  const { platform } = useAdapters();
  return useShopMutation((input: BillingNoteInput) => platform.sendBillingNote(input));
}

export function useCloseShop() {
  const { platform } = useAdapters();
  return useShopMutation((input: CloseShopInput) => platform.closeShop(input));
}

export function useReopenShop() {
  const { platform } = useAdapters();
  return useShopMutation((input: { shopId: string }) => platform.reopenShop(input));
}

export function useCreateClientShop() {
  const { platform } = useAdapters();
  return useShopMutation((input: CreateClientInput) => platform.createClientShop(input));
}

export function useDeleteShop() {
  const { platform } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteShopInput) => platform.deleteShop(input),
    onSuccess: (_ok, input) => {
      qc.removeQueries({ queryKey: platformQk.shop(input.shopId) });
      void qc.invalidateQueries({ queryKey: platformQk.all });
    },
  });
}

export function useMarkLeadContacted() {
  const { platform } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { leadId: string }) => platform.markLeadContacted(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: platformQk.leads() }),
  });
}

export function useStartSupport() {
  const { platform } = useAdapters();
  return useMutation({ mutationFn: (input: StartSupportInput) => platform.startSupport(input) });
}

export function useEndSupport() {
  const { platform } = useAdapters();
  return useMutation({ mutationFn: () => platform.endSupport() });
}

function useTrackingMutation<I>(fn: (input: I) => Promise<TrackingSummary>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (summary) => {
      qc.setQueryData(platformQk.tracking(), summary);
      void qc.invalidateQueries({ queryKey: platformQk.today() });
    },
  });
}

export function useSetTracking() {
  const { platform } = useAdapters();
  return useTrackingMutation((input: SetTrackingInput) => platform.setTracking(input));
}

export function useRetryTrackEvents() {
  const { platform } = useAdapters();
  return useTrackingMutation<void>(() => platform.retryTrackEvents());
}

export function useSendTestEvent() {
  const { platform } = useAdapters();
  return useTrackingMutation<void>(() => platform.sendTestEvent());
}

export function useSavePlatformSetup() {
  const { platform } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlatformSetup) => platform.savePlatformSetup(input),
    onSuccess: (setup) => {
      qc.setQueryData(platformQk.setup(), setup);
      void qc.invalidateQueries({ queryKey: ownerSettingsQk.plan() });
    },
  });
}
