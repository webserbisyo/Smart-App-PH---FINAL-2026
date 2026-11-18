import { z } from 'zod';
import { DEMO_SHOPS, DEMO_SHOP_SLUGS } from '@smartapp/core';
import type { UserClaims } from '@smartapp/data';
import { env } from './env.js';

// Sample-data tools (decision T100): the Preview panel, the sample sign-in and the test scenarios. On in
// `pnpm dev` and in preview builds (VITE_APP_ENV=preview); Vite inlines both values, so live builds drop
// every use of them.
export const PREVIEW_TOOLS = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'preview';

/** Sample data is on and the tools are allowed. */
export function previewActive(): boolean {
  return PREVIEW_TOOLS && env.VITE_DATA_SOURCE === 'mock';
}

// Who the sample sign-in opens the dashboard as: a demo shop's owner or the platform admin.
export const PreviewViewerSchema = z.enum([...DEMO_SHOP_SLUGS, 'admin']);
export type PreviewViewer = z.infer<typeof PreviewViewerSchema>;

const VIEWER_KEY = 'smartapp:preview-viewer';

export function readPreviewViewer(): PreviewViewer | null {
  if (!previewActive()) return null;
  try {
    const parsed = PreviewViewerSchema.safeParse(window.sessionStorage.getItem(VIEWER_KEY));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writePreviewViewer(viewer: PreviewViewer | null): void {
  try {
    if (viewer) window.sessionStorage.setItem(VIEWER_KEY, viewer);
    else window.sessionStorage.removeItem(VIEWER_KEY);
  } catch {
    // Session storage blocked: the sample sign-in can't be kept, the login page shows again.
  }
}

/** The signed-in person for a sample viewer. Demo addresses only (.invalid never delivers). */
export function previewClaims(viewer: PreviewViewer): UserClaims {
  if (viewer === 'admin') {
    return {
      userId: 'preview-admin',
      email: 'admin@demo.invalid',
      fullName: 'Demo Platform Admin',
      isAdmin: true,
    };
  }
  const shop = DEMO_SHOPS.find((s) => s.slug === viewer);
  return {
    userId: `preview-${viewer}`,
    email: `owner.${viewer}@demo.invalid`,
    fullName: shop?.ownerName,
    demoShop: viewer,
    isAdmin: false,
  };
}
