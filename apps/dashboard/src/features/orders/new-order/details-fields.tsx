import * as React from 'react';
import { BikeIcon, ShoppingBagIcon, StoreIcon } from 'lucide-react';
import {
  formatClock,
  formatPeso,
  manilaDate,
  newOrderWords,
  ordersWords,
  type OrderType,
  type Schedule,
  type Storefront,
} from '@smartapp/core';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
import { Textarea } from '@smartapp/ui/components/textarea';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { DayChips, TimeChips, type SlotChip } from '@smartapp/ui/compositions/slot-chips';
import { dayChipLabel } from '@/app/orders/calendar-days';
import { PesoInput } from '@/app/peso-input';
import type { Draft } from './draft.js';

const W = newOrderWords;
const PRESSED = 'aria-pressed:bg-primary aria-pressed:text-primary-foreground';
const TYPE_ICON: Record<OrderType, React.ReactNode> = {
  walk_in: <StoreIcon aria-hidden="true" />,
  pickup: <ShoppingBagIcon aria-hidden="true" />,
  delivery: <BikeIcon aria-hidden="true" />,
};

/** The order types the owner can pick: walk-in always, then the shop's pickup and delivery. */
export function ownerTypes(storefront: Storefront): OrderType[] {
  return (['walk_in', 'pickup', 'delivery'] as const).filter(
    (t) => t === 'walk_in' || storefront.orderTypes.includes(t),
  );
}

/**
 * Step 2 of New order (T111): how the customer gets it, when (now, or a time from the shop's own
 * schedule, with Allow anyway over full times), the delivery address and fee, and a note.
 */
export function DetailsFields({
  draft,
  onChange,
  storefront,
  schedule,
  scheduleLoading,
  today,
  problems,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  storefront: Storefront;
  schedule: Schedule | undefined;
  scheduleLoading: boolean;
  today: string;
  // Words for what the quote says is wrong with these details.
  problems: readonly string[];
}) {
  const types = ownerTypes(storefront);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{W.how.title}</span>
        <ToggleGroup
          value={[draft.type]}
          onValueChange={(next) => {
            const picked = types.find((t) => t === next[0]);
            if (!picked || picked === draft.type) return;
            onChange({
              type: picked,
              scheduledAt: picked === 'walk_in' ? null : draft.scheduledAt,
              later: picked === 'walk_in' ? false : draft.later,
              handedOver: picked === 'walk_in' && draft.handedOver,
              paymentMethod:
                picked === 'delivery' && draft.paymentMethod === 'cash'
                  ? 'cod'
                  : picked !== 'delivery' && draft.paymentMethod === 'cod'
                    ? 'cash'
                    : draft.paymentMethod,
            });
          }}
          aria-label={W.how.title}
          spacing={2}
          className={types.length === 3 ? 'grid grid-cols-3' : 'grid grid-cols-2'}
        >
          {types.map((t) => (
            <ToggleGroupItem
              key={t}
              value={t}
              variant="outline"
              className={`h-11 gap-2 font-semibold md:h-9 ${PRESSED}`}
            >
              {TYPE_ICON[t]}
              {W.how[t]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {draft.type !== 'walk_in' ? (
        <WhenFields
          draft={draft}
          onChange={onChange}
          schedule={schedule}
          loading={scheduleLoading}
          today={today}
        />
      ) : null}

      {draft.type === 'delivery' ? (
        <DeliveryFields draft={draft} onChange={onChange} storefront={storefront} />
      ) : null}

      <Field>
        <FieldLabel htmlFor="new-order-note">{W.note}</FieldLabel>
        <Textarea
          id="new-order-note"
          value={draft.note}
          maxLength={300}
          rows={2}
          placeholder={W.notePlaceholder}
          onChange={(e) => onChange({ note: e.target.value })}
          className="text-base md:text-sm"
        />
      </Field>

      {problems.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-destructive">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function dayDetail(state: Schedule['days'][number]['state']): string | undefined {
  if (state === 'closed') return ordersWords.bookings.closed;
  if (state === 'full') return ordersWords.bookings.full;
  if (state === 'too_soon') return ordersWords.bookings.tooSoon;
  return undefined;
}

function WhenFields({
  draft,
  onChange,
  schedule,
  loading,
  today,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  schedule: Schedule | undefined;
  loading: boolean;
  today: string;
}) {
  const picking = draft.later;
  const days = schedule?.days ?? [];
  const pickable = (state: Schedule['days'][number]['state']) =>
    state === 'open' || (draft.override && state !== 'closed');
  const [day, setDay] = React.useState<string | null>(
    draft.scheduledAt ? manilaDate(draft.scheduledAt) : null,
  );
  const shownDay = day ?? days.find((d) => pickable(d.state))?.date ?? null;
  const active = days.find((d) => d.date === shownDay);

  const dayChips: SlotChip[] = days.map((d) => ({
    value: d.date,
    label: dayChipLabel(d.date, today),
    detail: dayDetail(d.state),
    tone: d.state === 'open' ? 'muted' : 'danger',
    disabled: !pickable(d.state),
  }));
  const timeChips: SlotChip[] = (active?.slots ?? []).map((slot) => {
    const full = slot.state === 'full';
    return {
      value: slot.at,
      label: formatClock(slot.at),
      detail: full ? W.when.full : undefined,
      tone: full ? 'danger' : 'muted',
      disabled: full && !draft.override,
      struck: full && !draft.override,
    };
  });

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold">{W.when.title}</span>
      <ToggleGroup
        value={[picking ? 'later' : 'now']}
        onValueChange={(next) => {
          if (next[0] === 'now') onChange({ later: false, scheduledAt: null });
          if (next[0] === 'later') onChange({ later: true });
        }}
        aria-label={W.when.title}
        spacing={2}
        className="grid grid-cols-2"
      >
        <ToggleGroupItem
          value="now"
          variant="outline"
          className={`h-11 font-semibold md:h-9 ${PRESSED}`}
        >
          {W.when.now}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="later"
          variant="outline"
          className={`h-11 font-semibold md:h-9 ${PRESSED}`}
        >
          {W.when.later}
        </ToggleGroupItem>
      </ToggleGroup>

      {picking ? (
        loading && days.length === 0 ? (
          <div className="flex flex-col gap-2" aria-label={W.when.loading}>
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            <DayChips
              label={W.when.day}
              chips={dayChips}
              value={shownDay}
              onValueChange={(date) => {
                setDay(date);
                onChange({ scheduledAt: null });
              }}
              pressedClassName={PRESSED}
            />
            {timeChips.length === 0 ? (
              <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                {W.when.noTimes}
              </p>
            ) : (
              <TimeChips
                label={W.when.time}
                chips={timeChips}
                value={draft.scheduledAt}
                onValueChange={(at) => onChange({ scheduledAt: at })}
                pressedClassName={PRESSED}
                className="grid grid-cols-3 sm:grid-cols-4"
              />
            )}
            <Field orientation="horizontal" className="rounded-xl border p-3">
              <FieldContent>
                <FieldLabel htmlFor="new-order-allow">{W.when.allowAnyway}</FieldLabel>
                <FieldDescription>{W.when.allowAnywayHint}</FieldDescription>
              </FieldContent>
              <Switch
                id="new-order-allow"
                checked={draft.override}
                onCheckedChange={(on) => {
                  const slot = active?.slots.find((s) => s.at === draft.scheduledAt);
                  // Turning it off drops a time that only Allow anyway made possible.
                  const keep = on || (slot?.state === 'open' && active?.state === 'open');
                  onChange({ override: on, scheduledAt: keep ? draft.scheduledAt : null });
                }}
              />
            </Field>
          </>
        )
      ) : null}
    </div>
  );
}

function DeliveryFields({
  draft,
  onChange,
  storefront,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  storefront: Storefront;
}) {
  const zones = storefront.delivery.zones;
  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="new-order-address">{W.delivery.address}</FieldLabel>
        <Input
          id="new-order-address"
          value={draft.addressLine}
          maxLength={200}
          autoComplete="off"
          placeholder={W.delivery.addressPlaceholder}
          onChange={(e) => onChange({ addressLine: e.target.value })}
          className="h-11 text-base md:h-9 md:text-sm"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="new-order-landmark">{W.delivery.landmark}</FieldLabel>
        <Input
          id="new-order-landmark"
          value={draft.landmark}
          maxLength={120}
          autoComplete="off"
          placeholder={W.delivery.landmarkPlaceholder}
          onChange={(e) => onChange({ landmark: e.target.value })}
          className="h-11 text-base md:h-9 md:text-sm"
        />
      </Field>
      {zones.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{W.delivery.area}</span>
          <ToggleGroup
            value={draft.zoneId ? [draft.zoneId] : []}
            onValueChange={(next) => {
              const zone = zones.find((z) => z.id === next[0]);
              if (zone) onChange({ zoneId: zone.id, deliveryFee: zone.fee });
            }}
            aria-label={W.delivery.area}
            spacing={2}
            className="flex flex-wrap justify-start"
          >
            {zones.map((z) => (
              <ToggleGroupItem
                key={z.id}
                value={z.id}
                variant="outline"
                className={`h-11 gap-1.5 rounded-full px-3 text-sm md:h-9 ${PRESSED}`}
              >
                {z.name}
                <span className="text-xs tabular-nums opacity-80">{formatPeso(z.fee)}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}
      <Field>
        <FieldLabel htmlFor="new-order-fee">{W.delivery.fee}</FieldLabel>
        <PesoInput
          id="new-order-fee"
          value={draft.deliveryFee}
          onChange={(fee) => onChange({ deliveryFee: fee })}
          className="sm:max-w-48"
        />
        <FieldDescription>{W.delivery.feeHint}</FieldDescription>
      </Field>
    </div>
  );
}
