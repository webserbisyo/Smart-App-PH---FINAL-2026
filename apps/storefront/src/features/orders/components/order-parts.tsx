'use client';

import Link from 'next/link';
import { ChevronRightIcon, RefreshCwIcon, StarIcon } from 'lucide-react';
import {
  formatManila,
  formatPeso,
  imageSources,
  words,
  type OrderRow,
  type ShopKind,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Spinner } from '@smartapp/ui/components/spinner';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { formatOrderNumber } from '../../receipt/receipt-rules';
import { statusChip } from '../../receipt/receipt-look';
import { nextStep } from '../orders-rules';

// Status = icon + word + colour (c-badge-14/15/17/22 looks through the receipt's chip map).
export function OrderStatusBadge({ row }: { row: OrderRow }) {
  const chip =
    row.paymentStatus === 'refunded'
      ? { ...statusChip(row.status), label: words.shop.paymentStatus.refunded }
      : statusChip(row.status);
  const Icon = chip.icon;
  return (
    <Badge variant={chip.tone} size="lg" radius="full" className="shrink-0 gap-1 px-2">
      <Icon aria-hidden="true" className="size-3" />
      {chip.label}
    </Badge>
  );
}

function Thumbs({ row, fallback }: { row: OrderRow; fallback: string }) {
  const photos = row.photos.length > 0 ? row.photos : [null];
  return (
    <span className="flex shrink-0 -space-x-3">
      {photos.map((photo, i) => (
        <ShopImage
          key={i}
          src={photo ? imageSources(photo) : null}
          alt=""
          ratio="1:1"
          sizes="48px"
          fallbackText={fallback}
          className="size-12 rounded-2xl ring-2 ring-card"
        />
      ))}
    </span>
  );
}

/** An order in progress (c-item-10 look): number, type, status, photos, the next step and the total. */
export function ActiveOrderCard({
  row,
  slug,
  kind,
  now,
}: {
  row: OrderRow;
  slug: string;
  kind: ShopKind;
  now: string | null;
}) {
  const orderNo = formatOrderNumber(row.orderNo);
  const step = nextStep(row, kind, now);
  return (
    <Link
      href={`/${slug}/o/${row.token}`}
      aria-label={words.orders.viewLabel(orderNo)}
      className="group flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-xs ring-1 ring-foreground/8 transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-lg font-bold tabular">
            {words.orders.orderLine(orderNo, words.shop.orderType[row.type])}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatManila(row.placedAt, 'datetime')}
          </span>
        </div>
        <OrderStatusBadge row={row} />
      </div>

      {step ? (
        <p className="rounded-2xl bg-shop-10-soft px-3.5 py-2.5 text-sm font-medium text-shop-10-soft-foreground">
          {step}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Thumbs row={row} fallback={row.summary} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm">{row.summary}</span>
          <span className="text-sm font-semibold tabular">{formatPeso(row.total)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-shop-10-text">
          {words.orders.view}
          <ChevronRightIcon
            aria-hidden="true"
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </span>
      </div>
    </Link>
  );
}

/** An ended order (c-item-4 look): date, number, items, total, status, stars or Rate, and Order again. */
export function PastOrderRow({
  row,
  slug,
  loading,
  onOrderAgain,
}: {
  row: OrderRow;
  slug: string;
  loading: boolean;
  onOrderAgain: () => void;
}) {
  const orderNo = formatOrderNumber(row.orderNo);
  const href = `/${slug}/o/${row.token}`;
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-1 last:pb-1">
      <Link
        href={href}
        aria-label={words.orders.viewLabel(orderNo)}
        className="flex min-h-11 items-center gap-3 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Thumbs row={row} fallback={row.summary} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm text-muted-foreground">
            {formatManila(row.placedAt, 'datetime')}
          </span>
          <span className="truncate font-semibold tabular">
            {orderNo} · {words.orders.items(row.itemCount)}
          </span>
          <span className="text-sm font-semibold tabular">{formatPeso(row.total)}</span>
        </span>
        <OrderStatusBadge row={row} />
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {row.ratingStars ? (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <StarIcon aria-hidden="true" className="size-4 fill-current text-warning-text" />
            {words.orders.rated(row.ratingStars)}
          </span>
        ) : row.status === 'completed' ? (
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href={`${href}#receipt-rating-section`} />}
            className="-ml-2 h-11 gap-1.5 rounded-full px-3 text-shop-10-text"
          >
            <StarIcon aria-hidden="true" className="size-4" />
            {words.orders.rate}
          </Button>
        ) : (
          <span />
        )}
        <Button
          variant="outline"
          onClick={onOrderAgain}
          disabled={loading}
          aria-label={words.orders.orderAgainLabel(orderNo)}
          className="h-11 gap-2 rounded-full px-4"
        >
          {loading ? <Spinner /> : <RefreshCwIcon aria-hidden="true" className="size-4" />}
          {words.orders.orderAgain}
        </Button>
      </div>
    </li>
  );
}
