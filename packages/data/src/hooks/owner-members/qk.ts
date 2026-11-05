// Query keys for the owner Members area. The shop comes from the login, so no key carries a slug.
import type { ListCustomersInput } from '@smartapp/core';

export const ownerMembersQk = {
  all: ['owner-members'] as const,
  stampCard: () => ['owner-members', 'stamp-card'] as const,
  overview: () => ['owner-members', 'overview'] as const,
  lists: () => ['owner-members', 'list'] as const,
  list: (input: ListCustomersInput) => ['owner-members', 'list', input] as const,
  member: (id: string) => ['owner-members', 'member', id] as const,
  claims: () => ['owner-members', 'claims'] as const,
  preview: (key: string) => ['owner-members', 'preview', key] as const,
};
