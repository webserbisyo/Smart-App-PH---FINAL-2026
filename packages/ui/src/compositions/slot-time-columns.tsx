'use client';

import * as React from 'react';
import { slotColumns, type ClockPeriod, type ColumnSlot } from '@smartapp/core';
import { ScrollArea } from '@smartapp/ui/components/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { cn } from 'cn';
import type { ChipTone, SlotChip } from './slot-chips';

// The time half of the shared slot picker (T129, after time.rdsx.dev): Hour, Minute and AM or PM columns
// that scroll, built only from the shop's real times (core slotColumns). It replaces the Morning,
// Afternoon and Evening tabs in the When picker, Change time and New order. Built from the installed
// Scroll Area and Toggle Group; each app passes its own pressed colour (the shop's on the storefront).

export interface TimeColumnSlot extends ColumnSlot {
  // Under the time: "2 left", "Full", "3 booked".
  detail?: React.ReactNode | undefined;
  tone?: ChipTone | undefined;
  // Crossed out (a full time); still readable.
  struck?: boolean | undefined;
  // Where things are now (the order's current time): a dashed ring.
  current?: boolean | undefined;
  ariaLabel?: string | undefined;
}

export interface SlotTimeColumnsProps {
  slots: readonly TimeColumnSlot[];
  value: string | null;
  onValueChange: (at: string) => void;
  labels: { hour: string; minute: string; period: string };
  // The pressed colours, e.g. "aria-pressed:bg-primary aria-pressed:text-primary-foreground".
  pressedClassName: string;
  className?: string | undefined;
}

const DETAIL_TONE: Record<ChipTone, string> = {
  default: 'text-muted-foreground',
  muted: 'text-muted-foreground',
  warning: 'text-warning-text',
  danger: 'text-destructive',
  primary: 'text-primary',
};

const CELL =
  'group/cell h-auto min-h-11 w-full flex-col gap-0 rounded-xl px-2 py-1 text-base font-semibold tabular-nums aria-pressed:border-transparent';

function Cell({
  value,
  label,
  detail,
  tone,
  struck,
  current,
  disabled,
  ariaLabel,
  pressedClassName,
}: {
  value: string;
  label: React.ReactNode;
  detail?: React.ReactNode | undefined;
  tone?: ChipTone | undefined;
  struck?: boolean | undefined;
  current?: boolean | undefined;
  disabled?: boolean | undefined;
  ariaLabel?: string | undefined;
  pressedClassName: string;
}) {
  return (
    <ToggleGroupItem
      value={value}
      variant="outline"
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        CELL,
        pressedClassName,
        disabled && 'opacity-60',
        current && 'border-2 border-dashed border-primary',
      )}
    >
      <span className={cn(struck && 'line-through')}>{label}</span>
      {detail ? (
        <span
          className={cn(
            'text-xs font-medium',
            DETAIL_TONE[tone ?? 'default'],
            'group-aria-pressed/cell:text-current',
          )}
        >
          {detail}
        </span>
      ) : null}
    </ToggleGroupItem>
  );
}

function Column({
  label,
  value,
  onValueChange,
  scroll,
  children,
}: {
  label: string;
  value: string | null;
  onValueChange: (value: string) => void;
  scroll: boolean;
  children: React.ReactNode;
}) {
  const id = React.useId();
  const rootRef = React.useRef<HTMLDivElement>(null);
  // Bring the picked cell into the middle of its own column (never the page).
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !scroll) return;
    const viewport = root.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    const pressed = root.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!viewport || !pressed) return;
    viewport.scrollTop = pressed.offsetTop - viewport.clientHeight / 2 + pressed.clientHeight / 2;
  }, [value, scroll]);

  const group = (
    <ToggleGroup
      value={value ? [value] : []}
      onValueChange={(next) => {
        const picked = next[0];
        if (picked) onValueChange(picked);
      }}
      orientation="vertical"
      spacing={1}
      aria-labelledby={id}
      // Room on the right for the scroll bar, so it never sits on a time.
      className={cn('w-full p-1', scroll && 'pr-3')}
    >
      {children}
    </ToggleGroup>
  );

  return (
    <div ref={rootRef} className="flex min-w-0 flex-1 flex-col gap-1">
      <span id={id} className="px-1 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {scroll ? (
        <ScrollArea className="h-56 rounded-xl border border-border">{group}</ScrollArea>
      ) : (
        <div className="rounded-xl border border-border">{group}</div>
      )}
    </div>
  );
}

/** One day's times as Hour, Minute and AM or PM columns; tapping an hour picks its first open time. */
export function SlotTimeColumns({
  slots,
  value,
  onValueChange,
  labels,
  pressedClassName,
  className,
}: SlotTimeColumnsProps) {
  const [picked, setPicked] = React.useState<{
    period: ClockPeriod | null;
    hour: string | null;
  }>({ period: null, hour: null });
  const cols = slotColumns(slots, value, picked);
  const showPeriods = cols.periods.length > 1;

  return (
    <div className={cn('flex min-w-0 items-start gap-2', className)}>
      <Column
        label={labels.hour}
        value={cols.hour}
        scroll={cols.hours.length > 4}
        onValueChange={(key) => {
          const hour = cols.hours.find((h) => h.value === key);
          if (!hour) return;
          setPicked({ period: hour.period, hour: key });
          // On a time already in this hour, keep it; otherwise its first open time.
          const keep = value && hour.slots.some((s) => s.at === value && !s.disabled);
          if (!keep && hour.firstOpen) onValueChange(hour.firstOpen);
        }}
      >
        {cols.hours.map((h) => {
          // With no Minute column the hour is the time, so it carries the time's own state.
          const only = !cols.showMinutes ? h.slots[0] : undefined;
          return (
            <Cell
              key={h.value}
              value={h.value}
              label={h.label}
              detail={only?.detail}
              tone={only?.tone}
              struck={only ? only.struck : h.firstOpen === null}
              current={only?.current}
              disabled={h.firstOpen === null}
              ariaLabel={only?.ariaLabel ?? `${h.label} ${h.period}`}
              pressedClassName={pressedClassName}
            />
          );
        })}
      </Column>

      {cols.showMinutes ? (
        <Column
          label={labels.minute}
          value={cols.minutes.some((m) => m.value === value) ? value : null}
          scroll={cols.minutes.length > 4}
          onValueChange={onValueChange}
        >
          {cols.minutes.map((m) => (
            <Cell
              key={m.value}
              value={m.value}
              label={m.label}
              detail={m.slot.detail}
              tone={m.slot.tone}
              struck={m.slot.struck}
              current={m.slot.current}
              disabled={m.slot.disabled}
              ariaLabel={m.slot.ariaLabel}
              pressedClassName={pressedClassName}
            />
          ))}
        </Column>
      ) : null}

      {showPeriods ? (
        <Column
          label={labels.period}
          value={cols.period}
          scroll={false}
          onValueChange={(next) => {
            const period = cols.periods.find((p) => p.value === next);
            if (!period) return;
            setPicked({ period: period.value, hour: null });
            // Another part of the day: its first open time (the same one keeps the picked time).
            if (period.value !== cols.period && period.firstOpen) onValueChange(period.firstOpen);
          }}
        >
          {cols.periods.map((p) => (
            <Cell
              key={p.value}
              value={p.value}
              label={p.value}
              disabled={p.firstOpen === null}
              struck={p.firstOpen === null}
              pressedClassName={pressedClassName}
            />
          ))}
        </Column>
      ) : null}
    </div>
  );
}

/** The pickers' time chips (SlotChip) as column times, with a spoken name from the label and state. */
export function columnSlotsFromChips(chips: readonly SlotChip[]): TimeColumnSlot[] {
  return chips.map((chip) => {
    const spoken =
      typeof chip.label === 'string'
        ? typeof chip.detail === 'string'
          ? `${chip.label}, ${chip.detail}`
          : chip.label
        : undefined;
    return {
      at: chip.value,
      disabled: chip.disabled,
      detail: chip.detail,
      tone: chip.tone,
      struck: chip.struck,
      current: chip.current,
      ariaLabel: chip.ariaLabel ?? spoken,
    };
  });
}
