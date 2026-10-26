'use client';

import Link from 'next/link';
import { GiftIcon, ReceiptTextIcon, UserRoundIcon } from 'lucide-react';
import { defaultAvatar, words } from '@smartapp/core';
import { useMyAccount } from '@smartapp/data';
import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { Button } from '@smartapp/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { initials } from '@smartapp/ui/compositions/shop-image';
import { useShop } from './shop-context';

const ITEM_CLASS = 'min-h-11 gap-2.5 px-3 text-base';

// A person icon for guests, the member's default face otherwise, with a gift dot when a reward is ready.
// Opens a small menu: Account (or Join) and My orders, which left the desktop nav (decision R5).
export function AccountButton() {
  const { slug, shop } = useShop();
  const account = useMyAccount(slug).data;
  const stampsOn = shop.storefront.stampCard.status !== 'off';
  const rewardReady = Boolean(account?.rewardReady);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative size-11 shrink-0 rounded-full"
            aria-label={
              rewardReady
                ? `${words.storefrontShell.accountMenu}. ${words.storefrontShell.rewardReady}`
                : words.storefrontShell.accountMenu
            }
          />
        }
      >
        {account ? (
          <Avatar className="size-9">
            <AvatarImage src={defaultAvatar(account.email)} alt="" />
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-48">
        {account ? (
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
        {account && stampsOn ? (
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
