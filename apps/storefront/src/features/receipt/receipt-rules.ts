// Pure rules for the receipt screen (T10): countdown, Messenger text, timeline steps, formatting.
import {
  timelineSteps,
  type OrderEvent,
  type OrderStatus,
  type OrderType,
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
  const count = Math.max(1, input.lineCount);
  const itemWord = count === 1 ? 'item' : 'items';
  return `Order ${num} · ${count} ${itemWord} · ${input.totalFormatted} · ${input.receiptUrl}`;
}

export function buildMessengerUrl(pageIdOrUsername: string, text: string): string {
  const cleanId = pageIdOrUsername.trim().replace(/^@/, '');
  return `https://m.me/${encodeURIComponent(cleanId)}?text=${encodeURIComponent(text)}`;
}

export interface ReceiptStepItem {
  readonly id: OrderStatus;
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

/**
 * Builds the timestamped stepper checkpoints for c-stepper-26.
 */
export function resolveReceiptSteps(
  type: OrderType,
  currentStatus: OrderStatus,
  events: readonly OrderEvent[],
  kind: ShopKind,
): readonly ReceiptStepItem[] {
  const steps = timelineSteps(type);
  const eventMap = new Map<OrderStatus, string>();
  for (const ev of events) {
    eventMap.set(ev.status, ev.at);
  }

  const currentIndex = steps.indexOf(currentStatus);

  return steps.map((stepStatus, idx) => {
    let state: 'completed' | 'current' | 'upcoming';
    if (currentIndex === -1) {
      state = 'upcoming';
    } else if (idx < currentIndex) {
      state = 'completed';
    } else if (idx === currentIndex) {
      state = 'current';
    } else {
      state = 'upcoming';
    }

    const timestampIso = eventMap.get(stepStatus);
    const timestamp = timestampIso ? formatManilaTime(timestampIso) : null;

    let label = 'Placed';
    if (stepStatus === 'placed') {
      label = 'Order placed';
    } else if (stepStatus === 'preparing') {
      label = kind === 'retail' ? 'Packing' : 'Kitchen';
    } else if (stepStatus === 'ready') {
      label = type === 'delivery' ? 'Ready for rider' : 'Ready for pickup';
    } else if (stepStatus === 'out_for_delivery') {
      label = 'Out for delivery';
    } else if (stepStatus === 'completed') {
      label = 'Completed';
    }

    return {
      id: stepStatus,
      label,
      timestamp,
      state,
    };
  });
}
