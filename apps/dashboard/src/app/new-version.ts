// A newer dashboard went live while this tab was open (every push to main deploys one). The old page then asks
// for files the new deploy no longer has: Vercel answers those with index.html, so the import fails. Whole
// pages already reload by themselves (TanStack's lazyRouteComponent); the parts a page loads later (Orders
// Calendar, Home and Members charts, the sign-up tour) did not, and showed the router's bare error screen.
// Here any missing file reloads the page once, onto the new version.

const BUILD_ID = String(import.meta.env.VITE_BUILD_ID ?? 'dev');
const RELOADED_KEY = 'smartapp:reloaded-for-build';

// Chrome and Edge, Firefox, Safari, and Vite's own CSS preload.
const MISSING_FILE =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/;

/** True when the error is a page part that could not be downloaded (a newer deploy, or no connection). */
export function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && MISSING_FILE.test(error.message);
}

function alreadyReloaded(): boolean {
  try {
    return window.sessionStorage.getItem(RELOADED_KEY) === BUILD_ID;
  } catch {
    // Storage blocked: never reload, so a page can't loop.
    return true;
  }
}

/**
 * Reloads onto the newest version, at most once for this build in this tab, and only when online (offline
 * the reload would only show the browser's own offline page). False when it did not reload: the caller
 * shows Try again.
 */
export function reloadForNewVersion(): boolean {
  if (BUILD_ID === 'dev' || !navigator.onLine || alreadyReloaded()) return false;
  try {
    window.sessionStorage.setItem(RELOADED_KEY, BUILD_ID);
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** Vite fires vite:preloadError when a lazy part's file can't load; reload before the page breaks. */
export function listenForNewVersion(): void {
  window.addEventListener('vite:preloadError', () => {
    reloadForNewVersion();
  });
}
