import { redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { DEMO_SHOP_SLUGS, type DemoShopSlug } from '@smartapp/core';
import type { UserClaims } from '@smartapp/data';
import { adapters, ownerAuth, realShops } from './data.js';
import { previewActive, previewClaims, readPreviewViewer, writePreviewViewer } from './preview.js';

// Written out (not imported) so Vite folds it and live builds drop the sample sign-in entirely (T100).
const PREVIEW = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'preview';

export async function requireAuth(): Promise<UserClaims> {
  // Sample sign-in (T100): development and preview builds on sample data only; never asks the API.
  const viewer = PREVIEW ? readPreviewViewer() : null;
  if (PREVIEW && viewer) return previewClaims(viewer);
  const claims = await ownerAuth.getSession();
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
  const claims = await ownerAuth.getSession();
  if (claims) {
    throw redirect({ to: '/' });
  }
}

/**
 * Sign-up (T89): open to guests, and to an owner whose sign-up stopped after the email code (signed in, no
 * shop yet), who finishes the shop step. Anyone with a shop goes to the dashboard.
 */
export async function requireSignupOpen(): Promise<{ finishing: UserClaims | null }> {
  if (PREVIEW && readPreviewViewer()) throw redirect({ to: '/' });
  const claims = await ownerAuth.getSession();
  if (!claims) return { finishing: null };
  if (realShops && !claims.isAdmin && (await adapters.onboarding.getMyShop()) === null) {
    return { finishing: claims };
  }
  throw redirect({ to: '/' });
}

export async function signOut(): Promise<never> {
  if (PREVIEW && readPreviewViewer()) {
    writePreviewViewer(null);
    throw redirect({ to: '/login' });
  }
  await ownerAuth.signOut().catch(() => undefined);
  throw redirect({ to: '/login' });
}
