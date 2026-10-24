// Order steps in one place. Screens never compare statuses themselves (foundation section 4).
import type { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '../schemas/enums.js';
import { TRANSFER_METHODS } from '../schemas/enums.js';

export const TONES = ['info', 'warning', 'success', 'destructive', 'muted'] as const;
export type Tone = (typeof TONES)[number];

// Lucide icon names; apps map them to components.
export const STATUS_TONE: Readonly<Record<OrderStatus, { tone: Tone; icon: string }>> = {
  placed: { tone: 'info', icon: 'bell' },
  preparing: { tone: 'warning', icon: 'chef-hat' },
  ready: { tone: 'success', icon: 'check' },
  out_for_delivery: { tone: 'info', icon: 'bike' },
  completed: { tone: 'success', icon: 'check' },
  cancelled: { tone: 'destructive', icon: 'x-circle' },
  expired: { tone: 'muted', icon: 'clock' },
};

export const PAYMENT_TONE: Readonly<Record<PaymentStatus, { tone: Tone; icon: string }>> = {
  unpaid: { tone: 'muted', icon: 'wallet' },
  pending: { tone: 'warning', icon: 'hourglass' },
  paid: { tone: 'success', icon: 'circle-check' },
  refunded: { tone: 'muted', icon: 'undo-2' },
};

export function statusTone(status: OrderStatus): { tone: Tone; icon: string } {
  return STATUS_TONE[status];
}

/** The status track the customer sees for an order type. */
export function timelineSteps(type: OrderType): OrderStatus[] {
  return type === 'delivery'
    ? ['placed', 'preparing', 'ready', 'out_for_delivery', 'completed']
    : ['placed', 'preparing', 'ready', 'completed'];
}

export function isFinal(status: OrderStatus): boolean {
  return status === 'completed' || status === 'cancelled' || status === 'expired';
}

export function canCancel(status: OrderStatus): boolean {
  return (
    status === 'placed' ||
    status === 'preparing' ||
    status === 'ready' ||
    status === 'out_for_delivery'
  );
}

export function isTransfer(method: PaymentMethod): boolean {
  return TRANSFER_METHODS.some((m) => m === method);
}

/** Cash and COD are paid later; transfers must be paid before the shop starts. */
export function isPayLater(method: PaymentMethod): boolean {
  return !isTransfer(method);
}

export interface OrderStepInput {
  status: OrderStatus;
  type: OrderType;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
}

/** The one next step forward, or null at the end. */
export function nextStatus(order: Pick<OrderStepInput, 'status' | 'type'>): OrderStatus | null {
  const steps = timelineSteps(order.type);
  const index = steps.indexOf(order.status);
  return index >= 0 && index < steps.length - 1 ? (steps[index + 1] ?? null) : null;
}

export type AdvanceCheck = { ok: true } | { ok: false; code: 'invalid_transition' | 'not_paid' };

/** Steps only move forward, one at a time. Starting a transfer order needs it paid; completing needs paid. */
export function canAdvance(order: OrderStepInput, to: OrderStatus): AdvanceCheck {
  if (nextStatus(order) !== to) return { ok: false, code: 'invalid_transition' };
  const paid = order.paymentStatus === 'paid';
  if (to === 'preparing' && !paid && !isPayLater(order.paymentMethod))
    return { ok: false, code: 'not_paid' };
  if (to === 'completed' && !paid) return { ok: false, code: 'not_paid' };
  return { ok: true };
}

/** Next-step buttons for the owner (one at most in A). */
export function nextActions(order: OrderStepInput): OrderStatus[] {
  const next = nextStatus(order);
  return next && canAdvance(order, next).ok ? [next] : [];
}

export const BOARD_COLUMNS = ['scheduled', 'new', 'preparing', 'ready', 'out', 'done'] as const;
export type BoardColumn = (typeof BOARD_COLUMNS)[number];

const SCHEDULED_AHEAD_MS = 30 * 60_000;

/** Board column; a placed order more than 30 minutes ahead sits in Scheduled (not a status). */
export function boardColumn(
  order: { status: OrderStatus; scheduledAt: string | null },
  now: string | Date,
): BoardColumn | null {
  switch (order.status) {
    case 'placed': {
      const t = (now instanceof Date ? now : new Date(now)).getTime();
      const ahead = order.scheduledAt ? new Date(order.scheduledAt).getTime() - t : 0;
      return ahead > SCHEDULED_AHEAD_MS ? 'scheduled' : 'new';
    }
    case 'preparing':
      return 'preparing';
    case 'ready':
      return 'ready';
    case 'out_for_delivery':
      return 'out';
    case 'completed':
      return 'done';
    default:
      return null;
  }
}

export const PAY_WINDOW_MINUTES = 30;

export interface PayCountdown {
  secondsLeft: number;
  expired: boolean;
  // "25:00"
  label: string;
  // 1 at the start of the window, 0 at the end.
  fraction: number;
}

export function payCountdown(
  expiresAt: string,
  now: string | Date,
  windowMinutes = PAY_WINDOW_MINUTES,
): PayCountdown {
  const t = (now instanceof Date ? now : new Date(now)).getTime();
  const secondsLeft = Math.max(0, Math.floor((new Date(expiresAt).getTime() - t) / 1000));
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return {
    secondsLeft,
    expired: secondsLeft === 0,
    label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    fraction: Math.min(1, secondsLeft / (windowMinutes * 60)),
  };
}
