import * as React from 'react';
import {
  BookingRulesSchema,
  errorWords,
  ordersWords,
  type BookingRules,
  type SlotLength,
} from '@smartapp/core';
import { errorCodeOf, useBookingRules, useSaveBookingRules } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Switch } from '@smartapp/ui/components/switch';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@smartapp/ui/components/reui/number-field';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { useOnlineStatus } from '@/app/use-online-status';
import { Skeleton } from '@smartapp/ui/components/skeleton';

export interface BookingRulesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
}

export function BookingRulesSheet({ open, onOpenChange, slug }: BookingRulesSheetProps) {
  const { data: rules, isLoading } = useBookingRules(slug);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={ordersWords.bookingRules.sheetTitle}
      description={ordersWords.bookingRules.sheetDesc}
      scroll
    >
      {open &&
        (isLoading || !rules ? (
          <div className="space-y-6 p-4">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : (
          <BookingRulesForm
            key={`${rules.daysAhead}-${rules.slotMinutes}-${rules.prepMinutes}`}
            initialRules={rules}
            slug={slug}
            onClose={() => onOpenChange(false)}
          />
        ))}
    </ResponsiveDialog>
  );
}

function BookingRulesForm({
  initialRules,
  slug,
  onClose,
}: {
  initialRules: BookingRules;
  slug: string;
  onClose: () => void;
}) {
  const isOnline = useOnlineStatus();
  const saveMutation = useSaveBookingRules(slug);
  const saveAction = useAsyncAction();

  const [daysAhead, setDaysAhead] = React.useState<number>(initialRules.daysAhead);
  const [slotMinutes, setSlotMinutes] = React.useState<SlotLength>(initialRules.slotMinutes);
  const [hasSlotLimit, setHasSlotLimit] = React.useState<boolean>(
    initialRules.ordersPerSlot !== null,
  );
  const [ordersPerSlot, setOrdersPerSlot] = React.useState<number>(initialRules.ordersPerSlot ?? 5);
  const [prepMinutes, setPrepMinutes] = React.useState<number>(initialRules.prepMinutes);
  const [takeOrdersWhileClosed, setTakeOrdersWhileClosed] = React.useState<boolean>(
    initialRules.takeOrdersWhileClosed,
  );

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const handleSave = async () => {
    if (!isOnline) return;

    const payload = {
      daysAhead,
      slotMinutes,
      ordersPerSlot: hasSlotLimit ? ordersPerSlot : null,
      prepMinutes,
      takeOrdersWhileClosed,
    };

    const parsed = BookingRulesSchema.safeParse(payload);
    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === 'string') {
          errMap[path] = issue.message;
        }
      }
      setFieldErrors(errMap);
      return;
    }

    setFieldErrors({});

    await saveAction.run(async () => {
      try {
        await saveMutation.mutateAsync({ rules: parsed.data });
        notify({ title: ordersWords.bookingRules.saved, tone: 'success' });
        onClose();
      } catch (err) {
        notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSave();
      }}
      className="space-y-6 p-4"
    >
      {/* 1. Days Ahead */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">
          {ordersWords.bookingRules.daysAheadLabel}
        </label>
        <p className="text-xs text-muted-foreground">{ordersWords.bookingRules.daysAheadHint}</p>
        <div className="flex items-center gap-3 pt-1">
          <NumberField
            value={daysAhead}
            onValueChange={(val) => {
              if (val !== null && !isNaN(val)) setDaysAhead(Math.min(60, Math.max(1, val)));
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
            {ordersWords.bookingRules.daysAheadUnit(daysAhead)}
          </span>
        </div>
        {fieldErrors.daysAhead && (
          <p className="text-xs font-medium text-destructive">{fieldErrors.daysAhead}</p>
        )}
      </div>

      {/* 2. Slot Step */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">
          {ordersWords.bookingRules.slotMinutesLabel}
        </label>
        <p className="text-xs text-muted-foreground">{ordersWords.bookingRules.slotMinutesHint}</p>
        <ToggleGroup
          type="single"
          value={String(slotMinutes)}
          onValueChange={(val) => {
            if (val === '15' || val === '30' || val === '60') {
              setSlotMinutes(Number(val) as SlotLength);
            }
          }}
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
        {fieldErrors.slotMinutes && (
          <p className="text-xs font-medium text-destructive">{fieldErrors.slotMinutes}</p>
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
              {hasSlotLimit ? 'Limit on' : ordersWords.bookingRules.ordersPerSlotUnlimited}
            </span>
            <Switch
              checked={hasSlotLimit}
              onCheckedChange={(checked) => setHasSlotLimit(checked)}
              aria-label="Toggle orders per slot limit"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {ordersWords.bookingRules.ordersPerSlotHint}
        </p>
        {hasSlotLimit && (
          <div className="pt-1">
            <NumberField
              value={ordersPerSlot}
              onValueChange={(val) => {
                if (val !== null && !isNaN(val)) setOrdersPerSlot(Math.min(50, Math.max(1, val)));
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
        {fieldErrors.ordersPerSlot && (
          <p className="text-xs font-medium text-destructive">{fieldErrors.ordersPerSlot}</p>
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
            value={prepMinutes}
            onValueChange={(val) => {
              if (val !== null && !isNaN(val)) setPrepMinutes(Math.min(180, Math.max(5, val)));
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
            {ordersWords.bookingRules.prepMinutesUnit(prepMinutes)}
          </span>
        </div>
        {fieldErrors.prepMinutes && (
          <p className="text-xs font-medium text-destructive">{fieldErrors.prepMinutes}</p>
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
          checked={takeOrdersWhileClosed}
          onCheckedChange={setTakeOrdersWhileClosed}
          aria-label={ordersWords.bookingRules.takeOrdersWhileClosedLabel}
        />
      </div>

      <ResponsiveDialogFooter className="pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <AsyncButton
          type="submit"
          variant="default"
          status={saveAction.status}
          busyLabel={ordersWords.bookingRules.saving}
          doneLabel={ordersWords.bookingRules.saved}
          disabled={!isOnline}
        >
          {ordersWords.bookingRules.save}
        </AsyncButton>
      </ResponsiveDialogFooter>
    </form>
  );
}
