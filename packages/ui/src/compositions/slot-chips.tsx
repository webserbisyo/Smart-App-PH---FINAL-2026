'use client';

import type { ReactNode } from 'react';
import { Scroller } from '@smartapp/ui/components/scroller';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { cn } from 'cn';

// Day and time chips (T85): the customer's When picker, the owner's Change time and the phone Calendar
// pick a day and a time the same way, so they are learned once. Built from the installed Toggle Group
// and Scroller; each app passes its own pressed colour (the shop's colour on the storefront).

export type ChipTone = 'default' | 'muted' | 'warning' | 'danger' | 'primary';

const DETAIL_TONE: Record<ChipTone, string> = {
  default: 'text-muted-foreground',
  muted: 'text-muted-foreground',
  warning: 'text-warning-text',
  danger: 'text-destructive',
  primary: 'text-primary',
};

export interface SlotChip {
  value: string;
  label: ReactNode;
  // A second line: a state ("Closed", "Full"), a count ("2 left") or "Now".
  detail?: ReactNode | undefined;
  icon?: ReactNode | undefined;
  tone?: ChipTone | undefined;
  disabled?: boolean | undefined;
  // Crossed out (a full time); still readable.
  struck?: boolean | undefined;
  // Marked as where things are now (the order's current time): a dashed ring.
  current?: boolean | undefined;
  ariaLabel?: string | undefined;
}

const DAY_BASE =
  'h-16 min-w-18 shrink-0 flex-col gap-0.5 rounded-2xl px-3 text-sm font-semibold aria-pressed:border-transparent';
const TIME_BASE =
  'h-auto min-h-11 min-w-22 flex-col gap-0 rounded-full px-3 py-1 text-base font-medium tabular-nums aria-pressed:border-transparent';

function ChipBody({ chip }: { chip: SlotChip }) {
  return (
    <>
      <span className={cn('flex items-center gap-1', chip.struck && 'line-through')}>
        {chip.label}
      </span>
      {chip.detail ? (
        <span
          className={cn(
            'flex items-center gap-1 text-xs font-medium',
            DETAIL_TONE[chip.tone ?? 'default'],
            'group-aria-pressed/chip:text-current',
          )}
        >
          {chip.icon}
          {chip.detail}
        </span>
      ) : null}
    </>
  );
}

function chipClass(chip: SlotChip, base: string, pressedClassName: string) {
  return cn(
    'group/chip',
    base,
    pressedClassName,
    chip.disabled && 'opacity-60',
    chip.current && 'border-2 border-dashed border-primary',
  );
}

export interface DayChipsProps {
  chips: readonly SlotChip[];
  value: string | null;
  onValueChange: (value: string) => void;
  label: string;
  // The pressed colours, e.g. "aria-pressed:bg-primary aria-pressed:text-primary-foreground".
  pressedClassName: string;
  // After the chips, inside the same scroll row (the storefront's More dates button).
  trailing?: ReactNode | undefined;
  className?: string | undefined;
}

/** A row of day chips that scrolls sideways: "Today", "Sat 14", each with an optional state or count. */
export function DayChips({
  chips,
  value,
  onValueChange,
  label,
  pressedClassName,
  trailing,
  className,
}: DayChipsProps) {
  return (
    <Scroller
      orientation="horizontal"
      hideScrollbar
      className={cn('-mx-1 min-w-0 px-1', className)}
    >
      <div className="flex w-max items-stretch gap-2">
        <ToggleGroup
          value={value ? [value] : []}
          onValueChange={(next) => {
            const picked = next[0];
            if (picked) onValueChange(picked);
          }}
          aria-label={label}
          spacing={2}
          className="flex w-max items-stretch"
        >
          {chips.map((chip) => (
            <ToggleGroupItem
              key={chip.value}
              value={chip.value}
              variant="outline"
              disabled={chip.disabled}
              aria-label={chip.ariaLabel}
              className={chipClass(chip, DAY_BASE, pressedClassName)}
            >
              <ChipBody chip={chip} />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {trailing}
      </div>
    </Scroller>
  );
}

export interface TimeChipsProps {
  chips: readonly SlotChip[];
  value: string | null;
  onValueChange: (value: string) => void;
  label: string;
  pressedClassName: string;
  className?: string | undefined;
}

/** Time chips that wrap: "9:00 AM" with "2 left", "Full" (crossed out) or "Now" under it. */
export function TimeChips({
  chips,
  value,
  onValueChange,
  label,
  pressedClassName,
  className,
}: TimeChipsProps) {
  return (
    <ToggleGroup
      value={value ? [value] : []}
      onValueChange={(next) => {
        const picked = next[0];
        if (picked) onValueChange(picked);
      }}
      aria-label={label}
      spacing={2}
      className={cn('flex flex-wrap', className)}
    >
      {chips.map((chip) => (
        <ToggleGroupItem
          key={chip.value}
          value={chip.value}
          variant="outline"
          disabled={chip.disabled}
          aria-label={chip.ariaLabel}
          className={chipClass(chip, TIME_BASE, pressedClassName)}
        >
          <ChipBody chip={chip} />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
