import type * as React from 'react';
import { FieldLabel } from '@smartapp/ui/components/field';

/** A field label with the characters used so far, e.g. "Tagline 35/80". */
export function CountedLabel({
  htmlFor,
  children,
  used,
  max,
}: {
  htmlFor: string;
  children: React.ReactNode;
  used: number;
  max: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <FieldLabel htmlFor={htmlFor}>{children}</FieldLabel>
      <span className="text-xs text-muted-foreground tabular-nums" aria-hidden>
        {used}/{max}
      </span>
    </div>
  );
}

/** Empty text is stored as null, so "no tagline" and "" never differ. */
export function orNull(text: string): string | null {
  return text.trim() ? text : null;
}
