import { redirect } from '@tanstack/react-router';
import { getClaims, type UserClaims } from '@smartapp/data';
import { supabase } from './supabase.js';

export async function requireAuth(): Promise<UserClaims> {
  const claims = await getClaims(supabase);
  if (!claims) {
    throw redirect({ to: '/login' });
  }
  return claims;
}

export async function requireGuest(): Promise<void> {
  const claims = await getClaims(supabase);
  if (claims) {
    throw redirect({ to: '/' });
  }
}

export async function signOut(): Promise<never> {
  await supabase.auth.signOut();
  throw redirect({ to: '/login' });
}
