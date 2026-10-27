'use client';

import { BanIcon, FlameIcon, PlusIcon, SparklesIcon, type LucideIcon } from 'lucide-react';
import { cn } from 'cn';
import type { IconKey } from '@smartapp/core/icons';
import type { ImageSources } from '@smartapp/core/media';
import { Button } from '@smartapp/ui/components/button';
import { Hitbox } from '@smartapp/ui/components/hitbox';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { HeartToggle, type HeartToggleProps } from './heart-toggle';
import { ShopImage } from './shop-image';

export const PRODUCT_BADGE_TONES = ['new', 'bestSeller', 'soldOut', 'sample'] as const;
export type ProductBadgeTone = (typeof PRODUCT_BADGE_TONES)[number];

// Solid badges so they read on any photo.
const BADGE_VARIANT = {
  new: 'default',
  bestSeller: 'warning',
  soldOut: 'invert',
  sample: 'secondary',
} as const satisfies Record<ProductBadgeTone, 'default' | 'warning' | 'invert' | 'secondary'>;

// Status = icon + word + colour (rule 6).
const BADGE_ICON = {
  new: SparklesIcon,
  bestSeller: FlameIcon,
  soldOut: BanIcon,
  sample: null,
} as const satisfies Record<ProductBadgeTone, LucideIcon | null>;

export interface ProductBadge {
  tone: ProductBadgeTone;
  label: string;
}

export interface ProductCardProps {
  name: string;
  priceLabel: string;
  photo: ImageSources | null;
  fallbackIcon?: IconKey | undefined;
  sizes: string;
  // The first cards on the page: the photo loads at once, high priority (the page's largest paint).
  priority?: boolean | undefined;
  // Spoken name of the open button, e.g. "Classic Smash, ₱149".
  openLabel: string;
  onOpen: () => void;
  badges?: readonly ProductBadge[] | undefined;
  // Greys the photo and turns off the add button.
  soldOut?: boolean | undefined;
  heart?: Omit<HeartToggleProps, 'variant' | 'size' | 'className'> | null | undefined;
  add: { label: string; onClick: () => void };
  assetOrigin?: string | undefined;
  className?: string | undefined;
  testId?: string | undefined;
}

/**
 * The one product card (composition C5) for Menu, Home rows and favourites: rounded photo, glass
 * heart, solid badges, name on 2 lines, bold price that never wraps, round "+" in the shop colour.
 * The whole card opens the item; the heart and "+" sit above that tap area.
 */
export function ProductCard({
  name,
  priceLabel,
  photo,
  fallbackIcon,
  sizes,
  priority = false,
  openLabel,
  onOpen,
  badges = [],
  soldOut = false,
  heart,
  add,
  assetOrigin,
  className,
  testId,
}: ProductCardProps) {
  return (
    <article
      data-slot="product-card"
      data-sold-out={soldOut ? '' : undefined}
      data-testid={testId}
      className={cn(
        'group/product relative flex flex-col gap-2 rounded-2xl bg-card p-1.5 text-card-foreground shadow-xs ring-1 ring-foreground/8 transition-shadow duration-base hover-hover:hover:shadow-md',
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={openLabel}
        className="block w-full overflow-hidden rounded-xl outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
      >
        <ShopImage
          src={photo}
          alt=""
          ratio="1:1"
          fallbackIcon={fallbackIcon}
          fallbackText={name}
          sizes={sizes}
          priority={priority}
          assetOrigin={assetOrigin}
          className="transition-all duration-slow ease-standard group-data-sold-out/product:opacity-70 group-data-sold-out/product:grayscale hover-hover:group-hover/product:scale-105"
        />
      </button>

      {badges.length > 0 ? (
        <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1">
          {badges.map((badge) => {
            const Icon = BADGE_ICON[badge.tone];
            return (
              <Badge
                key={badge.tone}
                variant={BADGE_VARIANT[badge.tone]}
                size="lg"
                radius="full"
                className="gap-1 pr-2 pl-1.5 shadow-sm"
              >
                {Icon ? <Icon aria-hidden="true" strokeWidth={2.5} /> : null}
                {badge.label}
              </Badge>
            );
          })}
        </div>
      ) : null}

      {heart ? <HeartToggle {...heart} className="absolute top-2.5 right-2.5" /> : null}

      <div className="flex flex-1 flex-col gap-2 px-1.5 pb-1">
        <h3 className="line-clamp-2 text-sm leading-snug font-medium">{name}</h3>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-sm font-bold whitespace-nowrap tabular">{priceLabel}</span>
          <Hitbox
            size="sm"
            radius="full"
            render={
              <Button
                size="icon"
                variant={soldOut ? 'outline' : 'default'}
                disabled={soldOut}
                aria-label={add.label}
                onClick={add.onClick}
                className="size-9 shrink-0 rounded-full shadow-xs"
              >
                <PlusIcon aria-hidden="true" className="size-4.5" strokeWidth={2.5} />
              </Button>
            }
          />
        </div>
      </div>
    </article>
  );
}

/** Same shape as the card with grey blocks, so nothing jumps when the menu arrives. */
export function ProductCardSkeleton({ className }: { className?: string | undefined }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex flex-col gap-2 rounded-2xl bg-card p-1.5 ring-1 ring-foreground/8',
        className,
      )}
    >
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="flex flex-col gap-2 px-1.5 pb-1">
        <Skeleton className="h-4 w-3/4 rounded-sm" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-14 rounded-sm" />
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}
