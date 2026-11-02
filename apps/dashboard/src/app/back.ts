import type { MouseEvent } from 'react';
import { useCanGoBack, useRouter } from '@tanstack/react-router';

// The path of the page before this one, kept by the router (see router.tsx).
let previousPath: string | null = null;

export function rememberPreviousPath(path: string): void {
  previousPath = path;
}

/**
 * Click handler for a sub-page's Back button and breadcrumb (decision T47). When the page before was
 * under the same parent (another Menu tab, or the list with its search and scroll), it goes back in
 * history so that page comes back as the owner left it. Otherwise the link opens the parent as usual.
 */
export function useBackToParent(parentTo: string | undefined) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (event: MouseEvent) => {
    if (!parentTo || !canGoBack || previousPath === null) return;
    if (previousPath !== parentTo && !previousPath.startsWith(`${parentTo}/`)) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
      return;
    event.preventDefault();
    router.history.back();
  };
}
