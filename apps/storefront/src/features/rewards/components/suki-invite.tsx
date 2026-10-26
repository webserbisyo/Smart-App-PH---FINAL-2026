'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleCheckIcon } from 'lucide-react';
import { STORYSET_GIFT, STORYSET_URL, words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@smartapp/ui/components/empty';
import { PulsatingButton } from '@smartapp/ui/components/pulsating-button';

const W = words.rewards;

export interface SukiInviteProps {
  readonly slug: string;
  readonly shopName: string;
  // null for a guest; undefined while the account loads (no button yet).
  readonly member: { readonly name: string } | null | undefined;
}

/**
 * Rewards before the shop has a stamp card (decision R25): sells membership honestly, never promising
 * stamps. Guests get Join free with a soft pulse (Magic UI Pulsating Button, decision R38); members see
 * that they're in.
 */
export function SukiInvite({ slug, shopName, member }: SukiInviteProps) {
  const router = useRouter();
  const isMember = Boolean(member);

  return (
    <Empty
      id="rewards-suki"
      className="gap-6 rounded-3xl bg-card px-6 py-10 shadow-xs ring-1 ring-foreground/8 sm:py-12"
    >
      <EmptyHeader className="max-w-md gap-3">
        <EmptyMedia className="mb-1 flex-col gap-1">
          <img
            src={STORYSET_GIFT}
            alt=""
            width={320}
            height={300}
            decoding="async"
            className="h-auto w-64 sm:w-72"
          />
          <a
            href={STORYSET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center px-3 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {W.artCredit}
          </a>
        </EmptyMedia>
        <EmptyTitle className="text-2xl font-bold tracking-tight text-balance">
          {isMember ? W.memberInTitle : W.sukiTitle(shopName)}
        </EmptyTitle>
        <EmptyDescription className="text-base text-pretty">
          {isMember ? W.memberInBody : W.sukiBody}
        </EmptyDescription>
      </EmptyHeader>
      {member === undefined ? null : (
        <EmptyContent className="gap-3">
          {isMember ? (
            <>
              <span className="flex items-center gap-1.5 text-sm font-medium text-member-text">
                <CircleCheckIcon aria-hidden="true" className="size-4" />
                {member?.name}
              </span>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/${slug}/menu`} />}
                className="h-11 rounded-full px-6"
              >
                {W.backToShop}
              </Button>
            </>
          ) : (
            <PulsatingButton
              id="rewards-suki-join"
              type="button"
              variant="ripple"
              distance="10px"
              onClick={() => router.push(`/${slug}/join`)}
              className="h-12 rounded-full bg-member px-8 text-base font-semibold text-member-foreground hover:bg-member-hover focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:*:animate-none"
            >
              {W.join}
            </PulsatingButton>
          )}
        </EmptyContent>
      )}
    </Empty>
  );
}
