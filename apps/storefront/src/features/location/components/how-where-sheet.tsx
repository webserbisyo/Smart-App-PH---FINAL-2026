'use client';

import { useState } from 'react';
import {
  chosenOrderType,
  chosenZone,
  formatPeso,
  OrderTypeEnum,
  openState,
  openStateText,
  orderTypeDetail,
  readyEstimate,
  slotGroups,
  words,
  type OrderType,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Card } from '@smartapp/ui/components/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@smartapp/ui/components/field';
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from '@smartapp/ui/components/native-select';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Separator } from '@smartapp/ui/components/separator';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import { useShop } from '../../shell/components/shop-context';
import { useLocationChoice } from './use-location-choice';

type When = 'asap' | 'later';
const isWhen = (value: unknown): value is When => value === 'asap' || value === 'later';

function HowWhereForm({ now, onDone }: { now: string; onDone: () => void }) {
  const { slug, shop } = useShop();
  const sf = shop.storefront;
  const { choice, save } = useLocationChoice(slug);
  const asapOpen = readyEstimate(sf, now) !== null;
  const groups = slotGroups(sf, now);
  const firstSlot = groups[0]?.slots[0]?.value ?? null;

  const [type, setType] = useState<OrderType>(
    chosenOrderType(sf, choice.type) ?? sf.orderTypes[0] ?? 'pickup',
  );
  const [when, setWhen] = useState<When>(choice.scheduledAt || !asapOpen ? 'later' : 'asap');
  const [slot, setSlot] = useState<string | null>(
    groups.some((g) => g.slots.some((s) => s.value === choice.scheduledAt))
      ? choice.scheduledAt
      : firstSlot,
  );
  const [zoneId, setZoneId] = useState<string | null>(
    chosenZone(sf, choice.zoneId)?.id ?? sf.delivery.zones[0]?.id ?? null,
  );
  const state = openState(sf, now);

  function submit() {
    save({
      type,
      scheduledAt: type === 'walk_in' || when === 'asap' ? null : slot,
      zoneId: type === 'delivery' ? zoneId : null,
    });
    onDone();
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {/* Order type: pattern c-radio-group-7. */}
      <FieldSet>
        <FieldLegend variant="label">{words.location.orderType}</FieldLegend>
        <RadioGroup
          value={type}
          onValueChange={(value) => {
            const parsed = OrderTypeEnum.safeParse(value);
            if (parsed.success) setType(parsed.data);
          }}
        >
          {sf.orderTypes.map((t) => (
            <FieldLabel key={t} htmlFor={`how-${t}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{words.shop.orderType[t]}</FieldTitle>
                  <FieldDescription>{orderTypeDetail(sf, t)}</FieldDescription>
                </FieldContent>
                <RadioGroupItem value={t} id={`how-${t}`} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </FieldSet>

      {type === 'pickup' ? (
        <FieldSet>
          <FieldLegend variant="label">{words.location.when}</FieldLegend>
          {!asapOpen ? (
            <FieldDescription>
              {openStateText(state, now)}. {words.location.closedNow}
            </FieldDescription>
          ) : null}
          {/* ASAP or later: pattern c-radio-group-3. */}
          <RadioGroup
            value={when}
            onValueChange={(value) => {
              if (isWhen(value)) setWhen(value);
            }}
          >
            <Field orientation="horizontal" data-disabled={asapOpen ? undefined : ''}>
              <RadioGroupItem value="asap" id="when-asap" disabled={!asapOpen} />
              <FieldContent>
                <FieldLabel htmlFor="when-asap">{words.location.asap}</FieldLabel>
                <FieldDescription>{words.shop.readyIn(sf.prepMinutes)}</FieldDescription>
              </FieldContent>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="later" id="when-later" />
              <FieldContent>
                <FieldLabel htmlFor="when-later">{words.location.later}</FieldLabel>
                <FieldDescription>{words.location.laterDetail}</FieldDescription>
              </FieldContent>
            </Field>
          </RadioGroup>
          {when === 'later' ? (
            groups.length > 0 ? (
              <Field>
                <FieldLabel htmlFor="pickup-slot">{words.location.pickupTime}</FieldLabel>
                {/* Pattern c-native-select-2, grouped Today / Tomorrow. */}
                <NativeSelect
                  id="pickup-slot"
                  className="w-full"
                  value={slot ?? ''}
                  onChange={(event) => setSlot(event.target.value || null)}
                >
                  <NativeSelectOption value="" disabled>
                    {words.location.chooseTime}
                  </NativeSelectOption>
                  {groups.map((g) => (
                    <NativeSelectOptGroup key={g.label} label={g.label}>
                      {g.slots.map((s) => (
                        <NativeSelectOption key={s.value} value={s.value}>
                          {s.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelectOptGroup>
                  ))}
                </NativeSelect>
              </Field>
            ) : (
              <FieldDescription>{words.location.noSlots}</FieldDescription>
            )
          ) : null}
        </FieldSet>
      ) : null}

      {type === 'delivery' ? (
        <FieldSet>
          <FieldLegend variant="label">{words.location.area}</FieldLegend>
          {sf.delivery.zones.length === 0 ? (
            <FieldDescription>{words.location.addressAtCheckout}</FieldDescription>
          ) : (
            // Zones with fee and ETA: pattern c-radio-group-8.
            <Card className="p-0">
              <RadioGroup
                value={zoneId}
                onValueChange={(value) => {
                  if (typeof value === 'string') setZoneId(value);
                }}
              >
                <FieldGroup className="gap-0">
                  {sf.delivery.zones.map((zone, i) => (
                    <div key={zone.id}>
                      {i > 0 ? <Separator /> : null}
                      <Field>
                        <FieldLabel htmlFor={`zone-${zone.id}`} className="px-4 py-3">
                          <RadioGroupItem value={zone.id} id={`zone-${zone.id}`} />
                          <FieldContent className="min-w-0">
                            <FieldTitle className="w-full">
                              <span className="min-w-0 flex-1 truncate">{zone.name}</span>
                              <span className="shrink-0 whitespace-nowrap tabular">
                                {zone.fee === 0 ? words.shop.free : formatPeso(zone.fee)}
                              </span>
                            </FieldTitle>
                            <FieldDescription>{zone.etaText}</FieldDescription>
                          </FieldContent>
                        </FieldLabel>
                      </Field>
                    </div>
                  ))}
                </FieldGroup>
              </RadioGroup>
            </Card>
          )}
        </FieldSet>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={type === 'pickup' && when === 'later' && !slot}
      >
        {words.location.save}
      </Button>
    </form>
  );
}

/** The How and where sheet: drawer on phones, dialog from tablets up (responsive-dialog). */
export function HowWhereSheet({
  open,
  onOpenChange,
  now,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  now: string;
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={words.location.sheetTitle}
      description={words.location.sheetDescription}
    >
      {open ? <HowWhereForm now={now} onDone={() => onOpenChange(false)} /> : null}
    </ResponsiveDialog>
  );
}
