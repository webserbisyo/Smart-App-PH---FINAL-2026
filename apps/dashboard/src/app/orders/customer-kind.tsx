import type { LucideIcon } from 'lucide-react';
import { GiftIcon, SparklesIcon, StarIcon, UserIcon } from 'lucide-react';
import { ordersWords, type BoardOrder } from '@smartapp/core';
import { cn } from 'cn';

// Who ordered, at a glance (T85): one colour per kind of customer on the Calendar, always with an icon and
// a word beside it (rule 6: never colour alone). Members take mint, the loyalty colour; a member with a
// prize waiting keeps mint and adds a gift; a first order is blue; everyone else stays neutral.

export const CUSTOMER_KINDS = ['prize', 'member', 'first', 'guest'] as const;
export type CustomerKind = (typeof CUSTOMER_KINDS)[number];

export function customerKind(
  order: Pick<BoardOrder, 'isMember' | 'hasReward' | 'isFirstOrder'>,
): CustomerKind {
  if (order.isMember && order.hasReward) return 'prize';
  if (order.isMember) return 'member';
  if (order.isFirstOrder) return 'first';
  return 'guest';
}

export interface CustomerLook {
  icon: LucideIcon;
  // The left edge of a calendar card.
  bar: string;
  // The initials circle.
  avatar: string;
  // The small word chip.
  chip: string;
}

export const CUSTOMER_LOOK: Readonly<Record<CustomerKind, CustomerLook>> = {
  prize: {
    icon: GiftIcon,
    bar: 'border-l-member',
    avatar: 'bg-member text-member-foreground',
    chip: 'bg-member-soft text-member-soft-foreground',
  },
  member: {
    icon: StarIcon,
    bar: 'border-l-member',
    avatar: 'bg-member-soft text-member-soft-foreground',
    chip: 'bg-member-soft text-member-soft-foreground',
  },
  first: {
    icon: SparklesIcon,
    bar: 'border-l-info',
    avatar: 'bg-info-soft text-info-soft-foreground',
    chip: 'bg-info-soft text-info-soft-foreground',
  },
  guest: {
    icon: UserIcon,
    bar: 'border-l-border',
    avatar: 'bg-muted text-muted-foreground',
    chip: 'bg-muted text-muted-foreground',
  },
};

export function customerLabel(kind: CustomerKind): string {
  return ordersWords.bookings.customer[kind];
}

/** The word chip: icon + word + colour ("Member", "Prize ready", "First order", "Guest"). */
export function CustomerKindChip({
  kind,
  className,
}: {
  kind: CustomerKind;
  className?: string | undefined;
}) {
  const look = CUSTOMER_LOOK[kind];
  const Icon = look.icon;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-semibold',
        look.chip,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3" />
      {customerLabel(kind)}
    </span>
  );
}

/** The colour key above the calendar. */
export function CustomerLegend({ className }: { className?: string | undefined }) {
  return (
    <div
      role="note"
      aria-label={ordersWords.bookings.legend}
      className={cn('flex flex-wrap items-center gap-1.5', className)}
    >
      {CUSTOMER_KINDS.map((kind) => (
        <CustomerKindChip key={kind} kind={kind} />
      ))}
    </div>
  );
}
