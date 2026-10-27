'use client';

import { useId, useState, useSyncExternalStore } from 'react';
import { words } from '@smartapp/core';
import { useOnline, usePushOrders, useSubscribePush } from '@smartapp/data';
import { Label } from '@smartapp/ui/components/label';
import { Switch } from '@smartapp/ui/components/switch';
import { Bell, BellOff } from 'lucide-react';
import { enablePush, pushState, type PushState } from '../../install/push';

const CARD = 'rounded-3xl bg-card p-5 shadow-xs ring-1 ring-foreground/8 sm:p-6';

function noSubscribe() {
  return () => {};
}

/** Notify me (T13): order updates as phone notifications, asked for only on this switch. */
export function NotifyCard({ slug, token }: { slug: string; token: string }) {
  const state = useSyncExternalStore<PushState>(noSubscribe, pushState, () => 'unsupported');
  const isOnline = useOnline();
  const subscribe = useSubscribePush(slug, token);
  const pushOrders = usePushOrders(slug);
  const [asking, setAsking] = useState(false);
  const switchId = useId();
  const W = words.receipt.notify;

  if (state === 'unsupported') return null;
  const on = state === 'granted' && pushOrders.isOn(token);
  const blocked = state === 'needs_install' || state === 'denied';
  const line =
    state === 'needs_install'
      ? words.install.pushIphone
      : state === 'denied'
        ? words.install.pushDenied
        : subscribe.isError
          ? W.failed
          : on
            ? W.on
            : W.off;

  // Asks for permission only on this tap (T13); turning it off is kept on the phone.
  async function handleChange(next: boolean) {
    if (!next) {
      pushOrders.set(token, false);
      return;
    }
    setAsking(true);
    const result = await enablePush();
    setAsking(false);
    if (!result.ok) return;
    subscribe.mutate(result.subscription, { onSuccess: () => pushOrders.set(token, true) });
  }

  return (
    <div className={`${CARD} flex items-center justify-between gap-4`}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-shop-10-soft text-shop-10-soft-foreground">
          {blocked ? (
            <BellOff aria-hidden="true" className="size-5" />
          ) : (
            <Bell aria-hidden="true" className="size-5" />
          )}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <Label htmlFor={switchId} className="text-base font-semibold">
            {W.title}
          </Label>
          <p id={`${switchId}-line`} className="text-sm text-muted-foreground">
            {line}
          </p>
        </div>
      </div>
      <Switch
        id={switchId}
        checked={on}
        onCheckedChange={(next) => void handleChange(next)}
        disabled={blocked || !isOnline || asking || subscribe.isPending}
        aria-describedby={`${switchId}-line`}
      />
    </div>
  );
}
