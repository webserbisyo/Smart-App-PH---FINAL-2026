import { env } from '@/app/env';

let warmed = false;

/**
 * On a developer's computer the storefront builds each page the first time it is opened, which can take
 * longer than the Editor waits. Asking for the preview page once, quietly, right after sign-in gets it
 * ready before the owner opens the Editor (decision T76). Live sites are already built, so it does nothing.
 */
export function warmPreview(slug: string): void {
  if (!import.meta.env.DEV || warmed || !slug || typeof window === 'undefined') return;
  warmed = true;
  const url = `${env.VITE_STOREFRONT_URL}/${slug}/preview`;
  const run = () => {
    fetch(url, { mode: 'no-cors', credentials: 'omit' }).catch(() => undefined);
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}
