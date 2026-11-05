// The owner Members adapter for NestJS (phase 4). Same rows as docs/api.md "Members (owner)"; the shop comes
// from the owner's login, never from the address (T34).
import {
  CounterChangeSchema,
  CustomerPageSchema,
  FoundMemberSchema,
  MemberDetailSchema,
  MembersOverviewSchema,
  OwnerClaimSchema,
  StampCardImpactSchema,
  StampCardSettingsSchema,
} from '@smartapp/core';
import { z } from 'zod';
import { fetchApi } from '../../api-client';
import type { OwnerMembersAdapter } from '../types';

export interface ApiOwnerMembersOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

export function createApiOwnerMembersAdapter({
  baseUrl,
  getToken,
}: ApiOwnerMembersOptions): OwnerMembersAdapter {
  const call = async <T>(
    path: string,
    schema: z.ZodType<T>,
    method: 'GET' | 'POST' | 'PUT',
    body?: unknown,
  ): Promise<T> => {
    const token = await getToken();
    return fetchApi(`${baseUrl}/owner${path}`, schema, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };
  const member = (id: string) => `/members/${encodeURIComponent(id)}`;

  return {
    getStampCard: () => call('/stamp-card', StampCardSettingsSchema, 'GET'),
    previewStampCardChange: (input) =>
      call('/stamp-card/preview', StampCardImpactSchema, 'POST', input),
    saveStampCard: (input) => call('/stamp-card', StampCardSettingsSchema, 'PUT', input),
    setStampCardStatus: (input) =>
      call('/stamp-card/status', StampCardSettingsSchema, 'POST', input),
    getMembersOverview: () => call('/members/overview', MembersOverviewSchema, 'GET'),
    listCustomers: (input) => {
      const query = new URLSearchParams({
        filter: input.filter,
        q: input.q,
        sort: input.sort,
        cursor: String(input.cursor),
        limit: String(input.limit),
        ...(input.stamps === null ? {} : { stamps: String(input.stamps) }),
      });
      return call(`/members?${query.toString()}`, CustomerPageSchema, 'GET');
    },
    getMember: ({ customerId }) => call(member(customerId), MemberDetailSchema, 'GET'),
    findMember: ({ code }) =>
      call(`/members/find?code=${encodeURIComponent(code)}`, FoundMemberSchema, 'GET'),
    giveStamp: ({ customerId, ...body }) =>
      call(`${member(customerId)}/stamp`, CounterChangeSchema, 'POST', body),
    undoChange: ({ customerId, entryId }) =>
      call(`${member(customerId)}/undo`, MemberDetailSchema, 'POST', { entryId }),
    adjustStamps: ({ customerId, ...body }) =>
      call(`${member(customerId)}/adjust`, MemberDetailSchema, 'POST', body),
    useReward: ({ customerId, ...body }) =>
      call(`${member(customerId)}/use-reward`, CounterChangeSchema, 'POST', body),
    saveMemberNote: ({ customerId, note }) =>
      call(`${member(customerId)}/note`, MemberDetailSchema, 'PUT', { note }),
    listRewardClaims: () => call('/claims', z.array(OwnerClaimSchema), 'GET'),
    giveClaim: ({ claimId }) =>
      call(`/claims/${encodeURIComponent(claimId)}/give`, OwnerClaimSchema, 'POST'),
    cancelClaim: ({ claimId, reason }) =>
      call(`/claims/${encodeURIComponent(claimId)}/cancel`, OwnerClaimSchema, 'POST', { reason }),
  };
}
