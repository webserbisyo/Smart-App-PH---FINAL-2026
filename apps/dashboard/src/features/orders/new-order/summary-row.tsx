import { ChevronRightIcon, TriangleAlertIcon, type LucideIcon } from 'lucide-react';
import { newOrderWords } from '@smartapp/core';
import { cn } from 'cn';

/**
 * One line of the laptop order pane (T113): what is picked now ("Walk-in · Guest"), and a tap opens its
 * fields. A problem (no address, a bad mobile number) shows in red under it, so nothing hides.
 */
export function SummaryRow({
  icon: Icon,
  label,
  value,
  problem,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  problem?: string | null | undefined;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${newOrderWords.pane.change(label)}: ${value}`}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          problem ? 'bg-destructive-soft text-destructive' : 'bg-muted text-muted-foreground',
        )}
      >
        {problem ? <TriangleAlertIcon className="size-4" /> : <Icon className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate text-sm font-medium">{value}</span>
        {problem ? <span className="block text-xs text-destructive">{problem}</span> : null}
      </span>
      <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
