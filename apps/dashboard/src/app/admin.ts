// Super Admin access (decision T88): only an account with the platform admin flag. Anyone else gets the
// same Not found as a missing page (rule 12), never "forbidden".
import { notFound } from '@tanstack/react-router';
import type { UserClaims } from '@smartapp/data';
import { requireAuth } from './guards.js';

export async function requireAdmin(): Promise<UserClaims> {
  const claims = await requireAuth();
  if (!claims.isAdmin) throw notFound();
  return claims;
}
