// Pure rules for the receipt screen (T10): countdown, Messenger text, timeline steps, formatting.
import {
  isTransfer,
  timelineSteps,
  vocab,
  words,
  type OrderEvent,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
  type PaymentStatus,
  type ShopKind,
} from '@smartapp/core';

export interface CountdownResult {
  readonly totalSecs: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly formatted: string;
  readonly isExpired: boolean;
  readonly shouldAnnounce: boolean;
  readonly progressPercent: number;
}

export const COUNTDOWN_TOTAL_SECS = 25 * 60; // 25 minutes default

export function formatOrderNumber(orderNo: number): string {
  return `#${String(Math.max(1, Math.floor(orderNo))).padStart(3, '0')}`;
}

/**
 * Calculates remaining pay-within countdown.
 * Announces via aria-live only at 10 minutes, 5 minutes, and 1 minute.
 */
export function formatCountdown(
  expiresAt: string | Date | null | undefined,
  now = new Date(),
): CountdownResult {
  if (!expiresAt) {
    return {
      totalSecs: 0,
      minutes: 0,
      seconds: 0,
      formatted: '00:00',
      isExpired: true,
      shouldAnnounce: false,
      progressPercent: 0,
    };
  }

  const expTime =
    typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt.getTime();
  const diffMs = expTime - now.getTime();
  const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
  const minutes = Math.floor(totalSecs / 60);
  const seconds = totalSecs % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpired = totalSecs <= 0;

  // Announce only at 10 min, 5 min, 1 min
  const shouldAnnounce = totalSecs === 600 || totalSecs === 300 || totalSecs === 60;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((totalSecs / COUNTDOWN_TOTAL_SECS) * 100)),
  );

  return {
    totalSecs,
    minutes,
    seconds,
    formatted,
    isExpired,
    shouldAnnounce,
    progressPercent,
  };
}

export interface MessengerOrderInput {
  readonly orderNo: number;
  readonly lineCount: number;
  readonly totalFormatted: string;
  readonly receiptUrl: string;
}

/**
 * Generates customer Messenger message text.
 * CRITICAL RULE (Prompt section 5 / Founder decision):
 * Must NEVER include customer address or phone number.
 */
export function buildMessengerOrderText(input: MessengerOrderInput): string {
  const num = formatOrderNumber(input.orderNo);
  const summary = words.checkout.itemsSummary(Math.max(1, input.lineCount), input.totalFormatted);
  return `${words.receipt.orderLabel} ${num} · ${summary} · ${input.receiptUrl}`;
}

export function buildMessengerUrl(pageIdOrUsername: string, text: string): string {
  const cleanId = pageIdOrUsername.trim().replace(/^@/, '');
  return `https://m.me/${encodeURIComponent(cleanId)}?text=${encodeURIComponent(text)}`;
}

export type ReceiptStepId = OrderStatus | 'paid';

export interface ReceiptStepItem {
  readonly id: ReceiptStepId;
  readonly label: string;
  readonly timestamp: string | null;
  readonly state: 'completed' | 'current' | 'upcoming';
}

/** Formats an ISO date into Manila time (e.g. "3:42 PM") */
export function formatManilaTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila',
    }).format(d);
  } catch {
    return '';
  }
}

/** Formats an ISO date into Manila date + time (e.g. "Oct 25, 3:42 PM") */
export function formatManilaDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila',
    }).format(d);
  } catch {
    return '';
  }
}

export function isOrderCancelled(status: OrderStatus): boolean {
  return status === 'cancelled' || status === 'expired';
}

export interface ReceiptStepOrder {
  readonly type: OrderType;
  readonly status: OrderStatus;
  readonly events: readonly OrderEvent[];
  readonly paymentMethod: PaymentMethod;
  readonly paymentStatus: PaymentStatus;
}

function stepLabel(id: ReceiptStepId, type: OrderType, kind: ShopKind): string {
  switch (id) {
    case 'placed':
      return words.receipt.steps.placed;
    case 'paid':
      return words.receipt.steps.paid;
    case 'preparing':
      return vocab(kind).prepStep;
    case 'ready':
      return words.receipt.hero.ready[type];
    case 'out_for_delivery':
      return words.receipt.steps.outForDelivery;
    default:
      return words.receipt.steps.completed;
  }
}

/**
 * The status track (c-stepper-26): placed, payment checked (transfers only), preparing, ready,
 * out for delivery (delivery only), completed, each with its Manila time when it happened.
 */
export function resolveReceiptSteps(
  order: ReceiptStepOrder,
  kind: ShopKind,
): readonly ReceiptStepItem[] {
  const statuses = timelineSteps(order.type);
  const transfer = isTransfer(order.paymentMethod);
  const ids: ReceiptStepId[] = transfer
    ? [statuses[0] ?? 'placed', 'paid', ...statuses.slice(1)]
    : statuses;
  const times = new Map<ReceiptStepId, string>();
  for (const event of order.events) times.set(event.status, event.at);

  // A placed transfer waits on the payment step, then on the shop starting it.
  const currentId: ReceiptStepId =
    transfer && order.status === 'placed'
      ? order.paymentStatus === 'paid'
        ? 'preparing'
        : 'paid'
      : order.status;
  const currentIndex = ids.indexOf(currentId);

  return ids.map((id, idx) => {
    const done =
      currentIndex !== -1 && (idx < currentIndex || (idx === currentIndex && id === 'completed'));
    const state = done ? 'completed' : idx === currentIndex ? 'current' : 'upcoming';
    const at = times.get(id);
    return {
      id,
      label: stepLabel(id, order.type, kind),
      timestamp: at ? formatManilaTime(at) : null,
      state,
    };
  });
}
