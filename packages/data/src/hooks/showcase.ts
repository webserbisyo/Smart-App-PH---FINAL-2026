import { useQuery } from '@tanstack/react-query';
import { useAdapters } from '../adapters/index';

/** The sign-up tour's sample shops, order chat, board, day and news (T108). Read once per visit. */
export function useShowcase() {
  const { showcase } = useAdapters();
  return useQuery({
    queryKey: ['showcase'],
    queryFn: () => showcase.getShowcase(),
    staleTime: Infinity,
  });
}
