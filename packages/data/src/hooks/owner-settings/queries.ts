import { useQuery } from '@tanstack/react-query';
import type { CleanupKind } from '@smartapp/core';
import { useAdapters } from '../../adapters/index';
import { ownerSettingsQk } from './qk';

/** The whole Settings area in one read; each section edits its own part. */
export function useOwnerSettings() {
  const { ownerSettings } = useAdapters();
  return useQuery({
    queryKey: ownerSettingsQk.settings(),
    queryFn: () => ownerSettings.getSettings(),
  });
}

export function useOwnerProfile() {
  const { ownerSettings } = useAdapters();
  return useQuery({
    queryKey: ownerSettingsQk.profile(),
    queryFn: () => ownerSettings.getProfile(),
    staleTime: 60_000,
  });
}

export function useNotificationPrefs() {
  const { ownerSettings } = useAdapters();
  return useQuery({
    queryKey: ownerSettingsQk.notifications(),
    queryFn: () => ownerSettings.getNotificationPrefs(),
  });
}

/** The plan and its Billing chat; while a payment waits to be checked it looks again every 10 s, else every minute. */
export function usePlan() {
  const { ownerSettings } = useAdapters();
  return useQuery({
    queryKey: ownerSettingsQk.plan(),
    queryFn: () => ownerSettings.getPlan(),
    refetchInterval: (query) => (query.state.data?.pending ? 10_000 : 60_000),
  });
}

/** Used storage, cleanups and the last export; while an export is being made it looks every 2 s. */
export function useStorage() {
  const { ownerSettings } = useAdapters();
  return useQuery({
    queryKey: ownerSettingsQk.storage(),
    queryFn: () => ownerSettings.getStorage(),
    refetchInterval: (query) =>
      query.state.data?.lastExport?.status === 'preparing' ? 2_000 : false,
  });
}

/** What a cleanup would delete, read fresh when its confirm opens; null while it is closed. */
export function useCleanupPreview(kind: CleanupKind | null) {
  const { ownerSettings } = useAdapters();
  return useQuery({
    queryKey: ownerSettingsQk.cleanup(kind ?? ''),
    queryFn: () => {
      if (!kind) throw new Error('no cleanup picked');
      return ownerSettings.previewCleanup({ kind });
    },
    enabled: kind !== null,
    staleTime: 0,
    gcTime: 0,
  });
}
