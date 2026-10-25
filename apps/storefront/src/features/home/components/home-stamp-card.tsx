'use client';

import Link from 'next/link';
import { imageSources, words, type PublicStampCard } from '@smartapp/core';
import { useMyAccount } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { ClientOnly } from '@smartapp/ui/components/client-only';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { StampCard } from '@smartapp/ui/compositions/stamp-card';

export interface HomeStampCardProps {
  slug: string;
  stampCard: PublicStampCard;
}

const W = words.storefrontShell.home.stampCard;

// Guests see the real grid and Join; members their progress; a ready prize shines with Claim.
function HomeStampCardContent({ slug, stampCard }: HomeStampCardProps) {
  const account = useMyAccount(slug).data;
  const { status, rule, reward } = stampCard;
  if (status === 'off') return null;

  const needed = rule.stampsNeeded;
  const stamped = Math.min(account?.balance ?? 0, needed);
  const pending = account?.pendingStamps ?? 0;
  const ready = Boolean(account?.rewardReady) && status !== 'paused';
  const href = `/${slug}/rewards`;
  const prize = { title: reward.title, photo: imageSources(reward.image), label: W.prize };

  let title: string = W.guestTitle(needed, reward.title);
  let body: string | null = W.guestBody(rule.welcomeStamps);
  let action: string = W.join;
  if (status === 'paused') {
    title = W.pausedTitle;
    body = W.pausedBody;
    action = W.view;
  } else if (ready) {
    title = W.readyTitle(reward.title);
    body = null;
    action = W.claim;
  } else if (account) {
    title = W.memberTitle(Math.max(0, needed - stamped));
    body = pending > 0 ? W.pending(pending) : reward.title;
    action = W.view;
  }

  return (
    <StampCard
      needed={needed}
      stamped={stamped}
      pending={pending}
      title={title}
      body={body}
      progressLabel={W.progress(stamped, needed)}
      prize={prize}
      ready={ready}
      readyLine={words.storefrontShell.home.rewards.ready}
      action={
        <Button
          size="lg"
          variant={account && !ready ? 'outline' : 'default'}
          className="h-11"
          nativeButton={false}
          render={<Link href={href} />}
        >
          {action}
        </Button>
      }
    />
  );
}

function HomeStampCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="size-16 rounded-xl" />
      </div>
      <div className="grid grid-cols-5 justify-items-center gap-2">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="size-12 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}

export function HomeStampCard(props: HomeStampCardProps) {
  return (
    <ClientOnly fallback={<HomeStampCardSkeleton />}>
      <HomeStampCardContent {...props} />
    </ClientOnly>
  );
}
