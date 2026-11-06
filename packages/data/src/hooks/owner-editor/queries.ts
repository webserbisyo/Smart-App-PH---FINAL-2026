import { useQuery } from '@tanstack/react-query';
import { useAdapters } from '../../adapters/index';
import { ownerEditorQk } from './qk';

// The Editor holds the draft itself while the owner works, so the read never refreshes behind them.
export function useStorefrontDraft() {
  const { ownerEditor } = useAdapters();
  return useQuery({
    queryKey: ownerEditorQk.draft(),
    queryFn: () => ownerEditor.getStorefrontDraft(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
