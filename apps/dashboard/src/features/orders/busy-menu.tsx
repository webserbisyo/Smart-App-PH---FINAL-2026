import * as React from 'react';
import { CoffeeIcon, PauseCircleIcon, PlayCircleIcon } from 'lucide-react';
import type { OpenState, PauseMode } from '@smartapp/core';
import {
  errorWords,
  formatClock,
  homeWords,
  openState as openStateOf,
  ordersWords,
} from '@smartapp/core';
import { errorCodeOf, useSetPause, useStorefront } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { notify } from '@smartapp/ui/compositions/notify';
import { cn } from 'cn';
import { useNow } from '@/app/orders/use-now';

/** What customers now see, in the same words as Home's notice. */
function pauseToast(open: OpenState): string {
  const W = homeWords.pause;
  if (open.paused) return W.paused;
  return open.busyUntil ? W.busy(formatClock(open.busyUntil)) : W.resumed;
}

export interface BusyMenuProps {
  slug: string;
  openState?: OpenState | null;
  className?: string;
}

export function BusyMenu({ slug, openState: given, className }: BusyMenuProps) {
  const setPause = useSetPause(slug);
  // Read from the shop when the page doesn't pass it, so the button shows Busy or Paused and offers Resume.
  const storefront = useStorefront(slug);
  const now = useNow(30_000);
  const sf = storefront.data?.storefront;
  const ownState = React.useMemo(() => (sf ? openStateOf(sf, now) : null), [sf, now]);
  const openState = given ?? ownState;

  const isPaused = openState?.paused === true;
  const isBusy = Boolean(openState?.busyUntil);
  const busyUntilText = openState?.busyUntil ? formatClock(openState.busyUntil) : null;

  const choose = (mode: PauseMode) =>
    void setPause
      .mutateAsync({ mode })
      .then((open) => notify({ title: pauseToast(open), tone: 'success' }))
      .catch((err: unknown) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-11 min-w-11 gap-1.5 rounded-lg text-xs font-semibold transition-colors md:h-9 md:min-w-0',
              isPaused
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : isBusy
                  ? 'border-warning/30 bg-warning-soft text-warning-text'
                  : 'text-foreground',
              className,
            )}
          >
            {isPaused ? (
              <>
                <PauseCircleIcon className="size-3.5 text-destructive" />
                <span className="sr-only md:not-sr-only">{ordersWords.states.busyMenu.paused}</span>
              </>
            ) : isBusy && busyUntilText ? (
              <>
                <CoffeeIcon className="size-3.5 text-warning-text" />
                <span className="sr-only md:not-sr-only">
                  {ordersWords.states.busyMenu.busyUntil(busyUntilText)}
                </span>
              </>
            ) : (
              <>
                <CoffeeIcon className="size-3.5 text-muted-foreground" />
                {/* Phones show the icon only, tinted when busy or paused (T93: the row must fit 360 px). */}
                <span className="sr-only md:not-sr-only">{ordersWords.states.busyMenu.busy}</span>
              </>
            )}
          </Button>
        }
      />

      <DropdownMenuContent align="end" className="w-48 text-xs">
        <DropdownMenuItem onClick={() => choose('busy_15')}>
          <CoffeeIcon className="mr-2 size-3.5 text-warning-text" />
          <span>{ordersWords.states.busyMenu.busy15}</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => choose('busy_30')}>
          <CoffeeIcon className="mr-2 size-3.5 text-warning-text" />
          <span>{ordersWords.states.busyMenu.busy30}</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => choose('pause')}>
          <PauseCircleIcon className="mr-2 size-3.5 text-destructive" />
          <span>{ordersWords.states.busyMenu.pause}</span>
        </DropdownMenuItem>

        {(isPaused || isBusy) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => choose('resume')}
              className="font-semibold text-primary"
            >
              <PlayCircleIcon className="mr-2 size-3.5 text-primary" />
              <span>{ordersWords.states.busyMenu.resume}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
