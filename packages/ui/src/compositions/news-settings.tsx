'use client';

import { useId } from 'react';
import { BellIcon, BellOffIcon, CheckIcon, MegaphoneIcon } from 'lucide-react';
import { shopNewsWords } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Label } from '@smartapp/ui/components/label';
import { Switch } from '@smartapp/ui/components/switch';
import { cn } from 'cn';

const W = shopNewsWords;

// Where push stands on this phone (T13, T106): the storefront reads it from the browser, the sign-up
// tour plays it with sample values.
export const NOTIFY_STATES = ['unsupported', 'needs_install', 'denied', 'ask', 'granted'] as const;
export type NotifyState = (typeof NOTIFY_STATES)[number];

const BLOCK_HELP: Record<Exclude<NotifyState, 'ask' | 'granted'>, string> = {
  denied: W.deniedHelp,
  needs_install: W.installHelp,
  unsupported: W.unsupportedHelp,
};

const CARD = 'flex gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/8';

/**
 * Order and stamp updates (T106): the bell, what they are, and Turn on while the phone hasn't been asked.
 * Shared by the storefront's Account › Notifications and the sign-up tour (T108), in the shop's colours.
 */
export function PushUpdatesCard({
  state,
  asking = false,
  disabled = false,
  onTurnOn,
  className,
}: {
  state: NotifyState;
  asking?: boolean | undefined;
  disabled?: boolean | undefined;
  onTurnOn: () => void;
  className?: string | undefined;
}) {
  const blocked = state !== 'ask' && state !== 'granted';
  return (
    <section className={cn(CARD, 'flex-col', className)}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-shop-10-soft text-shop-10-soft-foreground">
          {blocked ? (
            <BellOffIcon aria-hidden="true" className="size-5" />
          ) : (
            <BellIcon aria-hidden="true" className="size-5" />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-semibold">{W.updates}</span>
          <span className="text-sm text-muted-foreground">{W.updatesHelp}</span>
        </div>
        {state === 'granted' ? (
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-success-text">
            <CheckIcon aria-hidden="true" className="size-4" />
            {W.updatesOn}
          </span>
        ) : null}
      </div>
      {state === 'ask' ? (
        <Button
          className="h-11 rounded-full bg-shop-10 text-shop-10-foreground hover:bg-shop-10-hover"
          disabled={asking || disabled}
          onClick={onTurnOn}
        >
          {W.turnOn}
        </Button>
      ) : null}
      {blocked ? (
        <p role="status" className="rounded-xl bg-muted p-3 text-sm">
          {BLOCK_HELP[state]}
        </p>
      ) : null}
    </section>
  );
}

/** Shop news on or off (T106): at most 2 a week, never at night. */
export function ShopNewsCard({
  checked,
  disabled = false,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  disabled?: boolean | undefined;
  onCheckedChange: (next: boolean) => void;
  className?: string | undefined;
}) {
  const newsId = useId();
  return (
    <section className={cn(CARD, 'items-start', className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-member-soft text-member-soft-foreground">
        <MegaphoneIcon aria-hidden="true" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Label htmlFor={newsId} className="text-base font-semibold">
          {W.news}
        </Label>
        <span id={`${newsId}-help`} className="text-sm text-muted-foreground">
          {W.newsHelp}
        </span>
      </div>
      <Switch
        id={newsId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-describedby={`${newsId}-help`}
      />
    </section>
  );
}
