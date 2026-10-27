'use client';

import { lazy, Suspense } from 'react';
import { GiftIcon, UserRoundIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { useMyAccount, useMyAvatar } from '@smartapp/data';
import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { Button } from '@smartapp/ui/components/button';
import { initials } from '@smartapp/ui/compositions/shop-image';
import { useLaterPart } from '../use-when-idle';
import { useShop } from './shop-context';

// The menu (Base UI menu and its positioning) loads when the page is idle or the button is touched, so it
// stays out of the first JavaScript (decision R49).
const AccountMenu = lazy(() => import('./account-menu').then((m) => ({ default: m.AccountMenu })));

const TRIGGER_CLASS = 'relative size-11 shrink-0 rounded-full';

// A person icon for guests, the member's picture otherwise, with a gift dot when a reward is ready.
// Opens a small menu: Account (or Join) and My orders, which left the desktop nav (decision R5).
export function AccountButton() {
  const { slug, shop } = useShop();
  const account = useMyAccount(slug).data;
  const avatar = useMyAvatar(slug, account?.email ?? slug);
  const stampsOn = shop.storefront.stampCard.status !== 'off';
  const rewardReady = Boolean(account?.rewardReady);
  const menu = useLaterPart();

  const label = rewardReady
    ? `${words.storefrontShell.accountMenu}. ${words.storefrontShell.rewardReady}`
    : words.storefrontShell.accountMenu;

  const face = (
    <>
      {account ? (
        <Avatar className="size-9">
          <AvatarImage src={avatar} alt="" />
          <AvatarFallback className="bg-shop-10-soft text-sm font-semibold text-shop-10-soft-foreground">
            {initials(account.name)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <UserRoundIcon aria-hidden="true" className="size-5" />
      )}
      {rewardReady ? (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-shop-10 text-shop-10-foreground ring-2 ring-background"
        >
          <GiftIcon className="size-2.5" />
        </span>
      ) : null}
    </>
  );

  // Looks and reads the same as the menu's own button; a tap opens the menu as soon as it arrives.
  const standIn = (
    <Button
      variant="ghost"
      size="icon"
      className={TRIGGER_CLASS}
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={false}
      {...menu.standIn}
    >
      {face}
    </Button>
  );

  if (!menu.loaded) return standIn;
  return (
    <Suspense fallback={standIn}>
      <AccountMenu
        slug={slug}
        label={label}
        triggerClassName={TRIGGER_CLASS}
        face={face}
        member={Boolean(account)}
        stampsOn={stampsOn}
        rewardReady={rewardReady}
        openNow={menu.openNow}
        focused={menu.focused}
      />
    </Suspense>
  );
}
