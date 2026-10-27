'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { GiftIcon, ReceiptTextIcon, UserRoundIcon } from 'lucide-react';
import { words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { useFocusOnArrival } from '../use-when-idle';

const ITEM_CLASS = 'min-h-11 gap-2.5 px-3 text-base';

export interface AccountMenuProps {
  readonly slug: string;
  readonly label: string;
  readonly triggerClassName: string;
  readonly face: ReactNode;
  readonly member: boolean;
  readonly stampsOn: boolean;
  readonly rewardReady: boolean;
  // The button was tapped before the menu had loaded: open at once, and keep keyboard focus on it.
  readonly openNow: boolean;
  readonly focused: boolean;
}

/** The account menu itself (Account or Join, Rewards, My orders), loaded once the page is idle. */
export function AccountMenu({
  slug,
  label,
  triggerClassName,
  face,
  member,
  stampsOn,
  rewardReady,
  openNow,
  focused,
}: AccountMenuProps) {
  const trigger = useFocusOnArrival<HTMLButtonElement>(focused);

  return (
    <DropdownMenu defaultOpen={openNow}>
      <DropdownMenuTrigger
        render={
          <Button
            ref={trigger}
            variant="ghost"
            size="icon"
            className={triggerClassName}
            aria-label={label}
          />
        }
      >
        {face}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-48">
        {member ? (
          <DropdownMenuItem className={ITEM_CLASS} render={<Link href={`/${slug}/account`} />}>
            <UserRoundIcon aria-hidden="true" />
            {words.storefrontShell.account}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className={ITEM_CLASS} render={<Link href={`/${slug}/join`} />}>
            <UserRoundIcon aria-hidden="true" />
            {words.storefrontShell.join}
          </DropdownMenuItem>
        )}
        {member && stampsOn ? (
          <DropdownMenuItem className={ITEM_CLASS} render={<Link href={`/${slug}/rewards`} />}>
            <GiftIcon aria-hidden="true" />
            {rewardReady ? words.storefrontShell.rewardReady : words.storefrontShell.rewards}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem className={ITEM_CLASS} render={<Link href={`/${slug}/orders`} />}>
          <ReceiptTextIcon aria-hidden="true" />
          {words.storefrontShell.myOrders}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
