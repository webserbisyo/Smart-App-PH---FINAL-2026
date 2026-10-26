'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDownIcon, MapPinIcon } from 'lucide-react';
import { locationLabel, locationShortLabel, words } from '@smartapp/core';
import { useNow } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { cn } from '@smartapp/ui/lib/utils';
import { useShop } from '../../shell/components/shop-context';
import { useLocationChoice } from './use-location-choice';

// The sheet's code (dialog, drawer, radios, select) loads the first time it opens.
const HowWhereSheet = dynamic(() => import('./how-where-sheet').then((m) => m.HowWhereSheet), {
  ssr: false,
});

// Pattern c-button-19: a short pill, "Pickup" or the delivery area, that opens the How and where sheet
// (decision N31, redesign I5). The full line, "Pickup · Today 3:30 PM", is its spoken label.
export function LocationBar({ className }: { className?: string | undefined }) {
  const { slug, shop } = useShop();
  const now = useNow();
  const { choice } = useLocationChoice(slug);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!now) return <Skeleton className={cn('h-7 w-24 rounded-full', className)} />;
  const label = locationLabel(shop.storefront, choice, now);
  const short = locationShortLabel(shop.storefront, choice);
  // The spoken name starts with the words on the pill, so voice control finds it by what it shows.
  const spoken = label.startsWith(short) ? label : `${short}. ${label}`;

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className={cn(
          'relative h-7 max-w-44 min-w-0 justify-start gap-1 rounded-full px-2.5 after:absolute after:inset-x-0 after:-inset-y-2',
          className,
        )}
        aria-haspopup="dialog"
        aria-label={`${spoken}. ${words.location.open}`}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
      >
        <MapPinIcon aria-hidden="true" className="size-3.5" />
        <span className="min-w-0 truncate text-sm font-medium">{short}</span>
        <ChevronDownIcon aria-hidden="true" className="size-3.5 opacity-70" />
      </Button>
      {loaded ? <HowWhereSheet open={open} onOpenChange={setOpen} now={now} /> : null}
    </>
  );
}
