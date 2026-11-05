import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';
import { CustomerFilterEnum, MemberSortEnum } from '@smartapp/core';

// The Members list lives in the address (T57): group, search, sort, a progress bar and the open member.
export const MembersSearchSchema = z.object({
  filter: CustomerFilterEnum.optional().catch(undefined),
  q: z.string().max(80).optional().catch(undefined),
  sort: MemberSortEnum.optional().catch(undefined),
  stamps: z.coerce.number().int().min(0).max(20).optional().catch(undefined),
  member: z.string().min(1).max(64).optional().catch(undefined),
});
export type MembersSearch = z.infer<typeof MembersSearchSchema>;

export function useMembersSearch(): MembersSearch {
  const search = useSearch({ strict: false });
  return MembersSearchSchema.parse({
    filter: search.filter,
    q: search.q,
    sort: search.sort,
    stamps: search.stamps,
    member: search.member,
  });
}

/** Changes some params and keeps the rest. `replace` for typing and filters, so Back stays useful. */
export function useSetMembersSearch() {
  const navigate = useNavigate();
  return useCallback(
    (patch: Partial<MembersSearch>, options: { replace?: boolean } = {}) => {
      void navigate({
        to: '/members',
        search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }),
        replace: options.replace ?? false,
      });
    },
    [navigate],
  );
}
