// Super Admin access (decision T88): only an account with the platform admin flag. Anyone else gets the
// same Not found as a missing page (rule 12), never "forbidden".
import { notFound, redirect } from '@tanstack/react-router';
import type { UserClaims } from '@smartapp/data';
import { requireAuth } from './guards.js';

export async function requireAdmin(): Promise<UserClaims> {
  const claims = await requireAuth();
  if (!claims.isAdmin) throw notFound();
  // The authenticator app code first (T118 Q16), where it applies.
  if (claims.adminStep === 'enroll' || claims.adminStep === 'code') {
    throw redirect({ to: '/second-step' });
  }
  return claims;
}

/** The second step page: the founder only, and only while the code is still owed. */
export async function requireSecondStepOwed(): Promise<UserClaims> {
  const claims = await requireAuth();
  if (!claims.isAdmin) throw notFound();
  if (claims.adminStep !== 'enroll' && claims.adminStep !== 'code') {
    throw redirect({ to: '/admin' });
  }
  return claims;
}
