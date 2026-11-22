import { redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { DEMO_SHOP_SLUGS, type DemoShopSlug } from '@smartapp/core';
import { getClaims, type UserClaims } from '@smartapp/data';
import { previewActive, previewClaims, readPreviewViewer, writePreviewViewer } from './preview.js';
import { supabase } from './supabase.js';

// Written out (not imported) so Vite folds it and live builds drop the sample sign-in entirely (T100).
const PREVIEW = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'preview';

export async function requireAuth(): Promise<UserClaims> {
  // Sample sign-in (T100): development and preview builds on sample data only; never asks Supabase.
  const viewer = PREVIEW ? readPreviewViewer() : null;
  if (PREVIEW && viewer) return previewClaims(viewer);
  const claims = await getClaims(supabase);
  if (!claims) {
    throw redirect({ to: '/login' });
  }
  return claims;
}

// A sample shop's "See the owner side" link (`/login?sample=<slug>`, T109): in development and preview builds
// on sample data it opens the dashboard as that shop's owner; live builds ignore it.
export const LoginSearchSchema = z.object({
  sample: z.enum(DEMO_SHOP_SLUGS).optional().catch(undefined),
});

export async function requireGuest(sample?: DemoShopSlug | undefined): Promise<void> {
  if (PREVIEW && sample && previewActive()) {
    writePreviewViewer(sample);
    throw redirect({ to: '/' });
  }
  if (PREVIEW && readPreviewViewer()) throw redirect({ to: '/' });
  const claims = await getClaims(supabase);
  if (claims) {
    throw redirect({ to: '/' });
  }
}

export async function signOut(): Promise<never> {
  if (PREVIEW && readPreviewViewer()) {
    writePreviewViewer(null);
    throw redirect({ to: '/login' });
  }
  await supabase.auth.signOut();
  throw redirect({ to: '/login' });
}
