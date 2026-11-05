import * as React from 'react';
import { BookingRulesSchema, errorWords, ordersWords, type BookingRules } from '@smartapp/core';
import { errorCodeOf, useBookingRules, useSaveBookingRules } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import {
  BOOKING_RULE_FIELDS,
  BookingRulesFields,
  type BookingRuleField,
} from '@/app/booking-rules-fields';
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
          <div className="space-y-6">
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

  const [rules, setRules] = React.useState<BookingRules>(initialRules);
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<BookingRuleField, string>>>(
    {},
  );

  const handleSave = async () => {
    if (!isOnline) return;

    const parsed = BookingRulesSchema.safeParse(rules);
    if (!parsed.success) {
      // Field errors are worded by field (words.ts), never from the schema's message text.
      const errMap: Partial<Record<BookingRuleField, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = BOOKING_RULE_FIELDS.find((k) => k === issue.path[0]);
        if (key) errMap[key] = ordersWords.bookingRules.fieldError[key];
      }
      setFieldErrors(errMap);
      return;
    }

    setFieldErrors({});

    try {
      await saveAction.run(() => saveMutation.mutateAsync({ rules: parsed.data }));
      notify({ title: ordersWords.bookingRules.saved, tone: 'success' });
      onClose();
    } catch (err: unknown) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSave();
      }}
      className="space-y-6"
    >
      <BookingRulesFields value={rules} onChange={setRules} errors={fieldErrors} />

      <ResponsiveDialogFooter>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {ordersWords.bookingRules.cancel}
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
        </div>
      </ResponsiveDialogFooter>
    </form>
  );
}
