import * as React from 'react';
import { CoffeeIcon, PauseCircleIcon, PlayCircleIcon } from 'lucide-react';
import type { OpenState } from '@smartapp/core';
import { formatClock, ordersWords } from '@smartapp/core';
import { useSetPause } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { cn } from 'cn';

export interface BusyMenuProps {
  slug: string;
  openState?: OpenState | null;
  className?: string;
}

export function BusyMenu({ slug, openState, className }: BusyMenuProps) {
  const setPause = useSetPause(slug);

  const isPaused = openState?.paused === true;
  const isBusy = Boolean(openState?.busyUntil);
  const busyUntilText = openState?.busyUntil ? formatClock(openState.busyUntil) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-11 gap-1.5 rounded-lg text-xs font-semibold transition-colors md:h-9',
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
                <span>{ordersWords.states.busyMenu.paused}</span>
              </>
            ) : isBusy && busyUntilText ? (
              <>
                <CoffeeIcon className="size-3.5 text-warning-text" />
                <span>{ordersWords.states.busyMenu.busyUntil(busyUntilText)}</span>
              </>
            ) : (
              <>
                <CoffeeIcon className="size-3.5 text-muted-foreground" />
                <span>{ordersWords.states.busyMenu.busy}</span>
              </>
            )}
          </Button>
        }
      />

      <DropdownMenuContent align="end" className="w-48 text-xs">
        <DropdownMenuItem
          onClick={() => {
            void setPause.mutateAsync({ mode: 'busy_15' });
          }}
        >
          <CoffeeIcon className="mr-2 size-3.5 text-warning-text" />
          <span>{ordersWords.states.busyMenu.busy15}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            void setPause.mutateAsync({ mode: 'busy_30' });
          }}
        >
          <CoffeeIcon className="mr-2 size-3.5 text-warning-text" />
          <span>{ordersWords.states.busyMenu.busy30}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            void setPause.mutateAsync({ mode: 'pause' });
          }}
        >
          <PauseCircleIcon className="mr-2 size-3.5 text-destructive" />
          <span>{ordersWords.states.busyMenu.pause}</span>
        </DropdownMenuItem>

        {(isPaused || isBusy) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void setPause.mutateAsync({ mode: 'resume' });
              }}
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
