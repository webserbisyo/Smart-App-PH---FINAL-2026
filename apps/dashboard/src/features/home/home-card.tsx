import type * as React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { cn } from 'cn';

export const CARD = 'flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs';

/** One Home card: a title, one line under it and an optional action on the right. */
export function HomeCard({
  id,
  title,
  hint,
  action,
  className,
  children,
}: {
  id: string;
  title: string;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn(CARD, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={`${id}-title`} className="text-base font-bold">
            {title}
          </h2>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Two or three choices in a row (Sales or Orders, Today or 7 days), on the installed Toggle Group. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(next) => {
        const pick = options.find((o) => o.value === next[0]);
        if (pick) onChange(pick.value);
      }}
      className="rounded-xl border border-border/80 bg-muted/50 p-0.5"
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-10 rounded-lg px-3 text-sm font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs md:h-8"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
