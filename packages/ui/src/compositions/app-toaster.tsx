'use client';

import { lazy, Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { subscribeToastLayer, toastLayerWanted } from './notify';

// The toast parts (Base UI toast, swipe to dismiss) load on the first toast or once the page is idle, so
// they stay out of the page's first JavaScript (decision R49).
const AppToastLayer = lazy(() =>
  import('./app-toast-layer').then((m) => ({ default: m.AppToastLayer })),
);

// Safari has no requestIdleCallback: a short wait after load stands in.
const FALLBACK_MS = 2000;

function useIdle(): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setIdle(true), FALLBACK_MS);
    return () => clearTimeout(id);
  }, []);
  return idle;
}

/** The app's toasts (see AppToastLayer); every toast goes through notify(). */
export function AppToaster({ children }: { children?: ReactNode }) {
  const wanted = useSyncExternalStore(subscribeToastLayer, toastLayerWanted, () => false);
  const idle = useIdle();
  return (
    <>
      {children}
      {wanted || idle ? (
        <Suspense fallback={null}>
          <AppToastLayer />
        </Suspense>
      ) : null}
    </>
  );
}
