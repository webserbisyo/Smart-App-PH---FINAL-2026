'use client';

import { Clock3Icon } from 'lucide-react';
import { manilaDate, todayHoursText, words } from '@smartapp/core';
import { useNow } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import {
  CONTACT_TILE_CLASS,
  ContactTile,
  ContactTiles,
} from '../../shop-info/components/contact-tiles';
import { HoursList } from '../../shop-info/components/hours-list';
import { useShop } from '../../shell/components/shop-context';

const W = words.storefrontShell.info;

// Home's info card: today's hours, Call, Message, Directions and Hours tiles, and the way into the
// Shop info sheet. From 1024 px it also lists the week's hours (sticky right column).
export function HomeInfoCard() {
  const { shop, setInfoOpen } = useShop();
  const now = useNow();
  const sf = shop.storefront;

  return (
    <section
      aria-labelledby="home-info-title"
      className="flex flex-col gap-4 rounded-2xl border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="home-info-title" className="text-base font-semibold">
          {W.title}
        </h2>
        {now ? (
          <p className="text-sm text-muted-foreground">
            {W.todayHours(todayHoursText(sf, manilaDate(now)))}
          </p>
        ) : (
          <Skeleton className="h-5 w-32" />
        )}
      </div>
      <ContactTiles contact={sf.info.contact}>
        <button
          type="button"
          aria-haspopup="dialog"
          className={CONTACT_TILE_CLASS}
          onClick={() => setInfoOpen(true)}
        >
          <ContactTile icon={<Clock3Icon />} label={W.hours} />
        </button>
      </ContactTiles>
      <div className="hidden lg:block">
        <HoursList storefront={sf} />
      </div>
      <Button variant="outline" className="h-11" onClick={() => setInfoOpen(true)}>
        {W.more}
      </Button>
    </section>
  );
}
