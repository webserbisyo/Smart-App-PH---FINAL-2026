import * as React from 'react';
import { SLOT_LENGTHS, ordersWords, type BookingRules } from '@smartapp/core';
import { Switch } from '@smartapp/ui/components/switch';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@smartapp/ui/components/reui/number-field';

export const BOOKING_RULE_FIELDS = [
  'daysAhead',
  'slotMinutes',
  'ordersPerSlot',
  'prepMinutes',
] as const;
export type BookingRuleField = (typeof BOOKING_RULE_FIELDS)[number];

/**
 * The booking rules fields (days ahead, slot length, orders per slot, prep time, take orders while
 * closed), controlled. Shared by the Orders page's Order times sheet and Settings › Ordering (T64), so
 * both edit the same rules the same way.
 */
export function BookingRulesFields({
  value,
  onChange,
  errors = {},
}: {
  value: BookingRules;
  onChange: (value: BookingRules) => void;
  errors?: Partial<Record<BookingRuleField, string>>;
}) {
  // Turning the slot limit off and on again brings back the last number.
  const lastLimit = React.useRef<number | null>(value.ordersPerSlot);
  const set = (patch: Partial<BookingRules>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-6">
      {/* 1. Days Ahead */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">
          {ordersWords.bookingRules.daysAheadLabel}
        </label>
        <p className="text-xs text-muted-foreground">{ordersWords.bookingRules.daysAheadHint}</p>
        <div className="flex items-center gap-3 pt-1">
          <NumberField
            value={value.daysAhead}
            onValueChange={(val) => {
              if (val !== null && !isNaN(val)) set({ daysAhead: Math.min(60, Math.max(1, val)) });
            }}
            min={1}
            max={60}
            className="w-36"
          >
            <NumberFieldGroup>
              <NumberFieldDecrement />
              <NumberFieldInput className="text-base font-semibold tabular-nums" />
              <NumberFieldIncrement />
            </NumberFieldGroup>
          </NumberField>
          <span className="text-xs font-medium text-muted-foreground">
            {ordersWords.bookingRules.daysAheadUnit(value.daysAhead)}
          </span>
        </div>
        {errors.daysAhead && (
          <p className="text-xs font-medium text-destructive">{errors.daysAhead}</p>
        )}
      </div>

      {/* 2. Slot Step */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">
          {ordersWords.bookingRules.slotMinutesLabel}
        </label>
        <p className="text-xs text-muted-foreground">{ordersWords.bookingRules.slotMinutesHint}</p>
        <ToggleGroup
          value={[String(value.slotMinutes)]}
          onValueChange={(val) => {
            const next = SLOT_LENGTHS.find((len) => String(len) === val[0]);
            if (next) set({ slotMinutes: next });
          }}
          aria-label={ordersWords.bookingRules.slotMinutesLabel}
          className="justify-start pt-1"
        >
          <ToggleGroupItem value="15" className="h-9 px-4 text-xs font-semibold">
            {ordersWords.bookingRules.slotMinutesOption(15)}
          </ToggleGroupItem>
          <ToggleGroupItem value="30" className="h-9 px-4 text-xs font-semibold">
            {ordersWords.bookingRules.slotMinutesOption(30)}
          </ToggleGroupItem>
          <ToggleGroupItem value="60" className="h-9 px-4 text-xs font-semibold">
            {ordersWords.bookingRules.slotMinutesOption(60)}
          </ToggleGroupItem>
        </ToggleGroup>
        {errors.slotMinutes && (
          <p className="text-xs font-medium text-destructive">{errors.slotMinutes}</p>
        )}
      </div>

      {/* 3. Orders per slot */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">
            {ordersWords.bookingRules.ordersPerSlotLabel}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {value.ordersPerSlot !== null
                ? ordersWords.bookingRules.limitOn
                : ordersWords.bookingRules.ordersPerSlotUnlimited}
            </span>
            <Switch
              checked={value.ordersPerSlot !== null}
              onCheckedChange={(checked) =>
                set({ ordersPerSlot: checked ? (lastLimit.current ?? 5) : null })
              }
              aria-label={ordersWords.bookingRules.ordersPerSlotSwitch}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {ordersWords.bookingRules.ordersPerSlotHint}
        </p>
        {value.ordersPerSlot !== null && (
          <div className="pt-1">
            <NumberField
              value={value.ordersPerSlot}
              onValueChange={(val) => {
                if (val !== null && !isNaN(val)) {
                  const next = Math.min(50, Math.max(1, val));
                  lastLimit.current = next;
                  set({ ordersPerSlot: next });
                }
              }}
              min={1}
              max={50}
              className="w-36"
            >
              <NumberFieldGroup>
                <NumberFieldDecrement />
                <NumberFieldInput className="text-base font-semibold tabular-nums" />
                <NumberFieldIncrement />
              </NumberFieldGroup>
            </NumberField>
          </div>
        )}
        {errors.ordersPerSlot && (
          <p className="text-xs font-medium text-destructive">{errors.ordersPerSlot}</p>
        )}
      </div>

      {/* 4. Prep time */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">
          {ordersWords.bookingRules.prepMinutesLabel}
        </label>
        <p className="text-xs text-muted-foreground">{ordersWords.bookingRules.prepMinutesHint}</p>
        <div className="flex items-center gap-3 pt-1">
          <NumberField
            value={value.prepMinutes}
            onValueChange={(val) => {
              if (val !== null && !isNaN(val))
                set({ prepMinutes: Math.min(180, Math.max(5, val)) });
            }}
            min={5}
            max={180}
            step={5}
            className="w-36"
          >
            <NumberFieldGroup>
              <NumberFieldDecrement />
              <NumberFieldInput className="text-base font-semibold tabular-nums" />
              <NumberFieldIncrement />
            </NumberFieldGroup>
          </NumberField>
          <span className="text-xs font-medium text-muted-foreground">
            {ordersWords.bookingRules.prepMinutesUnit(value.prepMinutes)}
          </span>
        </div>
        {errors.prepMinutes && (
          <p className="text-xs font-medium text-destructive">{errors.prepMinutes}</p>
        )}
      </div>

      {/* 5. Take orders while closed */}
      <div className="flex items-start justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 p-3">
        <div className="space-y-0.5">
          <label className="text-sm font-semibold text-foreground">
            {ordersWords.bookingRules.takeOrdersWhileClosedLabel}
          </label>
          <p className="text-xs text-muted-foreground">
            {ordersWords.bookingRules.takeOrdersWhileClosedHint}
          </p>
        </div>
        <Switch
          checked={value.takeOrdersWhileClosed}
          onCheckedChange={(takeOrdersWhileClosed) => set({ takeOrdersWhileClosed })}
          aria-label={ordersWords.bookingRules.takeOrdersWhileClosedLabel}
        />
      </div>
    </div>
  );
}
