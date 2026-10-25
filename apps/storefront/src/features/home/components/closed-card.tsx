'use client';

import Link from 'next/link';
import { openState, openingWhen, words, type Storefront } from '@smartapp/core';
import { useNow } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@smartapp/ui/components/empty';
import { MoonIcon } from 'lucide-react';

export interface ClosedCardProps {
  storefront: Storefront;
  now?: string | Date | undefined;
}

export function ClosedCard({ storefront, now: nowProp }: ClosedCardProps) {
  const currentNow = useNow();
  const now = nowProp ?? currentNow;
  if (!now) return null;

  const state = openState(storefront, now);
  if (state.state === 'open') return null;

  const { slug } = storefront;
  const isPaused = storefront.pause.paused;
  const isBusy = Boolean(storefront.pause.busyUntil);

  let title: string = words.storefrontShell.home.notTakingOrders;
  if (!isPaused && !isBusy && state.nextOpening) {
    title = words.storefrontShell.home.closedOpens(openingWhen(state.nextOpening, now));
  }

  const showSchedule = storefront.takeOrdersWhileClosed;

  return (
    <div className="flex items-center justify-center rounded-xl border border-border bg-card p-4">
      <Empty className="py-6">
        <EmptyMedia variant="icon">
          <MoonIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          {showSchedule ? (
            <EmptyDescription>{words.storefrontShell.home.scheduleOrder}</EmptyDescription>
          ) : null}
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href={`/${slug}/menu`} />} nativeButton={false}>
            {words.storefrontShell.home.browseMenu}
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
