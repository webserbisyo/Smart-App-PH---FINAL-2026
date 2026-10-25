'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDownIcon, MapPinIcon } from 'lucide-react';
import { locationLabel, words } from '@smartapp/core';
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

// Pattern c-button-19: one pill line, "Pickup · Today 3:30 PM", that opens the How and where sheet (decision N31).
export function LocationBar({ className }: { className?: string | undefined }) {
  const { slug, shop } = useShop();
  const now = useNow();
  const { choice } = useLocationChoice(slug);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!now) return <Skeleton className={cn('h-9 rounded-full', className)} />;
  const label = locationLabel(shop.storefront, choice, now);

  return (
    <>
      <Button
        variant="outline"
        className={cn('min-h-11 min-w-0 justify-start rounded-full bg-card', className)}
        aria-haspopup="dialog"
        aria-label={`${label}. ${words.location.open}`}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
      >
        <MapPinIcon aria-hidden="true" className="text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDownIcon aria-hidden="true" />
      </Button>
      {loaded ? <HowWhereSheet open={open} onOpenChange={setOpen} now={now} /> : null}
    </>
  );
}
