import * as React from 'react';
import { BlurFade } from '@smartapp/ui/components/blur-fade';
import { Item, ItemContent, ItemMedia } from '@smartapp/ui/components/item';
import { cn } from '@smartapp/ui/lib/utils';
import { useMediaQuery } from '@/app/use-media-query';
import type { PhoneSize } from './phone.js';

/** The big phone only when the window is tall enough to show it whole with the controls under it. */
export function usePhoneSize(wide: boolean): PhoneSize {
  const tall = useMediaQuery('(min-height: 900px)');
  return wide && tall ? 'lg' : 'sm';
}

export type CardSide = 'start' | 'end';

// Beside the phone on laptops (one high on the left, one low on the right); over its top edge on phones,
// like a notification dropping in.
const SIDE: Record<CardSide, string> = {
  start: 'left-3 top-1/5 w-48 xl:w-56',
  end: 'right-3 bottom-1/6 w-48 xl:w-56',
};

/**
 * The stage both sign-in pages share (T108 round 2): the logo gradient panel with the phone in the middle and
 * live cards floating beside it. Words sit on the cards, never on the gradient (L7).
 */
export function StagePanel({
  wide,
  phone,
  children,
}: {
  wide: boolean;
  phone: React.ReactNode;
  // The floating cards.
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative flex w-full justify-center overflow-hidden rounded-3xl brand-gradient shadow-lg',
        wide ? 'px-6 py-6' : 'px-3 pt-18 pb-6',
      )}
    >
      {phone}
      {children}
    </div>
  );
}

/** One live moment beside the phone: a face or a shop logo, what happened, and when. Tapping it plays it. */
export function StageCard({
  wide,
  side,
  media,
  title,
  meta,
  reduce,
  onOpen,
}: {
  wide: boolean;
  side: CardSide;
  media: React.ReactNode;
  title: string;
  meta: string;
  reduce: boolean;
  onOpen?: (() => void) | undefined;
}) {
  const body = (
    <>
      <ItemMedia>{media}</ItemMedia>
      <ItemContent className="min-w-0 gap-0.5 text-left">
        <span className="line-clamp-2 text-sm leading-snug font-semibold">{title}</span>
        <span className="truncate text-xs text-muted-foreground">{meta}</span>
      </ItemContent>
    </>
  );
  const look =
    'rounded-2xl bg-popover/95 text-popover-foreground shadow-lg ring-1 ring-border backdrop-blur-md';
  const card = onOpen ? (
    <Item
      size="sm"
      className={cn(
        look,
        'w-full outline-none focus-visible:ring-2 focus-visible:ring-ring hover-hover:hover:bg-popover',
      )}
      render={<button type="button" onClick={onOpen} />}
    >
      {body}
    </Item>
  ) : (
    <Item size="sm" className={cn(look, 'w-full')}>
      {body}
    </Item>
  );
  const place = wide ? cn('absolute z-10', SIDE[side]) : 'absolute inset-x-3 top-3 z-10';
  if (reduce) return <div className={place}>{card}</div>;
  return (
    <BlurFade
      direction={wide ? (side === 'start' ? 'right' : 'left') : 'down'}
      duration={0.3}
      offset={12}
      className={place}
    >
      {card}
    </BlurFade>
  );
}
