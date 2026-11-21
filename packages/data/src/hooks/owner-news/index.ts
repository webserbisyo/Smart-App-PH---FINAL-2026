// Push News (T106): Members › News reads and writes. The shop comes from the login, so no key carries a slug.
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { NewsTestInput, OwnerNews, PushSettings, SaveNewsInput } from '@smartapp/core';
import { useAdapters } from '../../adapters/index';
import { ownerHomeQk } from '../owner-home/qk';

export const ownerNewsQk = {
  all: ['owner-news'] as const,
  overview: () => ['owner-news', 'overview'] as const,
  one: (id: string) => ['owner-news', 'one', id] as const,
};

function newsChanged(qc: QueryClient, news: OwnerNews | null): void {
  if (news) qc.setQueryData(ownerNewsQk.one(news.id), news);
  void qc.invalidateQueries({ queryKey: ownerNewsQk.overview() });
  void qc.invalidateQueries({ queryKey: ownerHomeQk.all });
}

/** The News tab: phones, this week's limit, the automatic switches and every news. Refreshes while one sends. */
export function useNewsOverview() {
  const { ownerNews } = useAdapters();
  return useQuery({
    queryKey: ownerNewsQk.overview(),
    queryFn: () => ownerNews.getNewsOverview(),
    refetchInterval: (query) =>
      query.state.data?.news.some((n) => n.status === 'sending') ? 1500 : false,
  });
}

export function useNews(newsId: string | null) {
  const { ownerNews } = useAdapters();
  return useQuery({
    queryKey: ownerNewsQk.one(newsId ?? ''),
    queryFn: () => ownerNews.getNews({ newsId: newsId ?? '' }),
    enabled: newsId !== null,
    refetchInterval: (query) => (query.state.data?.status === 'sending' ? 1500 : false),
  });
}

export function useSaveNews() {
  const { ownerNews } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveNewsInput) => ownerNews.saveNews(input),
    onSuccess: (news) => newsChanged(qc, news),
  });
}

export function useCancelNews() {
  const { ownerNews } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (newsId: string) => ownerNews.cancelNews({ newsId }),
    onSuccess: (news) => newsChanged(qc, news),
  });
}

export function useDeleteNews() {
  const { ownerNews } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (newsId: string) => ownerNews.deleteNews({ newsId }),
    onSuccess: (_ok, newsId) => {
      qc.removeQueries({ queryKey: ownerNewsQk.one(newsId) });
      newsChanged(qc, null);
    },
  });
}

export function useSendNewsTest() {
  const { ownerNews } = useAdapters();
  return useMutation({ mutationFn: (input: NewsTestInput) => ownerNews.sendNewsTest(input) });
}

export function useSavePushSettings() {
  const { ownerNews } = useAdapters();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PushSettings) => ownerNews.savePushSettings(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ownerNewsQk.overview() }),
  });
}
