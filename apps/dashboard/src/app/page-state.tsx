import type * as React from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { Button } from '@smartapp/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@smartapp/ui/components/empty';
import { cn } from 'cn';

export interface PageEmptyProps {
  icon: React.ReactNode;
  title?: string | undefined;
  description?: string | undefined;
  // One action, or two side by side (Add, Start with samples).
  action?: React.ReactNode;
  // box: a dashed box inside a page; plain: no box.
  variant?: 'box' | 'plain' | undefined;
  className?: string | undefined;
}

/**
 * The dashboard's empty state on the installed shadcn Empty (decision T43): icon, title, one line,
 * one action.
 */
export function PageEmpty({
  icon,
  title,
  description,
  action,
  variant = 'plain',
  className,
}: PageEmptyProps) {
  return (
    <Empty
      className={cn(
        'py-12 md:py-16',
        variant === 'box' && 'border border-dashed border-border bg-card/50',
        className,
      )}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        {title ? <EmptyTitle>{title}</EmptyTitle> : null}
        {description ? (
          <EmptyDescription className={cn(!title && 'font-medium text-foreground')}>
            {description}
          </EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? (
        <EmptyContent className="flex-row flex-wrap justify-center">{action}</EmptyContent>
      ) : null}
    </Empty>
  );
}

/** A page that could not load: what happened, and Try again. */
export function PageError({
  title,
  message,
  retryLabel,
  onRetry,
  className,
}: {
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
  className?: string | undefined;
}) {
  return (
    <Empty className={cn('py-12 md:py-16', className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <RefreshCwIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" className="h-11 gap-1.5 md:h-9" onClick={onRetry}>
          <RefreshCwIcon className="size-4" />
          {retryLabel}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
