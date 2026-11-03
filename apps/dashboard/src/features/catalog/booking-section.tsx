import { catalogWords, type ShopKind } from '@smartapp/core';
import { Field, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@smartapp/ui/components/reui/number-field';

// The item schema's limits (packages/core catalog: noticeDays 0 to 30, dailyLimit 1 to 500 or none).
const NOTICE_MAX = 30;
const LIMIT_MAX = 500;

export interface BookingSectionProps {
  kind: ShopKind;
  noticeDays: number;
  dailyLimit: number | null;
  onChange: (patch: { noticeDays?: number; dailyLimit?: number | null }) => void;
  className?: string;
}

/**
 * Booking (O6): how many days ahead customers must order this item, and how many can be booked for one
 * day. Saved with the item's own Save; the storefront's When picker, the quote and Place order use them.
 */
export function BookingSection({
  kind,
  noticeDays,
  dailyLimit,
  onChange,
  className,
}: BookingSectionProps) {
  return (
    <section className={className}>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">{catalogWords.sectionBooking}</h2>
        <p className="text-sm text-muted-foreground">{catalogWords.sectionBookingHelp(kind)}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="item-notice-days">{catalogWords.noticeLabel}</FieldLabel>
          <NumberField
            id="item-notice-days"
            value={noticeDays}
            min={0}
            max={NOTICE_MAX}
            onValueChange={(value) => onChange({ noticeDays: value ?? 0 })}
          >
            <NumberFieldGroup>
              <NumberFieldDecrement />
              <NumberFieldInput className="text-base tabular-nums" />
              <NumberFieldIncrement />
            </NumberFieldGroup>
          </NumberField>
          <FieldDescription>{catalogWords.noticeHint(noticeDays)}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="item-daily-limit">{catalogWords.dailyLimitLabel}</FieldLabel>
          <NumberField
            id="item-daily-limit"
            value={dailyLimit}
            min={1}
            max={LIMIT_MAX}
            onValueChange={(value) => onChange({ dailyLimit: value })}
          >
            <NumberFieldGroup>
              <NumberFieldDecrement />
              <NumberFieldInput
                placeholder={catalogWords.dailyLimitPlaceholder}
                className="text-base tabular-nums"
              />
              <NumberFieldIncrement />
            </NumberFieldGroup>
          </NumberField>
          <FieldDescription>{catalogWords.dailyLimitHint}</FieldDescription>
        </Field>
      </div>
    </section>
  );
}
