import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PublishStorefrontInput, SaveStorefrontDraftInput } from '@smartapp/core';
import { useAdapters } from '../../adapters/index';
import { ownerHomeQk } from '../owner-home/qk';
import { ownerEditorQk } from './qk';

// Autosave (E1): the saved state goes straight into the cache, so the next save starts from its version.
export function useSaveStorefrontDraft() {
  const { ownerEditor } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveStorefrontDraftInput) => ownerEditor.saveStorefrontDraft(input),
    onSuccess: (state) => qc.setQueryData(ownerEditorQk.draft(), state),
  });
}

// Publish and Discard read the draft again, and anything showing the shop (Home, the storefront) refreshes.
export function usePublishStorefront() {
  const { ownerEditor } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishStorefrontInput) => ownerEditor.publishStorefront(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ownerEditorQk.all });
      void qc.invalidateQueries({ queryKey: ownerHomeQk.all });
      void qc.invalidateQueries({ queryKey: ['storefront'] });
    },
  });
}

export function useDiscardStorefrontDraft() {
  const { ownerEditor } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ownerEditor.discardStorefrontDraft(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ownerEditorQk.all });
    },
  });
}

export function useCreatePreviewToken() {
  const { ownerEditor } = useAdapters();
  return useMutation({ mutationFn: () => ownerEditor.createPreviewToken() });
}
