// Push News on the storefront (T106): this phone's news yes or no and the shop's news of the last 30 days.
// Only the late-loading news parts import these, so they stay out of every page's first JavaScript (T31).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useShopAdapters } from '../../adapters/index';

const newsQk = {
  choice: (slug: string) => ['storefront', slug, 'news-choice'] as const,
  inbox: (slug: string) => ['storefront', slug, 'news'] as const,
};

export function useNewsChoice(slug: string) {
  const { storefront } = useShopAdapters();
  return useQuery({
    queryKey: newsQk.choice(slug),
    queryFn: () => storefront.getNewsChoice({ slug }),
  });
}

export function useSetNewsChoice(slug: string) {
  const { storefront } = useShopAdapters();
  const client = useQueryClient();
  return useMutation({
    networkMode: 'always',
    retry: false,
    mutationFn: (news: boolean) => storefront.setNewsChoice({ slug, news }),
    onSuccess: (result) => client.setQueryData(newsQk.choice(slug), result),
  });
}

export function useShopNews(slug: string, enabled = true) {
  const { storefront } = useShopAdapters();
  return useQuery({
    queryKey: newsQk.inbox(slug),
    queryFn: () => storefront.listShopNews({ slug }),
    enabled,
  });
}

/** Counts a tapped news push once (the `d` in its link); a failure is not shown, the page still opens. */
export function useMarkNewsOpened(slug: string) {
  const { storefront } = useShopAdapters();
  return useMutation({
    retry: 2,
    mutationFn: (deliveryId: string) => storefront.markNewsOpened({ slug, deliveryId }),
  });
}
