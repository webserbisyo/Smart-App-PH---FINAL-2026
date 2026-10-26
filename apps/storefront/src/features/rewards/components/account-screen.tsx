'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRightIcon,
  GiftIcon,
  LogOutIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { artPath, defaultAvatar, errorWords, formatManila, words } from '@smartapp/core';
import { errorCodeOf, useMyAccount, useSignOutCustomer } from '@smartapp/data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@smartapp/ui/components/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { EmptyState } from '@smartapp/ui/compositions/empty-state';
import { notify } from '@smartapp/ui/compositions/notify';
import { initials } from '@smartapp/ui/compositions/shop-image';
import { useShop } from '../../shell/components/shop-context';

const W = words.account;
const ROW = 'flex min-h-14 items-center gap-3 px-4 py-3 sm:px-5';

/**
 * Account (T12): the member's face, details and code, shortcuts to Rewards and My orders, the privacy
 * notice with how to delete your data (ask the shop), and Sign out with a confirm (c-alert-dialog-2).
 */
export function AccountScreen() {
  const { slug, shop } = useShop();
  const router = useRouter();
  const account = useMyAccount(slug);
  const signOut = useSignOutCustomer();
  const member = account.data;
  const stampsOn = shop.storefront.stampCard.status !== 'off';

  if (account.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-2 pb-6" aria-hidden="true">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-2 pb-6">
        <h1 id="account-title" className="text-2xl font-bold tracking-tight">
          {W.title}
        </h1>
        <EmptyState
          id="account-guest"
          art={artPath('gift')}
          title={W.guestTitle}
          description={W.guestBody}
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/${slug}/join`} />}
              className="h-11 rounded-full bg-member px-6 text-member-foreground hover:bg-member-hover"
            >
              {W.join}
            </Button>
          }
        />
      </div>
    );
  }

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: () => {
        notify({ title: W.signedOut, tone: 'success' });
        router.push(`/${slug}`);
      },
      onError: (error) => notify({ title: errorWords(errorCodeOf(error)), tone: 'error' }),
    });
  }

  const details = [
    { label: W.email, value: member.email },
    { label: W.mobile, value: member.phone },
    { label: W.memberCode, value: member.memberCode },
    { label: W.since, value: formatManila(member.joinedAt, 'date') },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-2 pb-6">
      <h1 id="account-title" className="text-2xl font-bold tracking-tight">
        {W.title}
      </h1>

      <section
        aria-label={W.details}
        className="flex flex-col overflow-hidden rounded-3xl bg-card shadow-xs ring-1 ring-foreground/8"
      >
        <div className="flex items-center gap-4 bg-member-soft p-4 text-member-soft-foreground sm:p-5">
          <Avatar className="size-16 ring-4 ring-card">
            <AvatarImage src={defaultAvatar(member.email)} alt="" />
            <AvatarFallback className="bg-member text-lg font-semibold text-member-foreground">
              {initials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-lg font-bold">{member.name}</span>
            <span className="truncate text-sm">{member.email}</span>
          </div>
        </div>
        <dl className="flex flex-col divide-y divide-border/60">
          {details.map((row) => (
            <div key={row.label} className={`${ROW} justify-between`}>
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 text-right font-medium break-all tabular">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav
        aria-label={W.shortcuts}
        className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-3xl bg-card shadow-xs ring-1 ring-foreground/8"
      >
        {stampsOn ? (
          <Link href={`/${slug}/rewards`} className={`${ROW} hover:bg-muted/50`}>
            <GiftIcon aria-hidden="true" className="size-5 text-member-text" />
            <span className="flex-1 font-medium">{words.storefrontShell.rewards}</span>
            <ChevronRightIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          </Link>
        ) : null}
        <Link href={`/${slug}/orders`} className={`${ROW} hover:bg-muted/50`}>
          <ReceiptTextIcon aria-hidden="true" className="size-5 text-shop-10-text" />
          <span className="flex-1 font-medium">{words.storefrontShell.myOrders}</span>
          <ChevronRightIcon aria-hidden="true" className="size-4 text-muted-foreground" />
        </Link>
        <Link href={`/${slug}/privacy`} className={`${ROW} hover:bg-muted/50`}>
          <ShieldCheckIcon aria-hidden="true" className="size-5 text-success-text" />
          <span className="flex flex-1 flex-col">
            <span className="font-medium">{W.privacy}</span>
            <span className="text-sm text-muted-foreground">{W.deleteHint}</span>
          </span>
          <ChevronRightIcon aria-hidden="true" className="size-4 text-muted-foreground" />
        </Link>
      </nav>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              id="account-sign-out"
              variant="outline"
              className="h-12 gap-2 rounded-full text-base text-destructive-text"
            />
          }
        >
          <LogOutIcon aria-hidden="true" className="size-5" />
          {W.signOut}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{W.signOutTitle}</AlertDialogTitle>
            <AlertDialogDescription>{W.signOutBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">{W.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleSignOut}
              disabled={signOut.isPending}
              className="h-11"
            >
              {W.signOut}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
