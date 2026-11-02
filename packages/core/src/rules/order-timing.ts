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
      dueAt: input.scheduledAt,
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

  const minutesToStart = nowMs < startByMs ? Math.max(0, Math.round((startByMs - nowMs) / MS_PER_MINUTE)) : 0;
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
