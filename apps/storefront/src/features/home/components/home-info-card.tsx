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
import { OpenState } from '../../shell/components/open-state';
import { useShop } from '../../shell/components/shop-context';

const W = words.storefrontShell.info;

// Home's info card: open or closed now, today's hours, Call, Message, Directions and Hours tiles, and
// the way into the Shop info sheet, which has the whole week (decision R26).
export function HomeInfoCard() {
  const { shop, setInfoOpen } = useShop();
  const now = useNow();
  const sf = shop.storefront;

  return (
    <section
      aria-labelledby="home-info-title"
      className="flex flex-col gap-4 rounded-2xl border bg-card p-4"
    >
      <div className="flex flex-col gap-2">
        <h2 id="home-info-title" className="text-base font-semibold">
          {W.title}
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <OpenState />
          {now ? (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock3Icon aria-hidden="true" className="size-4" />
              {W.todayHours(todayHoursText(sf, manilaDate(now)))}
            </p>
          ) : (
            <Skeleton className="h-5 w-32" />
          )}
        </div>
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
      <Button variant="outline" className="h-11" onClick={() => setInfoOpen(true)}>
        {W.more}
      </Button>
    </section>
  );
}
