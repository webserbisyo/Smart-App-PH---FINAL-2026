import { useEffect, useEffectEvent, useSyncExternalStore } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LifeBuoyIcon, LogOutIcon } from 'lucide-react';
import { supportWords } from '@smartapp/core';
import { useEndSupport, useQueryClient } from '@smartapp/data';
import { Banner, BannerActions, BannerContent, BannerIcon } from '@smartapp/ui/components/banner';
import { Button } from '@smartapp/ui/components/button';
import { notify } from '@smartapp/ui/compositions/notify';
import { clearSupport, useSupport } from '../support.js';

const W = supportWords;

function subscribeMinute(listener: () => void): () => void {
  const timer = setInterval(listener, 15_000);
  return () => clearInterval(timer);
}

const nowMinute = () => Math.floor(Date.now() / 15_000) * 15_000;

/**
 * Help mode (decision T91): a bar over the owner's dashboard while the founder helps, with the time left
 * and Exit. It ends by itself after 60 minutes.
 */
export function SupportBanner() {
  const session = useSupport();
  const navigate = useNavigate();
  const end = useEndSupport();
  const qc = useQueryClient();
  const now = useSyncExternalStore(subscribeMinute, nowMinute, () => 0);
  const left = session
    ? Math.min(60, Math.max(0, Math.ceil((new Date(session.endsAt).getTime() - now) / 60_000)))
    : 0;

  const leave = async (expired: boolean) => {
    const shopId = session?.shopId;
    await end.mutateAsync().catch(() => undefined);
    clearSupport();
    qc.clear();
    notify({ title: expired ? W.expired : W.ended, tone: expired ? 'warning' : 'info' });
    await navigate({ to: '/admin/shops', search: shopId ? { shop: shopId } : {} });
  };

  const onExpire = useEffectEvent(() => void leave(true));
  useEffect(() => {
    if (session && now > 0 && left <= 0) onExpire();
  }, [session, now, left]);

  if (!session) return null;
  return (
    <Banner
      dismissible={false}
      role="status"
      className="sticky top-0 z-30 flex items-center gap-2.5 rounded-none border-b border-warning/30 bg-warning-soft px-4 py-2 pt-safe text-warning-text md:fixed md:top-auto md:bottom-4 md:left-1/2 md:w-max md:max-w-2xl md:-translate-x-1/2 md:rounded-full md:border md:py-1.5 md:pt-1.5 md:pr-1.5 md:shadow-lg"
    >
      <BannerIcon>
        <LifeBuoyIcon className="size-4" aria-hidden="true" />
      </BannerIcon>
      <BannerContent className="text-sm font-medium tabular-nums">
        {W.banner(session.shopName, left)}
      </BannerContent>
      <BannerActions>
        <Button
          size="sm"
          variant="outline"
          className="h-9 bg-background"
          disabled={end.isPending}
          onClick={() => void leave(false)}
        >
          <LogOutIcon aria-hidden="true" />
          {end.isPending ? W.exiting : W.exit}
        </Button>
      </BannerActions>
    </Banner>
  );
}
