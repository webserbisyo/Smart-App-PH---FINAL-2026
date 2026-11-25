import { useEffect, useState } from 'react';
import { cn } from 'cn';
import { RefreshCwIcon, SparklesIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { Banner, BannerActions, BannerContent, BannerIcon } from '@smartapp/ui/components/banner';
import { Button } from '@smartapp/ui/components/button';

// How often an open dashboard looks for a newer one, besides when the owner comes back to the tab.
const CHECK_MS = 5 * 60_000;
const BUILD_ID = import.meta.env.VITE_BUILD_ID;

function isVersionFile(value: unknown): value is { id: string } {
  return (
    typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string'
  );
}

/** True once /version.json names another build than the one running (never on `vite` dev). */
function useNewVersion(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!BUILD_ID || BUILD_ID === 'dev' || ready) return;
    let alive = true;
    const check = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const body: unknown = await res.json();
        if (alive && isVersionFile(body) && body.id !== BUILD_ID) setReady(true);
      } catch {
        // Offline or a blip: the next check tries again.
      }
    };
    const onVisible = () => void check();
    // Once at start too: an installed app can open from an old cached page.
    onVisible();
    const timer = setInterval(onVisible, CHECK_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [ready]);
  return ready;
}

/**
 * "New version ready · Refresh" (T117): a small bar when a newer dashboard is live, so an owner who keeps
 * the dashboard open all day (or on the home screen) gets the update with one tap. Nothing reloads by
 * itself: a half-typed order is never lost.
 */
export function UpdateBar({ aboveDock }: { aboveDock: boolean }) {
  const ready = useNewVersion();
  if (!ready) return null;
  return (
    <Banner
      dismissible={false}
      role="status"
      className={cn(
        'fixed inset-x-4 z-40 flex w-auto items-center gap-2.5 rounded-full border border-primary/20 bg-card py-1.5 pr-1.5 pl-4 text-foreground shadow-lg md:inset-x-auto md:left-1/2 md:w-max md:-translate-x-1/2',
        aboveDock ? 'above-dock' : 'bottom-4',
      )}
    >
      <BannerIcon>
        <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
      </BannerIcon>
      <BannerContent className="text-sm font-medium">{words.shell.updateReady}</BannerContent>
      <BannerActions>
        <Button size="sm" className="h-9" onClick={() => window.location.reload()}>
          <RefreshCwIcon aria-hidden="true" />
          {words.shell.refresh}
        </Button>
      </BannerActions>
    </Banner>
  );
}
