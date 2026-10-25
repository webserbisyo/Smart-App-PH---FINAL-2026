'use client';

import { useState, type ReactNode } from 'react';
import { imageSources, openState, openStateText, words } from '@smartapp/core';
import { useNow } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import { StatusLogo } from '@smartapp/ui/compositions/status-logo';
import { useShop } from '../../shell/components/shop-context';
import { ContactTiles } from './contact-tiles';
import { HoursList } from './hours-list';
import { MembersPill } from './members-pill';

function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function ShopInfoBody() {
  const { slug, shop } = useShop();
  const now = useNow();
  const [aboutOpen, setAboutOpen] = useState(false);
  const sf = shop.storefront;
  const state = now ? openState(sf, now) : null;
  const about = sf.info.about?.trim() ?? '';
  const { contact } = sf.info;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <StatusLogo
          name={sf.info.name}
          src={imageSources(sf.info.logo)}
          size="lg"
          state={state ? (state.paused ? 'closed' : state.state) : null}
          stateLabel={state ? words.shop.openStateShort[state.paused ? 'closed' : state.state] : ''}
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{sf.info.name}</p>
          {state && now ? (
            <p className="text-sm text-muted-foreground">{openStateText(state, now)}</p>
          ) : null}
        </div>
      </div>

      <ContactTiles contact={contact} facebook />

      {about ? (
        <SheetSection title={words.storefrontShell.info.about}>
          <p
            className={`text-sm whitespace-pre-line text-foreground/90 ${aboutOpen ? '' : 'line-clamp-3'}`}
          >
            {about}
          </p>
          {about.length > 160 ? (
            <Button
              variant="link"
              className="h-auto self-start p-0"
              onClick={() => setAboutOpen((v) => !v)}
            >
              {aboutOpen
                ? words.storefrontShell.home.showLess
                : words.storefrontShell.home.showMore}
            </Button>
          ) : null}
        </SheetSection>
      ) : null}

      <SheetSection title={words.storefrontShell.info.hours}>
        <HoursList storefront={sf} />
      </SheetSection>

      {contact.showAddress && contact.address ? (
        <SheetSection title={words.storefrontShell.home.address}>
          <p className="text-sm">{contact.address}</p>
          {contact.pickupNote ? (
            <p className="text-sm text-muted-foreground">{contact.pickupNote}</p>
          ) : null}
        </SheetSection>
      ) : null}

      {sf.membersCount > 0 ? (
        <div className="flex justify-center">
          <MembersPill slug={slug} count={sf.membersCount} />
        </div>
      ) : null}
    </div>
  );
}

/** About, grouped hours, contact, address and members in one sheet (redesign R7, composition C3). */
export function ShopInfoSheet() {
  const { infoOpen, setInfoOpen } = useShop();
  return (
    <ResponsiveDialog
      open={infoOpen}
      onOpenChange={setInfoOpen}
      title={words.storefrontShell.info.title}
    >
      {infoOpen ? <ShopInfoBody /> : null}
    </ResponsiveDialog>
  );
}
