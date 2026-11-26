import type { ShopRole } from '@smartapp/core';

/** The signed-in person, from a verified Supabase access token. */
export interface CallerUser {
  id: string;
  email: string;
  fullName: string | null;
  // The founder's Super Admin flag (app_metadata.platform_admin), set only from Supabase's side.
  isAdmin: boolean;
  // This login passed the authenticator app code (Supabase's aal2), for Super Admin's second step (T118 Q16).
  aal2?: boolean | undefined;
}

/** The caller's shop, from tenant_members (rule 12: never from the URL or body). */
export interface CallerShop {
  id: string;
  role: ShopRole;
}

export interface Caller {
  user: CallerUser | null;
  shop: CallerShop | null;
}

// Kept beside the request, not on it, so nothing outside these helpers can set it.
const callers = new WeakMap<object, Caller>();

export function callerOf(request: object): Caller {
  let caller = callers.get(request);
  if (!caller) {
    caller = { user: null, shop: null };
    callers.set(request, caller);
  }
  return caller;
}
