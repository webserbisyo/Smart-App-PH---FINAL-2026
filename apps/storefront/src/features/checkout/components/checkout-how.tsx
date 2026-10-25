'use client';

import { useState } from 'react';
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
import { Card } from '@smartapp/ui/components/card';
import { HowWhereSheet } from '../../location/components/how-where-sheet';

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
  const state = openState(sf, now);
  const label = locationLabel(sf, choice, now);

  let detail: string | null = null;
  if (choice.type === 'pickup') {
    if (choice.scheduledAt) {
      detail = `Scheduled for ${formatClock(choice.scheduledAt)}`;
    } else if (state.state === 'open') {
      detail = words.shop.readyIn(sf.prepMinutes);
    }
  } else if (choice.type === 'delivery') {
    const zone = chosenZone(sf, choice.zoneId);
    if (zone) detail = zone.etaText;
  }

  return (
    <>
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {words.checkout.howSection}
          </span>
          <Button
            id="checkout-change-location"
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSheetOpen(true)}
          >
            {words.checkout.change}
          </Button>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-base font-semibold">{label}</span>
          {detail ? <span className="text-sm text-muted-foreground">{detail}</span> : null}
        </div>
      </Card>

      <HowWhereSheet open={sheetOpen} onOpenChange={setSheetOpen} now={now} />
    </>
  );
}
