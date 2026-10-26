import type { ReactNode } from 'react';
import { cn } from 'cn';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@smartapp/ui/components/empty';

export interface EmptyStateProps {
  // A Fluent 3D picture: artPath(key), with the storefront origin outside the storefront.
  art: string;
  title: string;
  description?: string | undefined;
  // The one action (Browse, Clear, Try again).
  action?: ReactNode;
  // Anything under the action, such as suggestion chips.
  children?: ReactNode;
  // box: a soft rounded box inside a page. plain: no box (sheets, full pages).
  variant?: 'box' | 'plain' | undefined;
  className?: string | undefined;
  id?: string | undefined;
}

/**
 * Empty, success and step states with a Fluent 3D picture (composition C9, the empty-state-2 look
 * built from the free shadcn Empty): picture, title, one line, one action.
 */
export function EmptyState({
  art,
  title,
  description,
  action,
  children,
  variant = 'box',
  className,
  id,
}: EmptyStateProps) {
  return (
    <Empty
      id={id}
      data-slot="empty-state"
      className={cn('gap-5 py-10', variant === 'box' && 'rounded-3xl bg-muted/50', className)}
    >
      <EmptyHeader className="gap-3">
        <EmptyMedia>
          <img
            src={art}
            alt=""
            width={96}
            height={96}
            loading="lazy"
            decoding="async"
            className="size-24 object-contain drop-shadow-md"
          />
        </EmptyMedia>
        <EmptyTitle className="text-lg font-semibold text-balance">{title}</EmptyTitle>
        {description ? (
          <EmptyDescription className="text-balance">{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action || children ? (
        <EmptyContent className="gap-4">
          {action}
          {children}
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
