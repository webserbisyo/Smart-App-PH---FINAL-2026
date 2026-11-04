import * as React from 'react';
import { LockIcon, MessageSquareTextIcon, ShieldAlertIcon } from 'lucide-react';
import type { BoardOrder, OrderStatus, ShopKind } from '@smartapp/core';
import {
  awaitsTransfer,
  canAdvance,
  formatPeso,
  isPayLater,
  nextStatus,
  ordersWords,
  payCountdown,
  statusStage,
  words,
} from '@smartapp/core';
import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { AvatarGroup } from '@smartapp/ui/components/avatar-group';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Button } from '@smartapp/ui/components/button';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { initials } from '@smartapp/ui/compositions/shop-image';
import { cn } from 'cn';
import { orderNoLabel } from './order-ticket-label.js';
import { orderPhotoSrc } from './order-photo.js';
import { ORDER_TYPE_ICON } from './order-type-icons.js';
import { StageIcon } from './stage-icon.js';
import { STAGE_LOOK } from './stage.js';
import { stepLabels } from './step-labels.js';
import { TimeChip } from './time-chip.js';

export { orderNoLabel };

const LINE_CAP = 3;

/** What the card's one button does: move a step, take the cash and finish, or open the payment check. */
export type CardAction =
  | { kind: 'advance'; to: OrderStatus }
  | { kind: 'pay_and_complete' }
  | { kind: 'check_payment' }
  | { kind: 'none' };

export function cardAction(order: BoardOrder): CardAction {
  if (order.status === 'placed' && awaitsTransfer(order)) return { kind: 'check_payment' };
  const next = nextStatus(order);
  if (!next) return { kind: 'none' };
  const check = canAdvance(order, next);
  if (check.ok) return { kind: 'advance', to: next };
  if (next === 'completed' && isPayLater(order.paymentMethod)) return { kind: 'pay_and_complete' };
  return { kind: 'none' };
}

/** The payment chip: method + state, icon + word + colour. */
export type PaymentChipOrder = Pick<
  BoardOrder,
  'status' | 'paymentStatus' | 'paymentMethod' | 'expiresAt'
>;

// Long payment words shrink with an ellipsis instead of pushing out of a narrow card.
const CHIP_FIT = 'max-w-full min-w-0';

export function PaymentChip({ order, now }: { order: PaymentChipOrder; now: Date }) {
  const method = words.shop.paymentMethod[order.paymentMethod];
  if (order.paymentStatus === 'paid') {
    return (
      <Badge
        variant="success-light"
        size="lg"
        radius="full"
        className={cn(CHIP_FIT, 'font-semibold')}
      >
        <span className="truncate">
          {method} · {words.shop.paymentStatus.paid}
        </span>
      </Badge>
    );
  }
  if (order.paymentStatus === 'pending') {
    return (
      <Badge
        variant="warning-light"
        size="lg"
        radius="full"
        className={cn(CHIP_FIT, 'gap-1 font-semibold')}
      >
        <ShieldAlertIcon aria-hidden="true" />
        <span className="truncate">
          {method} · {words.shop.paymentStatus.pending}
        </span>
      </Badge>
    );
  }
  if (order.paymentStatus === 'refunded') {
    return (
      <Badge variant="outline" size="lg" radius="full" className="text-muted-foreground">
        {words.shop.paymentStatus.refunded}
      </Badge>
    );
  }
  // The countdown only while the order can still be paid; an expired or cancelled transfer just says Unpaid.
  if (awaitsTransfer(order) && order.status !== 'placed') {
    return (
      <Badge
        variant="outline"
        size="lg"
        radius="full"
        className={cn(CHIP_FIT, 'text-muted-foreground')}
      >
        <span className="truncate">
          {method} · {words.shop.paymentStatus.unpaid}
        </span>
      </Badge>
    );
  }
  if (awaitsTransfer(order) && order.expiresAt) {
    const left = payCountdown(order.expiresAt, now);
    return (
      <Badge
        variant="outline"
        size="lg"
        radius="full"
        className={cn(CHIP_FIT, 'font-semibold text-muted-foreground tabular-nums')}
      >
        <span className="truncate">
          {method} · {ordersWords.detail.payWindow(left.label)}
        </span>
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      size="lg"
      radius="full"
      className={cn(CHIP_FIT, 'text-muted-foreground')}
    >
      <span className="truncate">{ordersWords.detail.payLater(method)}</span>
    </Badge>
  );
}

/** Up to 3 item photos, then "+N" (installed Avatar Group). Items with no photo show their initials. */
export function ItemPhotos({ order, size = 'sm' }: { order: BoardOrder; size?: 'sm' | 'default' }) {
  if (order.lines.length === 0) return null;
  const px = size === 'sm' ? 24 : 32;
  return (
    <AvatarGroup
      size={px}
      max={4}
      aria-label={ordersWords.ticket.photosAria(order.lines.length + order.moreLines)}
      role="img"
    >
      {order.lines.map((line, index) => {
        const src = orderPhotoSrc(line.photo, 96);
        return (
          <Avatar key={index} size={size} className="ring-2 ring-card">
            {src ? <AvatarImage src={src} alt="" /> : null}
            <AvatarFallback className="font-semibold">{initials(line.name)}</AvatarFallback>
          </Avatar>
        );
      })}
    </AvatarGroup>
  );
}

/** Member with stamps (mint) or First order (blue); nothing for a returning guest. */
export function CustomerChip({
  order,
  className,
}: {
  order: Pick<BoardOrder, 'memberStamps' | 'isFirstOrder'>;
  className?: string | undefined;
}) {
  if (order.memberStamps) {
    const { have, goal } = order.memberStamps;
    return (
      <Badge
        variant="outline"
        size="lg"
        radius="full"
        className={cn(
          'shrink-0 border-transparent bg-member-soft font-semibold text-member-soft-foreground tabular-nums',
          className,
        )}
        aria-label={ordersWords.ticket.memberAria(have, goal)}
      >
        {ordersWords.ticket.member} {ordersWords.ticket.memberStamps(have, goal)}
      </Badge>
    );
  }
  if (order.isFirstOrder) {
    return (
      <Badge
        variant="info-light"
        size="lg"
        radius="full"
        className={cn('shrink-0 font-semibold', className)}
      >
        {ordersWords.ticket.firstOrder}
      </Badge>
    );
  }
  return null;
}

export interface OrderCardProps {
  order: BoardOrder;
  now: Date;
  kind: ShopKind;
  onOpen: (order: BoardOrder) => void;
  onAdvance: (order: BoardOrder, to: OrderStatus) => Promise<void>;
  onPayAndComplete: (order: BoardOrder) => Promise<void>;
  disabled?: boolean | undefined;
  // A new order that just arrived: a soft ring for 2 seconds (D12).
  fresh?: boolean | undefined;
  className?: string | undefined;
}

function OrderCardView({
  order,
  now,
  kind,
  onOpen,
  onAdvance,
  onPayAndComplete,
  disabled = false,
  fresh = false,
  className,
}: OrderCardProps) {
  const TypeIcon = ORDER_TYPE_ICON[order.type];
  const action = cardAction(order);
  const step = useAsyncAction();
  const visibleLines = order.lines.slice(0, LINE_CAP);
  const more = order.lines.length - visibleLines.length + order.moreLines;
  const locked = action.kind === 'check_payment';
  const stage = statusStage(order.status) ?? 'new';
  const no = orderNoLabel(order.orderNo);

  let button: React.ReactNode = null;
  if (action.kind === 'check_payment') {
    button = (
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => onOpen(order)}
        className="h-11 w-full gap-1.5 font-semibold"
      >
        <LockIcon aria-hidden="true" />
        {ordersWords.buttons.checkPayment}
      </Button>
    );
  } else if (action.kind === 'advance') {
    const to = action.to;
    const toStage = statusStage(to) ?? 'done';
    const look = STAGE_LOOK[toStage];
    const labels = stepLabels(to, order.type, kind);
    button = (
      <AsyncButton
        type="button"
        variant="secondary"
        status={step.status}
        busyLabel={labels.busy}
        doneLabel={labels.done}
        disabled={disabled}
        onClick={() => {
          step.run(() => onAdvance(order, to)).catch(() => undefined);
        }}
        className={cn('h-11 w-full gap-1.5 font-semibold', look.button)}
      >
        <StageIcon stage={toStage} kind={kind} />
        {labels.idle}
      </AsyncButton>
    );
  } else if (action.kind === 'pay_and_complete') {
    const look = STAGE_LOOK.done;
    button = (
      <AsyncButton
        type="button"
        variant="secondary"
        status={step.status}
        busyLabel={ordersWords.buttons.completing}
        doneLabel={ordersWords.buttons.completed}
        disabled={disabled}
        onClick={() => {
          step.run(() => onPayAndComplete(order)).catch(() => undefined);
        }}
        className={cn('h-11 w-full gap-1.5 font-semibold', look.button)}
      >
        <StageIcon stage="done" kind={kind} />
        {ordersWords.buttons.paidAndDone}
      </AsyncButton>
    );
  }

  return (
    <div
      data-slot="order-card"
      data-order-id={order.id}
      data-stage={stage}
      className={cn(
        'group/order relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs transition-shadow duration-base hover:shadow-md',
        fresh && cn('ring-2 ring-offset-2 ring-offset-background', STAGE_LOOK.new.ring),
        className,
      )}
    >
      {/* The whole card opens the order; the step button sits on top of it. */}
      <button
        type="button"
        onClick={() => onOpen(order)}
        aria-label={ordersWords.ticket.open(no, order.customerName)}
        className="absolute inset-0 z-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />

      <div className="pointer-events-none relative z-10 flex flex-col gap-2.5 p-3">
        {/* Number, type, time: the time chip drops under the number when the card is narrow. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {order.seenAt === null ? (
            <span
              className="size-2 shrink-0 rounded-full bg-primary"
              role="img"
              aria-label={ordersWords.ticket.newOrderAria}
            />
          ) : null}
          <span className="text-base font-bold tabular-nums">{no}</span>
          <span className="inline-flex min-w-0 items-center gap-1 text-xs font-medium text-muted-foreground">
            <TypeIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{ordersWords.types[order.type]}</span>
          </span>
          {locked ? (
            <LockIcon
              className="size-3.5 shrink-0 text-muted-foreground"
              role="img"
              aria-label={ordersWords.ticket.lockedAria}
            />
          ) : null}
          <TimeChip order={order} now={now} className="ml-auto shrink-0" />
        </div>

        {/* Customer: the name wins; the member chip wraps under it on a narrow card. */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Avatar size="sm" className="shrink-0">
            <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
              {initials(order.customerName)}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-full min-w-0 flex-1 basis-24 truncate text-sm font-semibold">
            {order.customerName}
          </span>
          <CustomerChip order={order} />
        </div>

        {/* Lines */}
        <ul className="space-y-1 text-sm">
          {visibleLines.map((line, index) => (
            <li key={index} className="flex min-w-0 gap-1.5">
              <span className="w-7 shrink-0 font-semibold tabular-nums">{line.qty}×</span>
              <span className="min-w-0">
                <span className="line-clamp-1 font-medium break-words">{line.name}</span>
                {line.variantLabel || line.optionLabels.length > 0 ? (
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {[line.variantLabel, ...line.optionLabels].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
          {more > 0 ? (
            <li className="pl-8 text-xs font-medium text-muted-foreground">
              {ordersWords.ticket.moreLines(more)}
            </li>
          ) : null}
        </ul>

        {order.note ? (
          <p className="flex items-start gap-1.5 rounded-lg bg-warning-soft px-2 py-1.5 text-xs text-warning-soft-foreground">
            <MessageSquareTextIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2 break-words">{order.note}</span>
          </p>
        ) : null}

        {/* Photos, payment, total */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <ItemPhotos order={order} />
          <PaymentChip order={order} now={now} />
          <span className="ml-auto shrink-0 text-base font-bold whitespace-nowrap tabular-nums">
            {formatPeso(order.total)}
          </span>
        </div>
      </div>

      {button ? <div className="relative z-10 px-3 pb-3">{button}</div> : null}
    </div>
  );
}

export const OrderCard = React.memo(OrderCardView);
