import { useEffect, useState } from 'react';
import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { HouseIcon, RefreshCwIcon } from 'lucide-react';
import { pageErrorWords } from '@smartapp/core';
import { Button, buttonVariants } from '@smartapp/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@smartapp/ui/components/empty';
import { Spinner } from '@smartapp/ui/components/spinner';
import { isMissingFileError, reloadForNewVersion } from './new-version.js';

/**
 * Every dashboard page's error screen (the router's defaultErrorComponent), in place of the router's own
 * "Something went wrong! Show Error". It sits inside the shell, so the side nav and dock stay. A part of
 * an older deploy that is gone reloads the page onto the new version, with a quiet line meanwhile; anything
 * else shows what to do: Try again, or Home. Never shows the error's text or code.
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const missingFile = isMissingFileError(error);
  // Decided once, on the first render: reload onto the new version, or show Try again.
  const [reloading] = useState(() => missingFile && reloadForNewVersion());

  useEffect(() => {
    if (!reloading) console.error(error);
  }, [error, reloading]);

  if (reloading) {
    return (
      <Empty className="flex-1 py-12 md:py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Spinner className="size-6" aria-label={pageErrorWords.updating} />
          </EmptyMedia>
          <EmptyDescription>{pageErrorWords.updating}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const tryAgain = () => {
    // A part that failed to download stays failed until the page loads again.
    if (missingFile) {
      window.location.reload();
      return;
    }
    reset();
    void router.invalidate();
  };

  return (
    <Empty className="flex-1 py-12 md:py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <RefreshCwIcon />
        </EmptyMedia>
        <EmptyTitle>{pageErrorWords.title}</EmptyTitle>
        <EmptyDescription>{pageErrorWords.body}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row flex-wrap justify-center">
        <Button className="h-11 gap-1.5 md:h-9" onClick={tryAgain}>
          <RefreshCwIcon className="size-4" aria-hidden="true" />
          {pageErrorWords.tryAgain}
        </Button>
        <Link
          to="/"
          className={buttonVariants({ variant: 'outline', className: 'h-11 gap-1.5 md:h-9' })}
        >
          <HouseIcon className="size-4" aria-hidden="true" />
          {pageErrorWords.goHome}
        </Link>
      </EmptyContent>
    </Empty>
  );
}
