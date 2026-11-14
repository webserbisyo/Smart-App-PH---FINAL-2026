import { useRouteContext } from '@tanstack/react-router';
import { useSupport } from './support.js';

/**
 * The signed-in owner's first name for a greeting, or null when the account has no name. In help mode
 * (T91) the account is the founder's, so the greeting has no name rather than greeting the founder.
 */
export function useOwnerFirstName(): string | null {
  const context = useRouteContext({ from: '/shell' });
  const helping = useSupport();
  if (helping) return null;
  const first = context.claims.fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}
