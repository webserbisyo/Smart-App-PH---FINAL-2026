import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  CleanupKind,
  CreateExportInput,
  DeliverySettings,
  HoursSettings,
  NotificationPrefs,
  OrderingSettings,
  OwnerSettings,
  PaymentSettings,
  SaveProfileInput,
  SendBillingNoteInput,
  ShopFacts,
  SubmitPlanPaymentInput,
} from '@smartapp/core';
import { useAdapters } from '../../adapters/index';
import { ownerOrdersQk } from '../owner-orders/qk';
import { qk as storefrontQk } from '../storefront/qk';
import { ownerSettingsQk } from './qk';

/**
 * A saved section goes straight into the Settings cache; the storefront, the Orders page's Order times and
 * anything else reading the shop refresh behind it, so the change shows everywhere at once.
 */
function settingsChanged(qc: QueryClient, settings: OwnerSettings): void {
  qc.setQueryData(ownerSettingsQk.settings(), settings);
  void qc.invalidateQueries({ queryKey: storefrontQk.storefront(settings.slug) });
  void qc.invalidateQueries({ queryKey: ownerOrdersQk.bookingRules(settings.slug) });
}

export function useSaveShopFacts() {
  const { ownerSettings } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ShopFacts) => ownerSettings.saveShopFacts(input),
    onSuccess: (s) => settingsChanged(qc, s),
  });
}

export function useSaveHours() {
  const { ownerSettings } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HoursSettings) => ownerSettings.saveHours(input),
    onSuccess: (s) => settingsChanged(qc, s),
  });
}

export function useSaveOrdering() {
  const { ownerSettings } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrderingSettings) => ownerSettings.saveOrdering(input),
    onSuccess: (s) => settingsChanged(qc, s),
  });
}

export function useSaveDelivery() {
  const { ownerSettings } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DeliverySettings) => ownerSettings.saveDelivery(input),
    onSuccess: (s) => settingsChanged(qc, s),
  });
}

export function useSavePayments() {
  const { ownerSettings } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentSettings) => ownerSettings.savePayments(input),
    onSuccess: (s) => settingsChanged(qc, s),
  });
}

export function useSaveProfile() {
  const { ownerSettings } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveProfileInput) => ownerSettings.saveProfile(input),
    onSuccess: (profile) => {
      qc.setQueryData(ownerSettingsQk.profile(), profile);
      void qc.invalidateQueries({ queryKey: ownerSettingsQk.storage() });
    },
  });
}

export function useSendPasswordCode() {
  const { ownerSettings } = useAdapters();
  return useMutation({ mutationFn: () => ownerSettings.sendPasswordCode() });
}

export function useResetPasswordWithCode() {
  const { ownerSettings } = useAdapters();
  return useMutation({
    mutationFn: (input: { code: string; newPassword: string }) =>
      ownerSettings.resetPasswordWithCode(input),
  });
}

export function useSignOutEverywhere() {
  const { ownerSettings } = useAdapters();
  return useMutation({ mutationFn: () => ownerSettings.signOutEverywhere() });
}

export function useRequestAccountDelete() {
  const { ownerSettings } = useAdapters();
  return useMutation({ mutationFn: () => ownerSettings.requestAccountDelete() });
}

export function useSaveNotificationPrefs() {
  const { ownerSettings } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationPrefs) => ownerSettings.saveNotificationPrefs(input),
    onSuccess: (prefs) => qc.setQueryData(ownerSettingsQk.notifications(), prefs),
  });
}

export function useSubmitPlanPayment() {
  const { ownerSettings } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitPlanPaymentInput) => ownerSettings.submitPlanPayment(input),
    onSuccess: (plan) => qc.setQueryData(ownerSettingsQk.plan(), plan),
  });
}

/** A note in the Billing chat (T88). */
export function useSendPlanNote() {
  const { ownerSettings } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendBillingNoteInput) => ownerSettings.sendPlanNote(input),
    onSuccess: (plan) => qc.setQueryData(ownerSettingsQk.plan(), plan),
  });
}

export function useRunCleanup() {
  const { ownerSettings } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { kind: CleanupKind; token: string }) => ownerSettings.runCleanup(input),
    onSuccess: (summary) => {
      qc.setQueryData(ownerSettingsQk.storage(), summary);
      void qc.invalidateQueries({ queryKey: ['owner-settings', 'cleanup'] });
    },
  });
}

export function useCreateExport() {
  const { ownerSettings } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExportInput) => ownerSettings.createExport(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ownerSettingsQk.storage() }),
  });
}
