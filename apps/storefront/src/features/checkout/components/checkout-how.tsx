'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  chosenZone,
  formatClock,
  locationLabel,
  openState,
  words,
  type LocationChoice,
  type Storefront,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { ORDER_TYPE_ICON } from '../../location/components/order-type-icons';
import { CheckoutStep } from './checkout-step';

// The sheet loads on the first Change, as from the location pill (decision R49).
const HowWhereSheet = dynamic(
  () => import('../../location/components/how-where-sheet').then((m) => m.HowWhereSheet),
  { ssr: false },
);

interface CheckoutHowProps {
  sf: Storefront;
  choice: LocationChoice;
  now: string;
}

/**
 * How section: Displays the current order type, place, or pickup time with a Change button.
 */
export function CheckoutHow({ sf, choice, now }: CheckoutHowProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLoaded, setSheetLoaded] = useState(false);
  if (sheetOpen && !sheetLoaded) setSheetLoaded(true);
  const state = openState(sf, now);
  const label = locationLabel(sf, choice, now);

  let detail: string | null = null;
  if (choice.type === 'pickup') {
    if (choice.scheduledAt) {
      detail = words.checkout.scheduledFor(formatClock(choice.scheduledAt));
    } else if (state.state === 'open') {
      detail = words.shop.readyIn(sf.prepMinutes);
    }
  } else if (choice.type === 'delivery') {
    const zone = chosenZone(sf, choice.zoneId);
    if (zone) detail = zone.etaText;
  }

  const Icon = ORDER_TYPE_ICON[choice.type ?? sf.orderTypes[0] ?? 'pickup'];

  return (
    <>
      <CheckoutStep
        step={1}
        id="checkout-how"
        title={words.checkout.howSection}
        action={
          <Button
            id="checkout-change-location"
            type="button"
            variant="outline"
            onClick={() => setSheetOpen(true)}
            className="h-11 rounded-full px-4"
          >
            {words.checkout.change}
          </Button>
        }
      >
        <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-shop-10-soft text-shop-10-soft-foreground">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-base font-semibold break-words">{label}</span>
            {detail ? <span className="text-sm text-muted-foreground">{detail}</span> : null}
          </div>
        </div>
      </CheckoutStep>

      {sheetLoaded ? (
        <HowWhereSheet open={sheetOpen} onOpenChange={setSheetOpen} now={now} />
      ) : null}
    </>
  );
}
