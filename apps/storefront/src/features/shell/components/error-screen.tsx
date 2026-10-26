'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { RotateCwIcon } from 'lucide-react';
import { artPath, words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@smartapp/ui/components/empty';

const W = words.storefrontShell.errorPage;

/**
 * Something went wrong (c-empty-2 look with the Fluent art, T14): one line, Try again and a way back. Never shows codes or
 * stack traces; logs once in development.
 */
export function ErrorScreen({
  error,
  retry,
  backHref,
  backLabel,
}: {
  error: unknown;
  retry: () => void;
  backHref: string;
  backLabel: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') console.error(error);
  }, [error]);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <Empty id="error-page" className="mx-auto w-full max-w-md gap-5 px-4 py-10">
      <EmptyHeader className="gap-3">
        <EmptyMedia>
          <img
            src={artPath('closed')}
            alt=""
            width={96}
            height={96}
            decoding="async"
            className="size-24 object-contain drop-shadow-md"
          />
        </EmptyMedia>
        <EmptyTitle>
          <h1 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
            {W.title}
          </h1>
        </EmptyTitle>
        <EmptyDescription className="text-balance">{W.body}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="gap-2">
        <Button onClick={retry} className="h-12 w-full rounded-full text-base">
          <RotateCwIcon aria-hidden="true" />
          {W.tryAgain}
        </Button>
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href={backHref} />}
          className="h-11 w-full rounded-full text-base"
        >
          {backLabel}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
