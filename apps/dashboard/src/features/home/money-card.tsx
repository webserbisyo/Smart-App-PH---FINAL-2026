import type * as React from 'react';
import { BanknoteIcon, HandCoinsIcon, SmartphoneIcon } from 'lucide-react';
import { formatPeso, homeWords, type HomeMoney } from '@smartapp/core';
import {
  Stat,
  StatDescription,
  StatIndicator,
  StatLabel,
  StatValue,
} from '@smartapp/ui/components/stat';
import { CountUp } from '@smartapp/ui/compositions/count-up';
import { cn } from 'cn';
import { HomeCard } from './home-card.js';

const W = homeWords.money;

/** A peso amount that counts up (Magic UI Number Ticker through CountUp; still under reduced motion). */
export function PesoTicker({ centavos, className }: { centavos: number; className?: string }) {
  const whole = centavos % 100 === 0;
  return (
    <span className={cn('tabular-nums', className)}>
      <span aria-hidden="true">
        {centavos < 0 ? '−' : ''}₱
        <CountUp value={Math.abs(centavos) / 100} decimalPlaces={whole ? 0 : 2} />
      </span>
      <span className="sr-only">{formatPeso(centavos)}</span>
    </span>
  );
}

function MoneyTile({
  label,
  icon,
  value,
  note,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  note: string;
  tone?: 'warning' | undefined;
}) {
  return (
    <Stat className="h-full min-w-0 gap-y-0.5 overflow-hidden rounded-xl p-3 shadow-none">
      <StatLabel className="text-xs text-balance">{label}</StatLabel>
      <StatIndicator
        variant="icon"
        aria-hidden="true"
        className="size-7 rounded-lg border-0 bg-muted text-muted-foreground"
      >
        {icon}
      </StatIndicator>
      <StatValue className="truncate text-lg font-extrabold tabular-nums sm:text-xl">
        {formatPeso(value)}
      </StatValue>
      <StatDescription
        className={cn('truncate', tone === 'warning' && 'font-semibold text-warning-text')}
      >
        {note}
      </StatDescription>
    </Stat>
  );
}

/**
 * Sales for the picked period with the cash check (T83): what the drawer should hold, what came in by
 * GCash, Maya or bank (and how many still need a look), and what is still to collect. No comparisons.
 */
export function MoneyCard({
  money,
  periodText,
  live,
  action,
  className,
}: {
  money: HomeMoney;
  periodText: string;
  // The period picker, top right.
  action: React.ReactNode;
  // Today: the drawer should hold the cash now; a past period only took it.
  live: boolean;
  className?: string | undefined;
}) {
  const transfers = money.transfers + money.toCheck;
  return (
    <HomeCard
      id="sales-total"
      title={W.title}
      hint={<span className="sr-only">{periodText}</span>}
      action={action}
      className={className}
    >
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <PesoTicker
          centavos={money.sales}
          className={cn(
            'text-4xl font-extrabold tracking-tight md:text-5xl',
            money.orders === 0 && 'text-muted-foreground',
          )}
        />
        <p className="flex flex-wrap items-center gap-x-3 pb-1 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{W.orders(money.orders)}</span>
          <span>
            {W.average}{' '}
            <span className="font-semibold text-foreground tabular-nums">
              {money.average === null ? W.averageNone : formatPeso(money.average)}
            </span>
          </span>
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 md:gap-3">
        <MoneyTile
          label={live ? W.cashNow : W.cashPast}
          icon={<BanknoteIcon />}
          value={money.cash}
          note={W.cashHint}
        />
        <MoneyTile
          label={W.transfers}
          icon={<SmartphoneIcon />}
          value={transfers}
          note={money.toCheckOrders > 0 ? W.toCheck(money.toCheckOrders) : W.allChecked}
          tone={money.toCheckOrders > 0 ? 'warning' : undefined}
        />
        <MoneyTile
          label={W.toCollect}
          icon={<HandCoinsIcon />}
          value={money.toCollect}
          note={money.toCollect > 0 ? W.toCollectHint : W.nothingToCollect}
        />
      </div>
    </HomeCard>
  );
}
