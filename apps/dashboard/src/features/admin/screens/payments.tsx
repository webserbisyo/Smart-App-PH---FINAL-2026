import * as React from 'react';
import { DownloadIcon, ReceiptTextIcon, WalletIcon, WifiOffIcon } from 'lucide-react';
import {
  ADMIN_PAYMENT_VIEWS,
  adminWords,
  errorWords,
  formatManila,
  formatPeso,
  manilaParts,
  monthName,
  words,
  type AdminPayment,
} from '@smartapp/core';
import { errorCodeOf, useAdminPayments } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@smartapp/ui/components/table';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { notify } from '@smartapp/ui/compositions/notify';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { cn } from 'cn';
import { dayText } from '@/app/billing-thread';
import { Notice } from '@/app/notice';
import { PageEmpty, PageError } from '@/app/page-state';
import { useOnlineStatus } from '@/app/use-online-status';
import { PaymentBadge } from '../look.js';
import { useAdminPaymentsSearch, useSetAdminPaymentsSearch } from '../search.js';
import { ShopPanel } from '../shop-panel.js';

const A = adminWords;
const P = A.payments;
const C = P.columns;

const CHIP =
  'h-10 gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-muted-foreground aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-foreground md:h-10';

const method = (p: AdminPayment) => words.shop.paymentMethod[p.method];

/**
 * Payments (decision T88): receipts to check first, then every plan payment, the month's total and a CSV
 * for the books. A row opens that shop's Billing chat, where Approve and Not approved live.
 */
export function AdminPaymentsScreen() {
  const search = useAdminPaymentsSearch();
  const setSearch = useSetAdminPaymentsSearch();
  const online = useOnlineStatus();
  const isPhone = useFormFactor() === 'phone';
  const view = search.view ?? 'to_check';
  const list = useAdminPayments(view);
  const now = new Date();

  const open = (p: AdminPayment) => setSearch({ shop: p.shopId, tab: 'billing' });

  let body: React.ReactNode;
  if (list.isPending) {
    body = (
      <div className="flex flex-col gap-2" aria-busy="true" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  } else if (list.isError && !list.data) {
    body = (
      <PageError
        title={A.loadError}
        message={errorWords(errorCodeOf(list.error))}
        retryLabel={A.tryAgain}
        onRetry={() => void list.refetch()}
      />
    );
  } else if (list.data.rows.length === 0) {
    body = (
      <PageEmpty
        variant="box"
        icon={<ReceiptTextIcon className="size-8 text-muted-foreground" />}
        title={view === 'to_check' ? P.empty : P.emptyAll}
        description={view === 'to_check' ? P.emptyLine : P.emptyAllLine}
        action={
          view === 'to_check' ? (
            <Button
              variant="outline"
              className="h-11 md:h-9"
              onClick={() => setSearch({ view: 'all' }, { replace: true })}
            >
              {P.views.all}
            </Button>
          ) : undefined
        }
      />
    );
  } else if (isPhone) {
    body = (
      <ul className="flex flex-col gap-2">
        {list.data.rows.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => open(p)}
              className="flex w-full min-w-0 items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-xs transition-colors duration-base hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
            >
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
              >
                <WalletIcon className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{p.shopName}</span>
                  <span className="shrink-0 font-bold tabular-nums">{formatPeso(p.amount)}</span>
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {P.months(p.months)} · {method(p)} · {p.reference}
                </span>
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <PaymentBadge status={p.status} />
                  {formatManila(p.submittedAt, 'date')}
                  {p.recorded ? ` · ${P.recorded}` : ''}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{C.shop}</TableHead>
              <TableHead className="text-right">{C.amount}</TableHead>
              <TableHead>{C.months}</TableHead>
              <TableHead>{C.method}</TableHead>
              <TableHead>{C.reference}</TableHead>
              <TableHead>{C.sent}</TableHead>
              <TableHead>{C.status}</TableHead>
              <TableHead>{C.covers}</TableHead>
              <TableHead>
                <span className="sr-only">{P.open}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.rows.map((p) => (
              <TableRow
                key={p.id}
                className={cn('cursor-pointer', search.shop === p.shopId && 'bg-accent')}
                onClick={() => open(p)}
              >
                <TableCell className="font-semibold">{p.shopName}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatPeso(p.amount)}
                </TableCell>
                <TableCell>{P.months(p.months)}</TableCell>
                <TableCell>{method(p)}</TableCell>
                <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                <TableCell>{formatManila(p.submittedAt, 'date')}</TableCell>
                <TableCell>
                  <span className="flex flex-col items-start gap-0.5">
                    <PaymentBadge status={p.status} />
                    {p.recorded ? (
                      <span className="text-xs text-muted-foreground">{P.recorded}</span>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell>{p.status === 'approved' ? dayText(p.coversUntil) : '—'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant={p.status === 'pending' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      open(p);
                    }}
                  >
                    {p.status === 'pending' ? A.shops.check : P.open}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col pb-24 md:pb-8">
      <PageHeader
        title={P.title}
        actions={
          <Button
            variant="outline"
            className="h-11 gap-1.5 md:h-9"
            disabled={!list.data || list.data.rows.length === 0}
            onClick={() => {
              if (!list.data) return;
              saveCsv(list.data.rows, now);
              notify({ title: P.exported, tone: 'success' });
            }}
          >
            <DownloadIcon aria-hidden="true" />
            <span className="hidden sm:inline">{P.export}</span>
            <span className="sr-only sm:hidden">{P.export}</span>
          </Button>
        }
      />
      <div className="flex flex-col gap-3 px-4 pt-3 md:gap-4 md:px-6 md:pt-4">
        {!online ? (
          <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
            {A.loadError}
          </Notice>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ToggleGroup
            value={[view]}
            onValueChange={(next) => {
              const picked = ADMIN_PAYMENT_VIEWS.find((v) => v === next[0]);
              if (picked)
                setSearch({ view: picked === 'to_check' ? undefined : picked }, { replace: true });
            }}
            aria-label={P.title}
            spacing={1.5}
          >
            {ADMIN_PAYMENT_VIEWS.map((v) => (
              <ToggleGroupItem key={v} value={v} className={CHIP}>
                {P.views[v]}
                {v === 'to_check' && list.data ? (
                  <span
                    className={cn('tabular-nums', list.data.toCheck > 0 && 'text-warning-text')}
                  >
                    {list.data.toCheck}
                  </span>
                ) : null}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {list.data ? (
            <p className="text-sm text-muted-foreground">
              {P.monthTotal(monthName(now), formatPeso(list.data.monthTotal))}
            </p>
          ) : null}
        </div>
        {body}
      </div>
      <ShopPanel
        shopId={search.shop}
        seed={undefined}
        tab={search.tab ?? 'billing'}
        onTab={(tab) => setSearch({ tab }, { replace: true })}
        onClose={() => setSearch({ shop: undefined, tab: undefined })}
      />
    </div>
  );
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** The rows on screen as a CSV for the books: pesos with 2 decimals, Manila dates. */
function saveCsv(rows: AdminPayment[], now: Date) {
  const lines = [
    P.csvHeader.map(csvCell).join(','),
    ...rows.map((p) =>
      [
        p.shopName,
        (p.amount / 100).toFixed(2),
        String(p.months),
        method(p),
        p.reference,
        formatManila(p.submittedAt, 'long'),
        P.status[p.status],
        p.status === 'approved' ? p.coversUntil : '',
        p.recorded ? 'yes' : '',
        p.note ?? '',
      ]
        .map(csvCell)
        .join(','),
    ),
  ];
  const { year, month, day } = manilaParts(now);
  const stamp = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const url = URL.createObjectURL(new Blob([`${lines.join('\n')}\n`], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = A.csvName(stamp);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
