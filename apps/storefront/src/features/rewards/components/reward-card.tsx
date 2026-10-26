'use client';

import Link from 'next/link';
import { GiftIcon, PackageIcon, SparklesIcon } from 'lucide-react';
import {
  errorWords,
  imageSources,
  quantityLabel,
  vocab,
  words,
  type MemberAccount,
  type PublicStampCard,
  type RewardState,
  type ShopKind,
} from '@smartapp/core';
import { errorCodeOf, useClaimReward } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Pending } from '@smartapp/ui/components/pending';
import { QRCode, QRCodeSvg } from '@smartapp/ui/components/qr-code';
import { Alert, AlertDescription } from '@smartapp/ui/components/reui/alert';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { ShineBorder } from '@smartapp/ui/components/shine-border';
import { Spinner } from '@smartapp/ui/components/spinner';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { rewardTypeLine } from '../rewards-rules';

const W = words.rewards;
const S = words.shop.stamps;

function LimitedBadge({ reward }: { reward: PublicStampCard['reward'] }) {
  const label = quantityLabel(reward);
  if (!label || label.kind === 'all_claimed') return null;
  return (
    <Badge
      variant={label.kind === 'left' ? 'warning-light' : 'info-light'}
      size="lg"
      radius="full"
      className="gap-1"
    >
      <PackageIcon aria-hidden="true" className="size-3" />
      {label.kind === 'left' ? S.left(label.left) : S.onlyPieces(label.total)}
    </Badge>
  );
}

/**
 * The reward (c-card-16 look): photo, name, type line and the limited badge. Ready: shining border and
 * the next step (use at checkout, or Claim for a prize, then the code and QR for the counter).
 */
export function RewardCard({
  slug,
  kind,
  card,
  state,
  account,
}: {
  slug: string;
  kind: ShopKind;
  card: PublicStampCard;
  state: RewardState;
  account: MemberAccount | null;
}) {
  const claim = useClaimReward(slug);
  const { reward } = card;
  const ready = state === 'ready';
  const latestClaim = account?.claims.find((c) => c.status === 'pending') ?? null;
  const claimError = claim.isError ? errorCodeOf(claim.error) : null;
  const limit = quantityLabel(reward);

  return (
    <section
      id="rewards-reward"
      aria-labelledby="rewards-reward-title"
      className="relative isolate flex flex-col gap-4 overflow-hidden rounded-3xl bg-card p-4 shadow-xs ring-1 ring-foreground/8 sm:p-5"
    >
      {ready ? (
        <ShineBorder borderWidth={2} shineColor={['var(--member)', 'var(--highlight)']} />
      ) : null}
      <div className="flex items-start gap-4">
        <ShopImage
          src={imageSources(reward.image)}
          alt={reward.title}
          ratio="1:1"
          sizes="96px"
          fallbackIcon="gift"
          className="size-24 shrink-0 rounded-2xl"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {rewardTypeLine(reward)}
          </span>
          <h2 id="rewards-reward-title" className="text-lg leading-snug font-bold text-balance">
            {reward.title}
          </h2>
          {reward.description ? (
            <p className="text-sm text-muted-foreground">{reward.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            <LimitedBadge reward={reward} />
          </div>
        </div>
      </div>

      {ready ? (
        <p className="flex items-center gap-2 rounded-2xl bg-highlight px-3.5 py-2.5 text-sm font-semibold text-highlight-foreground">
          <SparklesIcon aria-hidden="true" className="size-4 shrink-0" />
          {S.ready}
        </p>
      ) : null}

      {state === 'all_claimed' && limit?.kind === 'all_claimed' ? (
        <Alert variant="warning">
          <PackageIcon aria-hidden="true" />
          <AlertDescription>{S.allClaimed(limit.total)}</AlertDescription>
        </Alert>
      ) : null}

      {state === 'free_item_sold_out' ? (
        <Alert variant="warning">
          <GiftIcon aria-hidden="true" />
          <AlertDescription>{S.freeItemSoldOut}</AlertDescription>
        </Alert>
      ) : null}

      {latestClaim ? (
        <figure className="flex flex-col items-center gap-2 rounded-2xl bg-paper p-4 text-paper-foreground ring-1 ring-foreground/8">
          <figcaption className="text-sm font-semibold">{W.claimTitle}</figcaption>
          <QRCode value={latestClaim.qrUrl} size={160}>
            <QRCodeSvg role="img" aria-label={W.claimQr(latestClaim.code)} />
          </QRCode>
          <span className="font-mono text-2xl font-bold tracking-widest">{latestClaim.code}</span>
          <span className="text-sm">{W.claimHint}</span>
        </figure>
      ) : ready && reward.kind === 'custom' ? (
        <div className="flex flex-col gap-2">
          {claimError ? (
            <Alert variant={claimError === 'reward_all_claimed' ? 'warning' : 'destructive'}>
              <AlertDescription role="alert">
                {claimError === 'reward_all_claimed' && limit
                  ? S.allClaimed(reward.quantityTotal ?? 0)
                  : errorWords(claimError)}
              </AlertDescription>
            </Alert>
          ) : null}
          <Pending isPending={claim.isPending}>
            <Button
              id="rewards-claim"
              onClick={() => claim.mutate()}
              disabled={claim.isPending}
              className="h-12 w-full rounded-full bg-member text-base font-semibold text-member-foreground hover:bg-member-hover"
            >
              {claim.isPending ? <Spinner aria-hidden="true" /> : <GiftIcon aria-hidden="true" />}
              {claim.isPending ? W.claiming : W.claim}
            </Button>
          </Pending>
        </div>
      ) : ready ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{W.useAtCheckout}</p>
          <Button
            nativeButton={false}
            render={<Link href={`/${slug}/menu`} />}
            className="h-12 w-full rounded-full text-base font-semibold"
          >
            {W.order(vocab(kind).catalog)}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
