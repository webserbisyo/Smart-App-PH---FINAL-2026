import type { AgeTone, OrderStatus, OrderTimingPhase } from '../schemas/enums.js';
import { isFinal } from './order-rules.js';

const TWO_HOURS_MS = 2 * 60 * 60_000;
const TEN_MINUTES_MS = 10 * 60_000;
const FIFTEEN_MINUTES_MS = 15 * 60_000;
const TWENTY_MINUTES_MS = 20 * 60_000;
const MS_PER_MINUTE = 60_000;

export interface DueTimesInput {
  placedAt: string;
  scheduledAt: string | null;
  prepMinutes: number;
}

export interface DueTimes {
  dueAt: string;
  startBy: string;
}

/** Computes dueAt and startBy from placed time, scheduled time and shop prep minutes. */
export function dueTimes(input: DueTimesInput): DueTimes {
  const prepMs = input.prepMinutes * MS_PER_MINUTE;
  if (input.scheduledAt) {
    const dueMs = new Date(input.scheduledAt).getTime();
    return {
      dueAt: new Date(dueMs).toISOString(),
      startBy: new Date(dueMs - prepMs).toISOString(),
    };
  }
  const placedMs = new Date(input.placedAt).getTime();
  return {
    dueAt: new Date(placedMs + prepMs).toISOString(),
    startBy: input.placedAt,
  };
}

export interface OrderTimingInput {
  status: OrderStatus;
  dueAt: string;
  startBy: string;
}

export interface OrderTiming {
  phase: OrderTimingPhase;
  minutesToStart: number;
  lateMinutes: number;
  ageTone: AgeTone;
}

/**
 * Evaluates timing phase, minutes to start, late minutes, and age tone.
 * Age counts from startBy (not placedAt).
 */
export function orderTiming(order: OrderTimingInput, now: string | Date): OrderTiming {
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  const startByMs = new Date(order.startBy).getTime();
  const dueAtMs = new Date(order.dueAt).getTime();

  if (isFinal(order.status)) {
    return {
      phase: 'done',
      minutesToStart: 0,
      lateMinutes: 0,
      ageTone: 'calm',
    };
  }

  let phase: OrderTimingPhase;
  if (order.status === 'placed') {
    if (nowMs < startByMs - TWO_HOURS_MS) {
      phase = 'scheduled';
    } else if (nowMs < startByMs) {
      phase = 'upcoming';
    } else {
      phase = 'active';
    }
  } else {
    phase = 'active';
  }

  const minutesToStart =
    nowMs < startByMs ? Math.max(0, Math.round((startByMs - nowMs) / MS_PER_MINUTE)) : 0;
  const lateMinutes = Math.max(0, Math.floor((nowMs - dueAtMs) / MS_PER_MINUTE));

  let ageTone: AgeTone = 'calm';
  if (order.status === 'ready') {
    // Ready orders go amber 15 minutes after dueAt if not handed over
    if (nowMs >= dueAtMs + FIFTEEN_MINUTES_MS) {
      ageTone = 'amber';
    }
  } else {
    // Placed, preparing, out: age counts from startBy
    const ageFromStartMs = nowMs - startByMs;
    if (ageFromStartMs >= TWENTY_MINUTES_MS) {
      ageTone = 'red';
    } else if (ageFromStartMs >= TEN_MINUTES_MS) {
      ageTone = 'amber';
    }
  }

  return {
    phase,
    minutesToStart,
    lateMinutes,
    ageTone,
  };
}

export const SOON_MINUTES = 5;

export type TicketTimeKind = 'due' | 'soon' | 'late' | 'waiting' | 'out' | 'none';

export interface TicketTime {
  kind: TicketTimeKind;
  // Minutes left (soon), late, waiting or out; 0 for due and none.
  minutes: number;
}

/**
 * The time chip on a ticket (Orders v2, D10). New and Preparing count down to the due time: "Due 2:33",
 * then "4 min left" in the last 5 minutes, then "Late 4 min". Ready counts how long it has waited and Out
 * how long the rider has been gone, both calm. Finished orders show none.
 */
export function ticketTime(
  order: { status: OrderStatus; dueAt: string; lastStepAt: string },
  now: string | Date,
): TicketTime {
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  switch (order.status) {
    case 'placed':
    case 'preparing': {
      const msLeft = new Date(order.dueAt).getTime() - nowMs;
      if (msLeft < 0) {
        return { kind: 'late', minutes: Math.max(1, Math.floor(-msLeft / MS_PER_MINUTE)) };
      }
      if (msLeft <= SOON_MINUTES * MS_PER_MINUTE) {
        return { kind: 'soon', minutes: Math.max(1, Math.ceil(msLeft / MS_PER_MINUTE)) };
      }
      return { kind: 'due', minutes: 0 };
    }
    case 'ready':
    case 'out_for_delivery': {
      const since = Math.max(
        0,
        Math.floor((nowMs - new Date(order.lastStepAt).getTime()) / MS_PER_MINUTE),
      );
      return { kind: order.status === 'ready' ? 'waiting' : 'out', minutes: since };
    }
    default:
      return { kind: 'none', minutes: 0 };
  }
}
