import { useRouteContext } from '@tanstack/react-router';

/** The signed-in owner's first name for a greeting, or null when the account has no name. */
export function useOwnerFirstName(): string | null {
  const context = useRouteContext({ from: '/shell' });
  const first = context.claims.fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}
