import type { ReactNode } from 'react';
import { ClockIcon, GiftIcon, StampIcon } from 'lucide-react';
import { cn } from 'cn';
import type { ImageSources } from '@smartapp/core/media';
import { AnimatedShinyText } from '@smartapp/ui/components/animated-shiny-text';
import { GridPattern } from '@smartapp/ui/components/grid-pattern';
import { IconTile } from '@smartapp/ui/components/reui/icon-tile';
import { ShineBorder } from '@smartapp/ui/components/shine-border';
import { ShopImage } from './shop-image';

export interface StampCardProps {
  // Stamps for one prize (4 to 20) and how many the customer has.
  needed: number;
  stamped: number;
  // Earned but not counted yet (order not complete).
  pending?: number | undefined;
  title: string;
  body?: string | null | undefined;
  // Spoken summary of the grid, e.g. "3 of 10 stamps".
  progressLabel: string;
  prize: { title: string; photo: ImageSources | null; label: string };
  // The prize can be claimed: shining border and the ready line.
  ready?: boolean | undefined;
  readyLine?: string | undefined;
  // Join, Claim or See rewards.
  action?: ReactNode;
  // Where the Fluent fallback icon is served from (the dashboard kit passes the storefront URL).
  assetOrigin?: string | undefined;
  className?: string | undefined;
}

type TileState = 'stamped' | 'pending' | 'empty' | 'prize';

function tileState(index: number, props: StampCardProps): TileState {
  const pending = props.pending ?? 0;
  if (index === props.needed - 1) return index < props.stamped ? 'stamped' : 'prize';
  if (index < props.stamped) return 'stamped';
  if (index < props.stamped + pending) return 'pending';
  return 'empty';
}

// Tiles from the ReUI icon-tile patterns: c-icon-tile-16 (solid, stamped), c-icon-tile-14 (status
// dot, pending) and c-icon-tile-6 (outline, empty); the last tile is the prize.
function StampTile({
  state,
  number,
  size,
}: {
  state: TileState;
  number: number;
  size: 'default' | 'lg';
}) {
  if (state === 'stamped') {
    return (
      <IconTile
        variant="solid"
        size={size}
        radius="full"
        className="bg-shop-10 text-shop-10-foreground"
      >
        <StampIcon />
      </IconTile>
    );
  }
  if (state === 'pending') {
    return (
      <span className="relative inline-flex">
        <IconTile variant="elevated" size={size} radius="full">
          <ClockIcon />
        </IconTile>
        <span className="absolute -end-0.5 -top-0.5 size-3 rounded-full border-2 border-background bg-warning" />
      </span>
    );
  }
  if (state === 'prize') {
    return (
      <IconTile variant="soft" size={size} radius="full" className="text-shop-10-text">
        <GiftIcon />
      </IconTile>
    );
  }
  return (
    <IconTile
      variant="outline"
      size={size}
      radius="full"
      className="text-sm font-semibold text-muted-foreground tabular"
    >
      {number}
    </IconTile>
  );
}

/**
 * The stamp card (composition C2): title, prize photo, the grid of stamps on a grid pattern (c-frame-1
 * look), and one action. Ready: Magic UI shine border and shiny text.
 */
export function StampCard(props: StampCardProps) {
  const {
    needed,
    title,
    body,
    progressLabel,
    prize,
    ready = false,
    readyLine,
    action,
    assetOrigin,
    className,
  } = props;
  const size = needed > 10 ? 'default' : 'lg';
  return (
    <section
      data-slot="stamp-card"
      aria-label={title}
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border bg-card p-4 shadow-xs',
        className,
      )}
    >
      <GridPattern
        width={28}
        height={28}
        className="-z-10 fill-transparent stroke-border opacity-60"
      />
      {ready ? (
        <ShineBorder borderWidth={2} shineColor={['var(--shop-10)', 'var(--highlight)']} />
      ) : null}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base leading-snug font-semibold text-balance">{title}</h2>
          {body ? <p className="mt-1 text-sm text-muted-foreground">{body}</p> : null}
        </div>
        <figure className="relative shrink-0">
          <ShopImage
            src={prize.photo}
            alt={prize.title}
            ratio="1:1"
            sizes="64px"
            fallbackIcon="gift"
            assetOrigin={assetOrigin}
            className="size-16 overflow-hidden rounded-xl"
          />
          <figcaption className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-shop-10 px-1.5 text-xs leading-4 font-semibold text-shop-10-foreground ring-2 ring-card">
            {prize.label}
          </figcaption>
        </figure>
      </div>
      <div
        role="img"
        aria-label={progressLabel}
        className="mt-4 grid grid-cols-5 justify-items-center gap-2"
      >
        {Array.from({ length: needed }, (_, index) => (
          <StampTile key={index} state={tileState(index, props)} number={index + 1} size={size} />
        ))}
      </div>
      {ready && readyLine ? (
        <p className="mt-3 flex justify-center">
          <AnimatedShinyText className="mx-0 via-foreground/80 text-sm font-semibold text-muted-foreground">
            {readyLine}
          </AnimatedShinyText>
        </p>
      ) : null}
      {action ? <div className="mt-4 flex flex-wrap gap-2 *:flex-1">{action}</div> : null}
    </section>
  );
}
