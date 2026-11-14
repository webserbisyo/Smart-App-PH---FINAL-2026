import type * as React from 'react';
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CirclePauseIcon,
  ClockIcon,
  GiftIcon,
  HardDriveIcon,
  MoonIcon,
  HourglassIcon,
  RocketIcon,
  WrenchIcon,
  XCircleIcon,
} from 'lucide-react';
import {
  adminWords,
  type AdminFlag,
  type AdminShopRow,
  type PlanPaymentStatus,
  type PlanStatus,
  type ShopStage,
  type SignupSource,
} from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/badge';
import { cn } from 'cn';

const S = adminWords.shops;

interface Look {
  icon: React.ReactNode;
  className: string;
  label: string;
}

const STAGE_LOOK: Record<Exclude<ShopStage, 'live'>, Look> = {
  setting_up: {
    icon: <WrenchIcon />,
    className: 'bg-muted text-muted-foreground',
    label: S.stage.setting_up,
  },
  asked: { icon: <RocketIcon />, className: 'bg-primary/10 text-primary', label: S.stage.asked },
  closed: {
    icon: <XCircleIcon />,
    className: 'bg-muted text-muted-foreground',
    label: S.stage.closed,
  },
};

const PLAN_LOOK: Record<PlanStatus, Look> = {
  trial: { icon: <GiftIcon />, className: 'bg-info-soft text-info-text', label: S.plan.trial },
  active: {
    icon: <CircleCheckIcon />,
    className: 'bg-success-soft text-success-text',
    label: S.plan.active,
  },
  due: { icon: <ClockIcon />, className: 'bg-warning-soft text-warning-text', label: S.plan.due },
  overdue: {
    icon: <CircleAlertIcon />,
    className: 'bg-destructive/10 text-destructive-text',
    label: S.plan.overdue,
  },
  paused: {
    icon: <CirclePauseIcon />,
    className: 'bg-destructive/10 text-destructive-text',
    label: S.plan.paused,
  },
};

const PAYMENT_LOOK: Record<PlanPaymentStatus, Look> = {
  pending: {
    icon: <HourglassIcon />,
    className: 'bg-warning-soft text-warning-text',
    label: adminWords.payments.status.pending,
  },
  approved: {
    icon: <CircleCheckIcon />,
    className: 'bg-success-soft text-success-text',
    label: adminWords.payments.status.approved,
  },
  rejected: {
    icon: <XCircleIcon />,
    className: 'bg-destructive/10 text-destructive-text',
    label: adminWords.payments.status.rejected,
  },
};

function LookBadge({ look, className }: { look: Look; className?: string | undefined }) {
  return (
    <Badge className={cn('gap-1 [&_svg]:size-3.5', look.className, className)}>
      {look.icon}
      {look.label}
    </Badge>
  );
}

/** Where a shop is: its stage before it is live, its plan once it is (icon + word + colour). */
export function ShopStateBadge({
  row,
  className,
}: {
  row: Pick<AdminShopRow, 'stage' | 'planStatus'>;
  className?: string | undefined;
}) {
  if (row.stage !== 'live') return <LookBadge look={STAGE_LOOK[row.stage]} className={className} />;
  return row.planStatus ? (
    <LookBadge look={PLAN_LOOK[row.planStatus]} className={className} />
  ) : null;
}

const FLAG_LOOK: Record<AdminFlag, Look> = {
  stuck_setup: {
    icon: <WrenchIcon />,
    className: 'bg-warning-soft text-warning-text',
    label: S.flags.stuck_setup,
  },
  quiet: { icon: <MoonIcon />, className: 'bg-muted text-muted-foreground', label: S.flags.quiet },
  storage_high: {
    icon: <HardDriveIcon />,
    className: 'bg-warning-soft text-warning-text',
    label: S.flags.storage_high,
  },
};

/** A small warning on a shop (icon + word + colour). */
export function FlagBadge({ flag }: { flag: AdminFlag }) {
  return <LookBadge look={FLAG_LOOK[flag]} />;
}

export function PaymentBadge({ status }: { status: PlanPaymentStatus }) {
  return <LookBadge look={PAYMENT_LOOK[status]} />;
}

/** "3 h ago", "2 days ago". */
export function agoText(at: string | null, now: number): string {
  if (!at) return S.never;
  const minutes = Math.max(0, Math.round((now - new Date(at).getTime()) / 60_000));
  if (minutes < 1) return S.ago.now;
  if (minutes < 60) return S.ago.minutes(minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return S.ago.hours(hours);
  return S.ago.days(Math.round(hours / 24));
}

export function sourceText(source: SignupSource): string {
  if (source.channel === 'direct') return S.source.direct;
  return S.source[source.channel](source.campaign);
}

/** Two letters for a shop or person. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  return `${first.charAt(0)}${last.charAt(0) || first.charAt(1)}`.toUpperCase();
}
