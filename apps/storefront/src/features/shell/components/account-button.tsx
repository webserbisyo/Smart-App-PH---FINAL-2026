'use client';

import Link from 'next/link';
import { words } from '@smartapp/core';
import { useMyAccount } from '@smartapp/data';
import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';
import { Button } from '@smartapp/ui/components/button';
import { initials } from '@smartapp/ui/compositions/shop-image';
import { useShop } from './shop-context';

// Avatar for members (opens Account), "Join" for guests (opens Rewards, where joining starts).
export function AccountButton() {
  const { slug, shop } = useShop();
  const account = useMyAccount(slug).data;
  if (account) {
    return (
      <Link
        href={`/${slug}/account`}
        aria-label={words.storefrontShell.account}
        className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar className="size-9">
          <AvatarFallback className="bg-shop-10-soft text-sm font-semibold">
            {initials(account.name)}
          </AvatarFallback>
        </Avatar>
      </Link>
    );
  }
  const joinHref =
    shop.storefront.stampCard.status === 'off' ? `/${slug}/account` : `/${slug}/rewards`;
  return (
    <Button
      variant="outline"
      className="min-h-11 shrink-0 rounded-full bg-card px-4"
      nativeButton={false}
      render={<Link href={joinHref} />}
    >
      {words.storefrontShell.join}
    </Button>
  );
}
