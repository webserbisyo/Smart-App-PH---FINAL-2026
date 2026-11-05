import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { ListCustomersInput, StampCardSettings } from '@smartapp/core';
import { useAdapters } from '../../adapters/index';
import { ownerMembersQk } from './qk';

export function useStampCard() {
  const { ownerMembers } = useAdapters();
  return useQuery({
    queryKey: ownerMembersQk.stampCard(),
    queryFn: () => ownerMembers.getStampCard(),
  });
}

export function useMembersOverview() {
  const { ownerMembers } = useAdapters();
  return useQuery({
    queryKey: ownerMembersQk.overview(),
    queryFn: () => ownerMembers.getMembersOverview(),
  });
}

/** One page of the Members list; the last page stays on screen while the next filter loads. */
export function useCustomers(input: ListCustomersInput) {
  const { ownerMembers } = useAdapters();
  return useQuery({
    queryKey: ownerMembersQk.list(input),
    queryFn: () => ownerMembers.listCustomers(input),
    placeholderData: keepPreviousData,
  });
}

/** The Members list page by page ("Show more"); a new filter starts again from the top. */
export function useCustomerPages(input: Omit<ListCustomersInput, 'cursor'>) {
  const { ownerMembers } = useAdapters();
  return useInfiniteQuery({
    queryKey: [...ownerMembersQk.lists(), 'pages', input] as const,
    queryFn: ({ pageParam }) => ownerMembers.listCustomers({ ...input, cursor: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}

export function useMember(customerId: string | null) {
  const { ownerMembers } = useAdapters();
  return useQuery({
    queryKey: ownerMembersQk.member(customerId ?? ''),
    queryFn: () => ownerMembers.getMember({ customerId: customerId ?? '' }),
    enabled: customerId !== null,
  });
}

export function useRewardClaims() {
  const { ownerMembers } = useAdapters();
  return useQuery({
    queryKey: ownerMembersQk.claims(),
    queryFn: () => ownerMembers.listRewardClaims(),
  });
}

/** What a stamp card change would do, both ways (M9); null while there is no change to check. */
export function useStampCardPreview(next: StampCardSettings | null) {
  const { ownerMembers } = useAdapters();
  return useQuery({
    queryKey: ownerMembersQk.preview(JSON.stringify(next)),
    queryFn: () => {
      if (!next) throw new Error('no change to preview');
      return ownerMembers.previewStampCardChange(next);
    },
    enabled: next !== null,
    placeholderData: keepPreviousData,
  });
}
