// Query keys for owner Home. The shop comes from the login, so no key carries a slug.
import type { HomeRange } from '@smartapp/core';

export const ownerHomeQk = {
  all: ['owner-home'] as const,
  summary: () => ['owner-home', 'summary'] as const,
  trends: (range: HomeRange) => ['owner-home', 'trends', range] as const,
};
